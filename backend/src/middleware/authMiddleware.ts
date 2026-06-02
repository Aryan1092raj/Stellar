import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from '../config/env';

type JwtUserPayload = {
  userId?: number;
  email?: string;
  role?: "donor" | "ngo" | "admin" | string;
  ngoId?: number;
  walletAddress?: string;
};

export type AuthenticatedRequest = Request & {
  user?: JwtUserPayload;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtUserPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: "donor" | "ngo" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req as AuthenticatedRequest).user?.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
