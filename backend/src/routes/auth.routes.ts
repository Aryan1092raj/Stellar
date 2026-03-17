import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Basic health check for auth system
router.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Auth route operational' });
});

// Return authenticated user info (decoded JWT)
router.get('/profile', requireAuth, (req: any, res) => {
  res.json({
    email: req.user?.email || null,
    role: req.user?.role || null
  });
});

export default router;
