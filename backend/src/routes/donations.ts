import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { requireVerifiedNGO, VerifiedNGORequest } from '../middleware/verifyNGO';
import { buildVerifyImpactTx, verifyTxOnChain } from '../lib/stellar';

const useMock = !process.env.DATABASE_URL;

export type DonationRecord = {
  id: number;
  donor_public_key: string;
  amount: number;
  ngo_id?: number;
  ngo_wallet?: string;
  project_id?: number | null;
  donor_lat?: number | null;
  donor_lng?: number | null;
  recipient_lat?: number | null;
  recipient_lng?: number | null;
  status: string;
  created_at: string | Date;
  chain_create_tx: string | null;
  chain_verify_tx?: string | null;
  evidence_url?: string | null;
  evidence_cid?: string | null;
  evidence_tx?: string | null;
  tx_confirmed?: boolean;
  message?: string | null;
};

const mockStore: DonationRecord[] = [];
export const mockDonationsRef = mockStore;

const router = Router();

const DonationSchema = z.object({
  donor_public_key: z.string(),
  amount: z.number().positive(),
  ngo_id: z.number().int(),
  project_id: z.number().int().optional(),
  donor_location: z.object({ lat: z.number(), lng: z.number() }),
  chain_create_tx: z.string().optional(),
});

const ConfirmDonationSchema = DonationSchema.omit({ chain_create_tx: true }).extend({
  txHash: z.string().regex(/^[0-9a-fA-F]{64}$/, 'invalid-transaction-hash'),
});

const ConfirmVerifySchema = z.object({
  txHash: z.string().regex(/^[0-9a-fA-F]{64}$/, 'invalid-transaction-hash'),
});

