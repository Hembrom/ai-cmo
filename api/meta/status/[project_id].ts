import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../../lib/cors";
import { requireAuth } from "../../../lib/middleware/auth";
import { tokenStore } from "../../../lib/meta/token-store";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireAuth(req, res)) return;

  const project_id = req.query.project_id as string;
  const conn = tokenStore[project_id];

  if (!conn) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected:   true,
    expires_at:  conn.expires_at,
    expired:     conn.expired ?? false,
    pages:       conn.pages.map(p => ({ id: p.id, name: p.name })),
    ig_accounts: conn.ig_accounts.map(a => ({ id: a.ig_id, name: a.name })),
  });
}
