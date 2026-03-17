import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const useMock = !process.env.DATABASE_URL;
const mockProjects: any[] = [];

const router = Router();

const ProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  ngo_id: z.number().int(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/**
 * ✅ CREATE PROJECT (NGO ONLY)
 * Only authenticated NGOs can create projects.
 */
router.post(
  '/',
  requireAuth,
  requireRole('ngo'),
  (req: Request, res: Response) => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.issues });
    }

    (async () => {
      if (useMock) {
        const created = {
          id: mockProjects.length + 1,
          created_at: new Date().toISOString(),
          ...parsed.data,
        };
        mockProjects.push(created);
        return res.status(201).json(created);
      }

      const created = await (prisma as any).project.create({
        data: parsed.data,
      });

      res.status(201).json(created);
    })().catch((e) => {
      console.error(e);
      res.status(500).json({ error: 'failed-to-create' });
    });
  }
);

/**
 * ✅ LIST PROJECTS (PUBLIC)
 * Anyone can see projects.
 */
router.get('/', (_req: Request, res: Response) => {
  (async () => {
    if (useMock) {
      return res.json(mockProjects.slice().sort((a, b) => b.id - a.id));
    }

    const list = await (prisma as any).project.findMany({
      orderBy: { created_at: 'desc' },
    });

    res.json(list);
  })().catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'failed-to-list' });
  });
});

export default router;
