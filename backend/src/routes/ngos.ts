import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { DEMO_NGOS } from '../demo-data';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const useMock = !process.env.DATABASE_URL;
const mockStore: any[] = [...DEMO_NGOS]; // Pre-populate with demo data

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
  (req: Request, res: Response) => {
    const parsed = NGOSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }

    (async () => {
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

      res.status(201).json(created);
    })().catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'failed-to-create' });
    });
  }
);

/**
 * ✅ LIST NGOs (PUBLIC)
 * Anyone can view verified/pending NGOs
 */
router.get('/', (_req: Request, res: Response) => {
  (async () => {
    if (useMock) {
      return res.json(mockStore.slice().sort((a, b) => b.id - a.id));
    }

    const list = await prisma.nGO.findMany({
      where: {
        verification_status: { in: ['pending', 'verified'] },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json(list);
  })().catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'failed-to-list' });
  });
});

export default router;
