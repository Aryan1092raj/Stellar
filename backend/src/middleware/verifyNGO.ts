import { NextFunction, Request, Response } from 'express';
import { prisma } from '../db';
import { isNGOVerifiedOnChain } from '../lib/stellar';
import { AuthenticatedRequest } from './authMiddleware';

export type VerifiedNGORequest = AuthenticatedRequest & {
  verifiedNGOId?: number;
  verifiedNGOWallet?: string;
};

function parseNumericId(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

async function resolveNGOContext(req: AuthenticatedRequest) {
  const fromToken = parseNumericId(req.user?.ngoId);
  const fromBody = parseNumericId(req.body?.ngo_id) || parseNumericId(req.body?.ngoId);
  let ngoId = fromToken || fromBody;
  let walletAddress = req.user?.walletAddress || null;

  const donationId = parseNumericId(req.body?.donation_id) || parseNumericId(req.params?.id);
  if (!ngoId && donationId && process.env.DATABASE_URL) {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      select: { ngo_id: true },
    });
    ngoId = donation?.ngo_id ?? null;
  }

  if (ngoId && process.env.DATABASE_URL) {
    const ngo = await prisma.nGO.findUnique({
      where: { id: ngoId },
      select: { wallet_address: true },
    });
    walletAddress = walletAddress || ngo?.wallet_address || null;
  }

  return { ngoId, walletAddress };
}

export async function requireVerifiedNGO(req: Request, res: Response, next: NextFunction) {
  try {
    const typedReq = req as VerifiedNGORequest;
    const { ngoId, walletAddress } = await resolveNGOContext(typedReq);

    if (!ngoId) {
      return res.status(403).json({ error: 'NGO ID missing from token or request' });
    }
    if (!walletAddress) {
      return res.status(403).json({ error: 'NGO wallet missing' });
    }

    const isVerified = await isNGOVerifiedOnChain(ngoId, walletAddress);
    if (!isVerified) {
      return res.status(403).json({ error: 'NGO not verified on-chain' });
    }

    typedReq.verifiedNGOId = ngoId;
    typedReq.verifiedNGOWallet = walletAddress;
    return next();
  } catch {
    return res.status(503).json({ error: 'Could not verify NGO on-chain' });
  }
}
