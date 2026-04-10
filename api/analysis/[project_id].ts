import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { getAnalysesByProjectId } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { project_id } = req.query as { project_id: string };

  try {
    const analyses = await getAnalysesByProjectId(project_id);
    res.json(analyses);
  } catch (err) {
    console.error("Failed to fetch analyses:", (err as Error).message);
    res.status(500).json({ error: "Failed to fetch analyses" });
  }
}
