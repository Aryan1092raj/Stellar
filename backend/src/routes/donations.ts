import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const useMock = !process.env.DATABASE_URL;
const mockStore: any[] = [];
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

/**
 * ✅ CREATE DONATION (DONOR ONLY)
 */
router.post(
  '/',
  requireAuth,
  requireRole('donor'),
  (req: Request, res: Response) => {
    const parsed = DonationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }

    (async () => {
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
          }
        : await prisma.donation.create({
            // @ts-ignore awaiting regenerated Prisma types for new columns
            data: {
              donor_public_key,
              amount,
              ngo_id,
              project_id: project_id ?? null,
              donor_lat: donor_location.lat,
              donor_lng: donor_location.lng,
              status: 'pending',
              chain_create_tx: parsed.data.chain_create_tx ?? null,
            },
          });

      if (useMock) mockStore.push(created);
      res.status(201).json(created);
    })().catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'failed-to-create' });
    });
  }
);

/**
 * ✅ UPDATE RECIPIENT LOCATION (NGO ONLY)
 */
const LocationSchema = z.object({
  recipient_lat: z.number(),
  recipient_lng: z.number(),
});

router.put(
  '/:id/location',
  requireAuth,
  requireRole('ngo'),
  (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const parsed = LocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }

    (async () => {
      if (useMock) {
        const idx = mockStore.findIndex((d) => d.id === id);
        if (idx === -1) return res.status(404).json({ error: 'not-found' });

        mockStore[idx].recipient_lat = parsed.data.recipient_lat;
        mockStore[idx].recipient_lng = parsed.data.recipient_lng;
        return res.json(mockStore[idx]);
      }

      const updated = await prisma.donation.update({
        where: { id },
        data: {
          recipient_lat: parsed.data.recipient_lat,
          recipient_lng: parsed.data.recipient_lng,
        },
      });

      res.json(updated);
    })().catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'failed-update' });
    });
  }
);

/**
 * ✅ LIST DONATIONS (AUTHENTICATED USERS ONLY)
 */
router.get(
  '/',
  requireAuth,
  (_req: Request, res: Response) => {
    (async () => {
      if (useMock) {
        return res.json(mockStore.slice().sort((a, b) => b.id - a.id));
      }

      const list = await prisma.donation.findMany({
        orderBy: { created_at: 'desc' },
      });

      res.json(list);
    })().catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'failed-to-list' });
    });
  }
);

export default router;
