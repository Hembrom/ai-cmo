import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { getMarketResearchReport } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { report_id } = req.query as { report_id?: string };

  if (!report_id || typeof report_id !== "string") {
    res.status(400).json({ error: "report_id is required" });
    return;
  }

  try {
    const report = await getMarketResearchReport(report_id);
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  } catch (err) {
    console.error("[market-research/report_id] DB error:", (err as Error).message);
    res.status(500).json({ error: "Failed to load report" });
  }
}
