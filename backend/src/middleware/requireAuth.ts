import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "replace-with-secure-secret";
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "cw_sess";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try cookie first
  const cookieToken = (req as any).cookies?.[COOKIE_NAME];
  const bearer = req.header("Authorization")?.replace(/^Bearer\s+/, "");
  const token = cookieToken || bearer;
  if (!token) return res.status(401).json({ ok: false, error: "missing_token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    (req as any).auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
}