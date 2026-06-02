import { Request, Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getFirebaseAuth } from '../utils/firebase';
import { prisma } from '../db';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';

const router = Router();

// Basic health check for auth system
router.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Auth route operational' });
});

type AuthenticatedRequest = Request & {
  user?: {
    email?: string;
    role?: string;
  };
};

// Return authenticated user info (decoded JWT)
router.get('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    email: req.user?.email || null,
    role: req.user?.role || null
  });
});

router.post('/google', async (req, res) => {
  const { idToken, role } = req.body || {};

  if (!idToken) {
    return res.status(400).json({ error: 'idToken required' });
  }

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    const email = decoded.email;

    if (!email) {
      return res.status(400).json({ error: 'Google account missing email' });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: decoded.name || null,
        avatar: decoded.picture || null,
        googleUid: decoded.uid
      },
      create: {
        email,
        name: decoded.name || null,
        avatar: decoded.picture || null,
        googleUid: decoded.uid,
        role: role === 'ngo' ? 'ngo' : 'donor'
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
