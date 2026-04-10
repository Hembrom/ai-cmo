import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../../lib/cors";
import { getProjectById, saveAnalysis } from "../../lib/db";
import { fetchWebsiteContent } from "../../lib/scraper";
import { extractSignals } from "../../lib/signals";
import { fetchSEOData } from "../../lib/seo";
import { analyzeWithAI } from "../../lib/ai";
import type { SEOData } from "../../lib/types";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { project_id, type = "full" } = req.body as {
    project_id?: string;
    type?: string;
  };

  if (!project_id || typeof project_id !== "string") {
    res.status(400).json({ error: "project_id is required" });
    return;
  }

  const project = await getProjectById(project_id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const { url }   = project;
    const startedAt = new Date().toISOString();

    // Step 2: Scrape
    console.log(`[${project_id}] Scraping ${url}…`);
    const scraped = await fetchWebsiteContent(url);
    const signals = extractSignals(scraped);

    // Step 3: SEO data (optional)
    let seoData: SEOData = { pageSpeed: null, coreWebVitals: null };
    if (type === "full") {
      console.log(`[${project_id}] Fetching SEO data…`);
      seoData = await fetchSEOData(url);
    }

    // Step 4: AI analysis
    console.log(`[${project_id}] Sending to AI…`);
    const insights = await analyzeWithAI({ url, scraped, signals, seoData });

    // Step 5: Persist
    const analysis = {
      id:          `analysis_${Date.now()}`,
      projectId:   project_id,
      type,
      startedAt,
      completedAt: new Date().toISOString(),
      scraped,
      signals,
      seoData,
      insights,
    };
    await saveAnalysis(analysis);

    // Step 6: Return
    res.json({
      analysis_id: analysis.id,
      project_id,
      insights,
      seoData,
      signals,
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[${project_id}] Analysis failed:`, error.message);
    res.status(500).json({ error: error.message });
  }
}
