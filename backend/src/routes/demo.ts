import { Request, Response, Router } from 'express';

const router = Router();

router.use((_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_ROUTES !== '1') {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(410).json({ error: 'Demo wallet routes are retired' });
});

export default router;
