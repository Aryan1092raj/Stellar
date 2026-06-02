import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config/env';

const router = Router();
const codes = new Map<string, string>();

router.post('/start', (req, res) => {
  const { email, role } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'missing-fields' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  codes.set(`${role}:${email}`, code);
  // In production, send via email/SMS. Here we return code for demo.
  res.json({ ok: true, code });
});

router.post('/verify', async (req, res) => {
  const { email, role, code } = req.body || {};
  if (!email || !role || !code) return res.status(400).json({ error: 'missing-fields' });
  const key = `${role}:${email}`;
  const stored = codes.get(key);
  if (!stored || stored !== code) return res.status(401).json({ error: 'invalid-code' });
  codes.delete(key);
  try {
    if (process.env.DATABASE_URL) {
      await prisma.user.upsert({ where: { email }, update: { role }, create: { email, role } });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
  const token = jwt.sign({ sub: email, role }, config.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

export default router;
