import axios from "axios";
import type { SEOData } from "./types";

export async function fetchSEOData(url: string): Promise<SEOData> {
  const key    = process.env.GOOGLE_PAGESPEED_KEY;
  const apiUrl =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
    `?url=${encodeURIComponent(url)}&strategy=mobile` +
    (key ? `&key=${key}` : "");

  try {
    const { data } = await axios.get(apiUrl, { timeout: 15000 });
    const cats   = (data.lighthouseResult?.categories ?? {}) as Record<string, { score: number }>;
    const audits = (data.lighthouseResult?.audits     ?? {}) as Record<string, { displayValue: string }>;

    return {
      pageSpeed: {
        performance:   Math.round((cats.performance?.score           ?? 0) * 100),
        seo:           Math.round((cats.seo?.score                   ?? 0) * 100),
        accessibility: Math.round((cats.accessibility?.score         ?? 0) * 100),
        bestPractices: Math.round((cats["best-practices"]?.score     ?? 0) * 100),
      },
      coreWebVitals: {
        lcp: audits["largest-contentful-paint"]?.displayValue ?? "N/A",
        fid: audits["max-potential-fid"]?.displayValue        ?? "N/A",
        cls: audits["cumulative-layout-shift"]?.displayValue  ?? "N/A",
      },
    };
  } catch (err) {
    console.warn("PageSpeed API error:", (err as Error).message);
    return { pageSpeed: null, coreWebVitals: null };
  }
}
