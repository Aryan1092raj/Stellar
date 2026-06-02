import { Request, Response, Router } from 'express';

const router = Router();

router.post('/', (_req: Request, res: Response) => {
  return res.status(410).json({ error: 'Impact verification moved to /api/donations/:id/verify/prepare and /api/donations/:id/verify/confirm' });
});

export default router;
