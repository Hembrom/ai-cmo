import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Sets CORS headers and short-circuits OPTIONS pre-flight requests.
 * Returns true if the request was an OPTIONS pre-flight (caller should return).
 */
export function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  const origin = process.env.ALLOWED_ORIGIN ?? "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}
