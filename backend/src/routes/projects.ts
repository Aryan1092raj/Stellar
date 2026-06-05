import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { requireVerifiedNGO, VerifiedNGORequest } from '../middleware/verifyNGO';

const useMock = !process.env.DATABASE_URL;
type ProjectRecord = {
  id: number;
  name: string;
  description?: string;
  ngo_id: number;
  latitude?: number;
  longitude?: number;
  target_amount?: number | null;
  sector?: string | null;
  cover_image_url?: string | null;
  deadline?: string | null;
  created_at: string;
};

const mockProjects: ProjectRecord[] = [];

const router = Router();

const ProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  ngo_id: z.number().int(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  target_amount: z.number().positive().optional(),
  sector: z.string().optional(),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  deadline: z.coerce.date().optional(),
});

/**
 * ✅ CREATE PROJECT (NGO ONLY)
 * Only authenticated NGOs can create projects.
 */
router.post(
  '/',
  requireAuth,
  requireRole('ngo'),
  requireVerifiedNGO,
  async (req: VerifiedNGORequest, res: Response) => {
    try {
      const parsed = ProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid-request' });
      }

      if (req.verifiedNGOId !== parsed.data.ngo_id) {
        return res.status(403).json({ error: 'NGO mismatch for project' });
      }

      if (useMock) {
        const created = {
          id: mockProjects.length + 1,
          created_at: new Date().toISOString(),
          ...parsed.data,
          cover_image_url: parsed.data.cover_image_url || null,
          deadline: parsed.data.deadline?.toISOString() ?? null,
        };
        mockProjects.push(created);
        return res.status(201).json(created);
      }

      const created = await prisma.project.create({
        data: {
          ...parsed.data,
          cover_image_url: parsed.data.cover_image_url || null,
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
 * ✅ LIST PROJECTS (PUBLIC)
 * Anyone can see projects.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (useMock) {
      return res.json(mockProjects.slice().sort((a, b) => b.id - a.id));
    }

    const list = await prisma.project.findMany({
      orderBy: { created_at: 'desc' },
    });

    return res.json(list);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
