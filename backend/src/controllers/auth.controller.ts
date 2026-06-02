import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  /**
   * POST /api/auth/register
   * Register new user
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(410).json({ error: 'Password registration is retired. Use /api/otp/send and /api/otp/verify instead.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/auth/login
   * User login
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(410).json({ error: 'Password login is retired. Use /api/otp/send and /api/otp/verify instead.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/auth/logout
   * User logout
   */
  logout: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // TODO: Invalidate token (add to blacklist if using Redis)

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  getProfile: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // TODO: Fetch full user data from database

      res.json({
        success: true,
        data: { user },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/auth/otp/request
   * Request OTP for passwordless login
   */
  requestOTP: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(410).json({ error: 'This OTP endpoint is retired. Use /api/otp/send instead.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/auth/otp/verify
   * Verify OTP and login
   */
  verifyOTP: async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(410).json({ error: 'This OTP endpoint is retired. Use /api/otp/verify instead.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
};
