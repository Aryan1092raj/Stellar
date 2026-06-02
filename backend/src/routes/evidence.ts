import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { requireVerifiedNGO, VerifiedNGORequest } from '../middleware/verifyNGO';
import { buildEvidenceTx, verifyTxOnChain } from '../lib/stellar';
import { checkIPFSHealth, toIPFSUrl, uploadFileToIPFS } from '../services/ipfs.service';

const router = Router();
const useMock = !process.env.DATABASE_URL;

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF allowed.'));
    }
  },
});

function cleanupTempFile(filePath?: string) {
  if (filePath) {
    fs.rm(filePath, { force: true }, () => undefined);
  }
}

function parseDonationId(req: Request) {
  const value = req.body?.donation_id || req.body?.donationId;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function requireVerifiedNGOAfterUpload(req: Request, res: Response, next: NextFunction) {
  await requireVerifiedNGO(req, res, (err?: unknown) => {
    if (err) return next(err);
    return next();
  });

  if (res.headersSent) {
    cleanupTempFile(req.file?.path);
  }
}

router.post(
  '/prepare',
  requireAuth,
  requireRole('ngo'),
  upload.single('file'),
  requireVerifiedNGOAfterUpload,
  async (req: VerifiedNGORequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const donationId = parseDonationId(req);
      if (!donationId) {
        cleanupTempFile(req.file.path);
        return res.status(400).json({ error: 'donation_id is required' });
      }

      if (useMock) {
        const ipfsCid = await uploadFileToIPFS(req.file.path, req.file.originalname);
        cleanupTempFile(req.file.path);
        return res.status(200).json({
          ipfsCid,
          cid: ipfsCid,
          xdr: null,
          ipfsUrl: toIPFSUrl(ipfsCid),
          timestamp: new Date().toISOString(),
        });
      }

      const donation = await prisma.donation.findUnique({ where: { id: donationId } });
      if (!donation) {
        cleanupTempFile(req.file.path);
        return res.status(404).json({ error: 'not-found' });
      }
      if (req.verifiedNGOId !== donation.ngo_id) {
        cleanupTempFile(req.file.path);
        return res.status(403).json({ error: 'NGO mismatch for donation' });
      }

      const ipfsCid = await uploadFileToIPFS(req.file.path, req.file.originalname);
      cleanupTempFile(req.file.path);

      const projectId = donation.project_id ?? donation.id;
      const ngoAddress = req.verifiedNGOWallet;
      if (!ngoAddress) return res.status(403).json({ error: 'NGO wallet missing' });

      const xdr = await buildEvidenceTx({ projectId, ipfsCid, ngoAddress });
      const ipfsUrl = toIPFSUrl(ipfsCid);

      return res.status(200).json({
        ipfsCid,
        cid: ipfsCid,
        xdr,
        ipfsUrl,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      cleanupTempFile(req.file?.path);
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

router.post('/confirm', requireAuth, requireRole('ngo'), requireVerifiedNGO, async (req: VerifiedNGORequest, res: Response) => {
  try {
    const donationId = parseDonationId(req);
    const ipfsCid = req.body?.ipfsCid || req.body?.evidence_cid || req.body?.cid;
    const txHash = req.body?.txHash;

    if (!donationId || typeof ipfsCid !== 'string' || typeof txHash !== 'string') {
      return res.status(400).json({ error: 'invalid-request' });
    }

    const confirmed = await verifyTxOnChain(txHash);
    if (!confirmed) {
      return res.status(400).json({ error: 'Transaction not confirmed on-chain' });
    }

    if (useMock) {
      return res.json({ ok: true, txHash });
    }

    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) return res.status(404).json({ error: 'not-found' });
    if (req.verifiedNGOId !== donation.ngo_id) return res.status(403).json({ error: 'NGO mismatch for donation' });

    const ipfsUrl = toIPFSUrl(ipfsCid);
    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        evidence_url: ipfsUrl,
        evidence_cid: ipfsCid,
        evidence_tx: txHash,
      },
    });

    return res.json({ ok: true, ipfsCid, txHash, ipfsUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

router.post('/upload', requireAuth, requireRole('ngo'), (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Evidence upload moved to /api/evidence/prepare and /api/evidence/confirm' });
});

router.get('/retrieve/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    if (!cid || cid.length < 40) {
      return res.status(400).json({ error: 'Invalid CID format' });
    }

    return res.status(200).json({
      cid,
      gateways: [toIPFSUrl(cid), `https://ipfs.io/ipfs/${cid}`, `https://cloudflare-ipfs.com/ipfs/${cid}`],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  try {
    await checkIPFSHealth();
    return res.status(200).json({
      service: 'IPFS Evidence Upload',
      pinata: {
        configured: true,
        status: 'connected',
      },
      maxFileSize: '10MB',
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
