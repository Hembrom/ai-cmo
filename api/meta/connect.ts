import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { requireAuth } from "../../lib/middleware/auth";

const META_APP_ID  = process.env.META_APP_ID!;
const BASE_URL     = process.env.BASE_URL || "http://localhost:3000";
const REDIRECT_URI = `${BASE_URL}/api/meta/callback`;

const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
  "business_management",
].join(",");

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { project_id } = req.query;
  if (!project_id || typeof project_id !== "string") {
    res.status(400).json({ error: "project_id required" });
    return;
  }

  const state = Buffer.from(JSON.stringify({ project_id, user_id: user.id })).toString("base64");

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}` +
    `&response_type=code`;

  res.json({ auth_url: authUrl });
}
