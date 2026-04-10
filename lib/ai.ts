import Anthropic from "@anthropic-ai/sdk";
import type { AIInsights, ScrapedContent, SEOData, Signals } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AnalyzeOptions {
  url: string;
  scraped: ScrapedContent;
  signals: Signals;
  seoData: SEOData;
}

export async function analyzeWithAI({
  url,
  scraped,
  signals,
  seoData,
}: AnalyzeOptions): Promise<AIInsights> {
  const seoSection = seoData.pageSpeed
    ? `- Performance Score: ${seoData.pageSpeed.performance}/100
- SEO Score: ${seoData.pageSpeed.seo}/100
- Accessibility: ${seoData.pageSpeed.accessibility}/100
- LCP: ${seoData.coreWebVitals?.lcp ?? "N/A"}
- CLS: ${seoData.coreWebVitals?.cls ?? "N/A"}`
    : "- PageSpeed data unavailable";

  const prompt = `You are an expert AI CMO (Chief Marketing Officer) and SEO analyst.

Analyze the following website data and provide actionable insights.

## Website: ${url}

### Scraped Content
- Title: ${scraped.title}
- Meta Description: ${scraped.metaDesc}
- H1 Tags: ${scraped.h1s.join(" | ") || "None"}
- H2 Tags: ${scraped.h2s.join(" | ") || "None"}
- Body Text (excerpt): ${scraped.bodyText.slice(0, 1000)}

### Business Info
- Phones found: ${signals.businessInfo.phones.join(", ") || "None"}
- Emails found: ${signals.businessInfo.emails.join(", ") || "None"}
- Location info present: ${signals.businessInfo.hasLocation}

### Marketing Signals
- CTA Buttons: ${signals.marketingSignals.ctaButtons.slice(0, 10).join(" | ") || "None"}
- Strong CTAs (book/call/get/free): ${signals.marketingSignals.hasStrongCta}
- Has Blog/Articles: ${signals.marketingSignals.hasBlog}
- Has Landing Page: ${signals.marketingSignals.hasLandingPage}

### SEO / Performance
${seoSection}

---

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "servicesOffered": ["list of services you detected"],
  "missingServices": ["important services that seem absent"],
  "seoIssues": ["list of SEO problems found"],
  "marketingGaps": ["list of marketing weaknesses"],
  "quickWins": ["top 3-5 immediate improvements"],
  "overallScore": <number 0-100>,
  "summary": "<2-sentence executive summary>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  const clean = block.text.trim().replace(/^```json|^```|```$/gm, "").trim();
  return JSON.parse(clean) as AIInsights;
}
