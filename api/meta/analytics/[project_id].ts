import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../../lib/cors";
import { requireAuth } from "../../../lib/middleware/auth";
import { tokenStore } from "../../../lib/meta/token-store";
import { fetchAllFacebookAnalytics } from "../../../lib/meta/facebook-analytics";
import { fetchAllInstagramAnalytics } from "../../../lib/meta/instagram-analytics";
import { getCached, setCache } from "../../../lib/meta/analytics-cache";

function computeCombinedSummary(results: Record<string, any>) {
  const fb = results.facebook?.summary  || {};
  const ig = results.instagram?.summary || {};

  return {
    total_reach:       (fb.total_reach       || 0) + (ig.total_reach       || 0),
    total_impressions: (fb.total_impressions || 0) + (ig.total_impressions || 0),
    total_engagements: (fb.total_engagements || 0),
    total_followers: (
      (results.facebook?.overview?.total_followers || 0) +
      (results.instagram?.overview?.followers      || 0)
    ),
    follower_growth: ig.follower_growth || 0,
    profile_views:   ig.profile_views   || 0,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireAuth(req, res)) return;

  const project_id = req.query.project_id as string;
  const {
    start         = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    end           = new Date().toISOString().split("T")[0],
    platforms     = "facebook,instagram",
    force_refresh = "false",
  } = req.query as Record<string, string>;

  const dateRange   = { start, end };
  const wantedPlats = platforms.split(",").map(p => p.trim());

  const conn = tokenStore[project_id];
  if (!conn) {
    res.status(400).json({
      error:  "Meta account not connected",
      action: "Call GET /api/meta/connect?project_id=... to connect",
    });
    return;
  }

  const cacheKey = `meta:${project_id}:${start}:${end}:${platforms}`;
  if (force_refresh !== "true") {
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ ...(cached as object), from_cache: true });
      return;
    }
  }

  const results: Record<string, any> = {};
  const errors: Record<string, any>  = {};
  const tasks: Promise<void>[]       = [];

  if (wantedPlats.includes("facebook") && conn.pages?.length) {
    const page = conn.pages[0];
    tasks.push(
      fetchAllFacebookAnalytics(page.id, page.access_token, dateRange)
        .then(d  => { results.facebook = d; })
        .catch(e => { errors.facebook  = e.response?.data?.error || e.message; })
    );
  }

  if (wantedPlats.includes("instagram") && conn.ig_accounts?.length) {
    const ig = conn.ig_accounts[0];
    tasks.push(
      fetchAllInstagramAnalytics(ig.ig_id, ig.page_token, dateRange)
        .then(d  => { results.instagram = d; })
        .catch(e => { errors.instagram  = e.response?.data?.error || e.message; })
    );
  }

  await Promise.allSettled(tasks);

  const combined = computeCombinedSummary(results);

  const response = {
    project_id,
    date_range:   dateRange,
    connected_at: conn.connected_at,
    combined,
    platforms:    results,
    errors:       Object.keys(errors).length ? errors : undefined,
    from_cache:   false,
    fetched_at:   new Date().toISOString(),
  };

  setCache(cacheKey, response);
  res.json(response);
}
