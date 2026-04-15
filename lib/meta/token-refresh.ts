import axios from "axios";
import cron from "node-cron";
import { tokenStore } from "./token-store";

const META_APP_ID     = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const GRAPH           = "https://graph.facebook.com/v21.0";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function refreshTokenIfNeeded(project_id: string): Promise<void> {
  const conn = tokenStore[project_id];
  if (!conn) return;

  const expiresAt = new Date(conn.expires_at).getTime();
  const timeLeft  = expiresAt - Date.now();

  if (timeLeft > THIRTY_DAYS_MS) return; // still fresh

  console.log(`[TokenRefresh] Refreshing token for project ${project_id} (expires ${conn.expires_at})`);

  try {
    const { data } = await axios.get(`${GRAPH}/oauth/access_token`, {
      params: {
        grant_type:        "fb_exchange_token",
        client_id:         META_APP_ID,
        client_secret:     META_APP_SECRET,
        fb_exchange_token: conn.user_access_token,
      },
    });

    const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
    tokenStore[project_id].user_access_token = data.access_token;
    tokenStore[project_id].expires_at        = newExpiry;
    tokenStore[project_id].refreshed_at      = new Date().toISOString();

    console.log(`[TokenRefresh] ✅ Project ${project_id} refreshed. New expiry: ${newExpiry}`);
  } catch (err: any) {
    console.error(`[TokenRefresh] ❌ Failed for project ${project_id}:`, err.response?.data || err.message);
    tokenStore[project_id].expired = true;
  }
}

// Run every day at 2:00 AM — call this once at server startup (local dev only)
// On Vercel, use a cron job endpoint instead (see api/meta/cron/refresh.ts)
export function startTokenRefreshScheduler(): void {
  cron.schedule("0 2 * * *", async () => {
    console.log("[TokenRefresh] Running daily token refresh check...");
    for (const pid of Object.keys(tokenStore)) {
      await refreshTokenIfNeeded(pid);
    }
  });
  console.log("[TokenRefresh] Scheduler started (runs daily at 2 AM)");
}
