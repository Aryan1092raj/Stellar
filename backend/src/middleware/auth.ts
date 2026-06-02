import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

type JwtUserPayload = {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
};

export interface AuthRequest extends Request {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

/**
 * Verify JWT token from Authorization header
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtUserPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication - continues even without valid token
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as JwtUserPayload;
      (req as AuthRequest).user = decoded;
    } catch (error) {
      // Continue without user
    }
  }

  next();
};

/**
 * Check if user has required role
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!authReq.user.role || !roles.includes(authReq.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
