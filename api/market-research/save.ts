import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { saveMarketResearchReport } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { inputs, reportData, urlAnalysis } = req.body as {
    inputs: {
      industry: string;
      targetCustomer: string;
      geography: string;
      businessModel: string;
      monthlyBudget: string;
      websiteUrl?: string;
    };
    reportData: Record<string, unknown>;
    urlAnalysis: Record<string, unknown> | null;
  };

  if (!inputs?.industry || !reportData) {
    res.status(400).json({ error: "inputs and reportData are required" });
    return;
  }

  try {
    const id = `mr_${Date.now()}`;
    const report = await saveMarketResearchReport(id, inputs, reportData, urlAnalysis ?? null);
    res.status(201).json({ report_id: report.id });
  } catch (err) {
    console.error("[market-research/save] DB error:", (err as Error).message);
    res.status(500).json({ error: "Failed to save report" });
  }
}