function parseDonationId(req: Request) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function extractCidFromUrl(url?: string | null) {
  if (!url) return null;
  const match = url.match(/\/ipfs\/([^/?#]+)/);
  return match?.[1] || null;
}

router.post('/', requireAuth, requireRole('donor'), async (req: Request, res: Response) => {
  try {
    const parsed = DonationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid-request' });
    }

    const { donor_public_key, amount, ngo_id, project_id, donor_location } = parsed.data;

    const created = useMock
      ? {
          id: mockStore.length + 1,
          donor_public_key,
          amount,
          ngo_id,
          project_id: project_id ?? null,
          donor_lat: donor_location.lat,
          donor_lng: donor_location.lng,
          status: 'pending',
          created_at: new Date().toISOString(),
          chain_create_tx: parsed.data.chain_create_tx ?? null,
          chain_verify_tx: null,
          evidence_cid: null,
          evidence_tx: null,
          tx_confirmed: Boolean(parsed.data.chain_create_tx),
        }
      : await prisma.donation.create({
          data: {
            donor_public_key,
            amount,
            ngo_id,
            project_id: project_id ?? null,
            donor_lat: donor_location.lat,
            donor_lng: donor_location.lng,
            status: 'pending',
            chain_create_tx: parsed.data.chain_create_tx ?? null,
            tx_confirmed: Boolean(parsed.data.chain_create_tx),
          },
        });

    if (useMock) mockStore.push(created);
    return res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

router.post('/confirm', requireAuth, requireRole('donor'), async (req: Request, res: Response) => {
  try {
    const parsed = ConfirmDonationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid-request' });
    }

    const { donor_public_key, amount, ngo_id, project_id, donor_location, txHash } = parsed.data;

    if (useMock) {
      const existing = mockStore.find((donation) => donation.chain_create_tx === txHash);
      if (existing) return res.json(existing);

      const created = {
        id: mockStore.length + 1,
        donor_public_key,
        amount,
        ngo_id,
        project_id: project_id ?? null,
        donor_lat: donor_location.lat,
        donor_lng: donor_location.lng,
        status: 'on_chain',
        created_at: new Date().toISOString(),
        chain_create_tx: txHash,
        chain_verify_tx: null,
        evidence_cid: null,
        evidence_tx: null,
        tx_confirmed: true,
      };
      mockStore.push(created);
      return res.status(201).json(created);
    }

    const existing = await prisma.donation.findFirst({
      where: { chain_create_tx: txHash },
    });
    if (existing) return res.json(existing);

    const created = await prisma.donation.create({
      data: {
        donor_public_key,
        amount,
        ngo_id,
        project_id: project_id ?? null,
        donor_lat: donor_location.lat,
        donor_lng: donor_location.lng,
        status: 'on_chain',
        chain_create_tx: txHash,
        tx_confirmed: true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

router.post(
  '/:id/verify/prepare',
  requireAuth,
  requireRole('ngo'),
  requireVerifiedNGO,
  async (req: VerifiedNGORequest, res: Response) => {
    try {
      const id = parseDonationId(req);
      if (!id) return res.status(400).json({ error: 'invalid-donation-id' });

      if (useMock) {
        const donation = mockStore.find((record) => record.id === id);
        if (!donation) return res.status(404).json({ error: 'not-found' });
        return res.json({ xdr: null, evidenceCid: donation.evidence_cid || extractCidFromUrl(donation.evidence_url) });
      }

      const donation = await prisma.donation.findUnique({ where: { id } });
      if (!donation) return res.status(404).json({ error: 'not-found' });
      if (req.verifiedNGOId !== donation.ngo_id) return res.status(403).json({ error: 'NGO mismatch for donation' });
      if (donation.status === 'verified') return res.status(400).json({ error: 'Already verified' });

      const evidenceCid = donation.evidence_cid || extractCidFromUrl(donation.evidence_url);
      if (!evidenceCid) return res.status(400).json({ error: 'evidence-required' });

      const ngoAddress = req.verifiedNGOWallet;
      if (!ngoAddress) return res.status(403).json({ error: 'NGO wallet missing' });

      const xdr = await buildVerifyImpactTx({ donationId: id, ngoAddress, ipfsCid: evidenceCid });

      return res.json({ xdr, evidenceCid });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

router.post(
  '/:id/verify/confirm',
  requireAuth,
  requireRole('ngo'),
  requireVerifiedNGO,
  async (req: VerifiedNGORequest, res: Response) => {
    try {
      const id = parseDonationId(req);
      if (!id) return res.status(400).json({ error: 'invalid-donation-id' });

      const parsed = ConfirmVerifySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid-request' });

      const confirmed = await verifyTxOnChain(parsed.data.txHash);
      if (!confirmed) {
        return res.status(400).json({ error: 'Transaction not confirmed on-chain' });
      }

      if (useMock) {
        const donation = mockStore.find((record) => record.id === id);
        if (!donation) return res.status(404).json({ error: 'not-found' });
        donation.status = 'verified';
        donation.chain_verify_tx = parsed.data.txHash;
        return res.json({ ok: true, txHash: parsed.data.txHash, status: 'verified' });
      }

      const donation = await prisma.donation.findUnique({ where: { id } });
      if (!donation) return res.status(404).json({ error: 'not-found' });
      if (req.verifiedNGOId !== donation.ngo_id) return res.status(403).json({ error: 'NGO mismatch for donation' });

      await prisma.donation.update({
        where: { id },
        data: {
          status: 'verified',
          chain_verify_tx: parsed.data.txHash,
        },
      });

      return res.json({ ok: true, txHash: parsed.data.txHash, status: 'verified' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

router.post('/:id/verify', requireAuth, requireRole('ngo'), (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Impact verification moved to /api/donations/:id/verify/prepare and /api/donations/:id/verify/confirm' });
});

const LocationSchema = z.object({
  recipient_lat: z.number(),
  recipient_lng: z.number(),
});

router.put('/:id/location', requireAuth, requireRole('ngo'), requireVerifiedNGO, async (req: VerifiedNGORequest, res: Response) => {
  try {
    const id = parseDonationId(req);
    const parsed = LocationSchema.safeParse(req.body);
    if (!id || !parsed.success) {
      return res.status(400).json({ error: 'invalid-request' });
    }

    if (useMock) {
      const donation = mockStore.find((record) => record.id === id);
      if (!donation) return res.status(404).json({ error: 'not-found' });
      donation.recipient_lat = parsed.data.recipient_lat;
      donation.recipient_lng = parsed.data.recipient_lng;
      return res.json(donation);
    }

    const donation = await prisma.donation.findUnique({ where: { id }, select: { ngo_id: true } });
    if (!donation) return res.status(404).json({ error: 'not-found' });
    if (req.verifiedNGOId !== donation.ngo_id) return res.status(403).json({ error: 'NGO mismatch for donation' });

    const updated = await prisma.donation.update({
      where: { id },
      data: {
        recipient_lat: parsed.data.recipient_lat,
        recipient_lng: parsed.data.recipient_lng,
      },
    });

    return res.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

router.put('/:id/evidence', requireAuth, requireRole('ngo'), (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Evidence updates must use /api/evidence/prepare and /api/evidence/confirm' });
});

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    if (useMock) {
      return res.json(mockStore.slice().sort((a, b) => b.id - a.id));
    }

    const list = await prisma.donation.findMany({
      orderBy: { created_at: 'desc' },
    });

    return res.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
