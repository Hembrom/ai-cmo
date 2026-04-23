import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCORS } from "../lib/cors";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { industry, icp, budget, goal } = req.body as {
    industry?: string;
    icp?: string;
    budget?: string;
    goal?: string;
  };

  if (!industry || !icp || !budget || !goal) {
    res
      .status(400)
      .json({ error: "All fields are required: industry, icp, budget, goal" });
    return;
  }

  const prompt = `You are an expert marketing strategist with deep knowledge of the Indian SME market.

Build a detailed marketing funnel strategy based on the following inputs:

- Industry & Product: ${industry}
- Ideal Customer Profile (ICP): ${icp}
- Monthly Budget: ${budget}
- Primary Goal: ${goal}

Map the user's context to the most suitable framework (AIDA or Flywheel/Growth Loop) and create a 5-stage funnel:
Awareness → Consideration → Intent → Conversion → Loyalty

For each stage, tailor recommendations to the Indian market, the stated budget, and specified goal.
Apply a "Paisa Vasool" filter — every tactic must have the highest probability of ROI for an SME.

Respond ONLY with a valid JSON object (no markdown, no extra text):
{
  "framework": "AIDA or Flywheel",
  "summary": "2–3 sentence strategic overview tailored to the inputs",
  "stages": [
    {
      "name": "Awareness",
      "volume": 100,
      "channels": ["channel 1", "channel 2", "channel 3"],
      "contentIdeas": ["idea 1", "idea 2", "idea 3"],
      "kpis": ["KPI 1", "KPI 2", "KPI 3"],
      "dropOffRisk": "The single most critical drop-off risk at this stage with a brief reason"
    },
    {
      "name": "Consideration",
      "volume": <realistic % drop from Awareness, e.g. 35–55>,
      "channels": ["..."],
      "contentIdeas": ["..."],
      "kpis": ["..."],
      "dropOffRisk": "..."
    },
    {
      "name": "Intent",
      "volume": <realistic %, e.g. 15–30>,
      "channels": ["..."],
      "contentIdeas": ["..."],
      "kpis": ["..."],
      "dropOffRisk": "..."
    },
    {
      "name": "Conversion",
      "volume": <realistic %, e.g. 5–15>,
      "channels": ["..."],
      "contentIdeas": ["..."],
      "kpis": ["..."],
      "dropOffRisk": "..."
    },
    {
      "name": "Loyalty",
      "volume": <realistic %, e.g. 3–10>,
      "channels": ["..."],
      "contentIdeas": ["..."],
      "kpis": ["..."],
      "dropOffRisk": "..."
    }
  ],
  "budgetAllocation": {
    "Awareness": <integer %>,
    "Consideration": <integer %>,
    "Intent": <integer %>,
    "Conversion": <integer %>,
    "Loyalty": <integer %>
  }
}

Rules:
- stages array must have exactly 5 items in the order: Awareness, Consideration, Intent, Conversion, Loyalty
- volume for Awareness must be 100; subsequent values must strictly decrease
- budgetAllocation percentages must sum to exactly 100
- channels, contentIdeas, and kpis must each have 2–4 items
- dropOffRisk must be a single sentence`;

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
    console.error("Funnel strategy generation failed:", error.message);
    res.status(500).json({ error: error.message });
  }
}
