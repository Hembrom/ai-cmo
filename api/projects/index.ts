import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { createProject } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  // Basic URL validation before storing
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "url must use http or https protocol" });
      return;
    }
  } catch {
    res.status(400).json({ error: "url is not a valid URL" });
    return;
  }

  try {
    const projectId = `proj_${Date.now()}`;
    const project   = await createProject(projectId, url);
    res.status(201).json({ project_id: project.id, url: project.url });
  } catch (err) {
    console.error("Failed to create project:", (err as Error).message);
    res.status(500).json({ error: "Failed to create project" });
  }
}
