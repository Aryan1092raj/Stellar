import { Router } from 'express';
import { sendEmail } from '../utils/email';
import { storeOtp, getOtp, deleteOtp, incrementSendCount } from '../utils/otpStore';
import { saveVerifiedUser } from '../utils/firebase';
import jwt from 'jsonwebtoken';

const router = Router();

// Simple in-memory OTP store: Map<email, { code, expiresAt }>
const otpStore: Map<string, { code: string; expiresAt: number }> = new Map();

function genCode(length = 6) {
  let s = '';
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

router.post('/send', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'missing-email' });
  const otpLength = Number(process.env.OTP_LENGTH || 6);
  const code = genCode(otpLength);
  const ttl = Number(process.env.OTP_TTL_SECONDS || 300);
  // rate limit sends per email
  const { allowed, count } = await incrementSendCount(email, Number(process.env.OTP_MAX_SENDS || 5), Number(process.env.OTP_WINDOW_SECONDS || 3600));
  if (!allowed) return res.status(429).json({ error: 'rate-limited', count });
  await storeOtp(email, code, ttl);
  try {
    if (process.env.DISABLE_EMAILS === '1') {
      // for local dev, return code in response
      return res.json({ ok: true, code });
    }
    const result = await sendEmail(email, 'Your GeoLedger OTP', `Your verification code is ${code}`);
    // if using Ethereal or test account, send back preview URL so developer can open the message
    return res.json({ ok: true, previewUrl: result.previewUrl });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'failed-send' });
  }
});

router.post('/verify', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'missing-params' });
  try {
    const entry = await getOtp(email);
    if (!entry) return res.status(400).json({ error: 'not-found' });
    if (Date.now() > entry.expiresAt) {
      await deleteOtp(email);
      return res.status(400).json({ error: 'expired' });
    }
    if (entry.code !== String(code)) return res.status(400).json({ error: 'invalid' });
    await deleteOtp(email);
    // Persist verified user to Firestore (or memory) and issue JWT
    try {
      const userRecord = { email, verified_at: new Date().toISOString(), provider: req.body.provider || 'email', role: req.body.role || 'donor' };
      await saveVerifiedUser(email, userRecord);
      // issue JWT if JWT_SECRET provided
      const token = process.env.JWT_SECRET ? jwt.sign({ email, role: userRecord.role }, process.env.JWT_SECRET!, { expiresIn: '7d' }) : null;
      return res.json({ ok: true, token });
    } catch (e) { console.error('save failed', e); return res.status(500).json({ error: 'failed-save' }); }
  } catch (e) { console.error(e); return res.status(500).json({ error: 'failed' }); }
});

export default router;
