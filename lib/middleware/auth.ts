import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  [key: string]: unknown;
}

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Returns the decoded user payload, or sends 401 and returns null.
 */
export function requireAuth(req: VercelRequest, res: VercelResponse): AuthUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    return decoded;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}
