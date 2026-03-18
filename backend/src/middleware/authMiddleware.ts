import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role: "donor" | "ngo" | "admin") {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user?.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
