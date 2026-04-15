import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { handleCORS } from "../lib/cors";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface MarketResearchRequest {
  industry: string;
  targetCustomer: string;
  geography: string;
  businessModel: string;
  monthlyBudget: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { industry, targetCustomer, geography, businessModel, monthlyBudget } =
    req.body as MarketResearchRequest;

  if (!industry || typeof industry !== "string") {
    res.status(400).json({ error: "industry is required" });
    return;
  }

  const prompt = `You are an expert market research analyst with access to up-to-date industry data.

A user has described their market with these details:
- Industry / Market: ${industry}
- Target Customer: ${targetCustomer}
- Geography: ${geography}
- Business Model: ${businessModel}
- Monthly Marketing / Growth Budget: ${monthlyBudget || "Not specified"}

Provide a detailed market analysis. Use real, realistic figures based on your knowledge of this market segment.

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "marketOverview": "<2-3 sentence overview of the market>",
  "marketSize": {
    "tam": { "value": "<number>", "unit": "<B or M>", "label": "Total Addressable Market", "year": "<current year>" },
    "sam": { "value": "<number>", "unit": "<B or M>", "label": "Serviceable Addressable Market", "year": "<current year>" },
    "som": { "value": "<number>", "unit": "<B or M>", "label": "Serviceable Obtainable Market", "year": "<current year>" },
    "projected": { "value": "<number>", "unit": "<B or M>", "year": "<5 years out>" }
  },
  "cagr": {
    "historical": "<X.X>",
    "projected": "<X.X>",
    "period": "<start year>–<end year>",
    "drivers": ["<driver 1>", "<driver 2>", "<driver 3>", "<driver 4>"]
  },
  "topPlayers": [
    {
      "name": "<company name>",
      "marketShare": "<X–Y%>",
      "annualRevenue": "<$XB or $XM>",
      "trend": "<growing|stable|declining>",
      "note": "<one key differentiator or recent move>"
    }
  ],
  "marketTrends": ["<trend 1>", "<trend 2>", "<trend 3>", "<trend 4>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>", "<opportunity 3>"]
}

Include 4–6 top players. Be specific with numbers. If the exact figure is unknown, provide a well-reasoned estimate with a tilde (~).`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from AI");
    }

    const clean = block.text.trim().replace(/^```json|^```|```$/gm, "").trim();
    const data = JSON.parse(clean);

    res.json(data);
  } catch (err) {
    const error = err as Error;
    console.error("[market-research] AI failed:", error.message);
    res.status(500).json({ error: error.message });
  }
}
