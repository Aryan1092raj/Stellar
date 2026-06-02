import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const useMock = !process.env.DATABASE_URL;
type NGORecord = {
  id: number;
  name: string;
  wallet_address: string;
  verification_status: string;
  sector?: string | null;
  created_at?: string;
};

const mockStore: NGORecord[] = [];

const router = Router();

const NGOSchema = z.object({
  name: z.string(),
  wallet_address: z.string(),
  sector: z.string().optional(),
});

/**
 * ✅ CREATE NGO (ADMIN ONLY)
 * Only authenticated ADMIN users can create NGOs
 */
router.post(
  '/',
  requireAuth,
  requireRole('ngo'),
  async (req: Request, res: Response) => {
    const parsed = NGOSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid-request' });
    }

    try {
      if (useMock) {
        const created = {
          id: mockStore.length + 1,
          name: parsed.data.name,
          wallet_address: parsed.data.wallet_address,
          verification_status: 'pending',
          sector: parsed.data.sector ?? null,
          created_at: new Date().toISOString(),
        };
        mockStore.push(created);
        return res.status(201).json(created);
      }

      const created = await prisma.nGO.create({
        data: {
          name: parsed.data.name,
          wallet_address: parsed.data.wallet_address,
          verification_status: 'pending',
          sector: parsed.data.sector ?? null,
        },
      });

      return res.status(201).json(created);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      return res.status(500).json({ error: message });
    }
  }
);

/**
 * ✅ LIST NGOs (PUBLIC)
 * Anyone can view verified/pending NGOs
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (useMock) {
      return res.json(mockStore.slice().sort((a, b) => b.id - a.id));
    }

    const list = await prisma.nGO.findMany({
      where: {
        verification_status: { in: ['pending', 'verified'] },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
