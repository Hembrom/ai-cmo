import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { tokenStore } from "../../lib/meta/token-store";

const META_APP_ID     = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const BASE_URL        = process.env.BASE_URL || "http://localhost:3000";
const REDIRECT_URI    = `${BASE_URL}/api/meta/callback`;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`${BASE_URL}/dashboard?meta_error=${error}`);
    return;
  }

  let project_id: string;
  try {
    ({ project_id } = JSON.parse(Buffer.from(state, "base64").toString()));
  } catch {
    res.redirect(`${BASE_URL}/dashboard?meta_error=invalid_state`);
    return;
  }

  try {
    // 1. Exchange code for short-lived user token (1 hour)
    const tokenRes = await axios.get("https://graph.facebook.com/v21.0/oauth/access_token", {
      params: { client_id: META_APP_ID, client_secret: META_APP_SECRET, redirect_uri: REDIRECT_URI, code },
    });
    const shortToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived user token (60 days)
    const longRes = await axios.get("https://graph.facebook.com/v21.0/oauth/access_token", {
      params: {
        grant_type:        "fb_exchange_token",
        client_id:         META_APP_ID,
        client_secret:     META_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    const longToken  = longRes.data.access_token;
    const expires_at = new Date(Date.now() + longRes.data.expires_in * 1000).toISOString();

    // 3. Fetch all FB Pages the user manages
    const pagesRes = await axios.get("https://graph.facebook.com/v21.0/me/accounts", {
      params: { access_token: longToken, fields: "id,name,access_token,instagram_business_account" },
    });
    const pages = pagesRes.data.data || [];

    // 4. Extract linked Instagram Business accounts
    const ig_accounts = pages
      .filter((p: any) => p.instagram_business_account)
      .map((p: any) => ({
        ig_id:      p.instagram_business_account.id,
        page_id:    p.id,
        name:       p.name,
        page_token: p.access_token,
      }));

    // 5. Save to token store
    tokenStore[project_id] = {
      user_access_token: longToken,
      expires_at,
      pages,
      ig_accounts,
      connected_at: new Date().toISOString(),
    };

    res.redirect(`${BASE_URL}/dashboard?meta_connected=true&project_id=${project_id}`);
  } catch (err: any) {
    console.error("Meta OAuth error:", err.response?.data || err.message);
    res.redirect(`${BASE_URL}/dashboard?meta_error=token_exchange_failed`);
  }
}
