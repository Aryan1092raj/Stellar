import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { DEMO_NGOS } from '../demo-data';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const useMock = !process.env.DATABASE_URL;
const mockStore: any[] = [...DEMO_NGOS];

const router = Router();

const VerifySchema = z.object({ donation_id: z.number().int(), verifier_public_key: z.string(), chain_verify_tx: z.string().optional() });

router.post('/', (req: Request, res: Response) => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });
  (async () => {
    if (useMock) {
      // Since mock store lives in donations route module scope, we cannot access it directly; respond with placeholder.
      return res.json({ ok: true, donation_id: parsed.data.donation_id, status: 'verified', chain_verify_tx: parsed.data.chain_verify_tx ?? null });
    }
    const donation = await prisma.donation.update({
      where: { id: parsed.data.donation_id },
      // @ts-ignore awaiting regenerated Prisma types for new columns
      data: { status: 'verified', chain_verify_tx: parsed.data.chain_verify_tx ?? null },
    });
    res.json({ ok: true, donation_id: donation.id, status: donation.status });
  })().catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'failed-to-verify' });
  });
});

export default router;
