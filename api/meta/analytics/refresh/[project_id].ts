import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../../../lib/cors";
import { requireAuth } from "../../../../lib/middleware/auth";
import { cache } from "../../../../lib/meta/analytics-cache";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireAuth(req, res)) return;

  const project_id = req.query.project_id as string;
  const keys = Object.keys(cache).filter(k => k.startsWith(`meta:${project_id}:`));
  keys.forEach(k => delete cache[k]);

  res.json({ cleared: keys.length, message: "Cache cleared. Next request will fetch fresh data." });
}
