import axios from "axios";
import * as cheerio from "cheerio";
import type { ScrapedContent } from "./types";

/**
 * Rejects private/loopback/link-local hosts to prevent SSRF attacks.
 */
function validateUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  const host = parsed.hostname.toLowerCase();
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fd/,
  ];
  if (blocked.some((re) => re.test(host))) {
    throw new Error("URL resolves to a private or internal network address");
  }
}

export async function fetchWebsiteContent(url: string): Promise<ScrapedContent> {
  validateUrl(url);

  const response = await axios.get<string>(url, {
    timeout: 10000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AICMOBot/1.0; +https://aicmo.app)",
    },
  });

  const $ = cheerio.load(response.data);
  $("script, style, noscript, iframe").remove();

  const title      = $("title").text().trim();
  const metaDesc   = $('meta[name="description"]').attr("content") ?? "";
  const h1s        = $("h1").map((_, el) => $(el).text().trim()).get();
  const h2s        = $("h2").map((_, el) => $(el).text().trim()).get();
  const bodyText   = $("body").text().replace(/\s+/g, " ").trim().slice(0, 3000);
  const ctaButtons = $("a, button")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 2 && t.length < 60)
    .slice(0, 20);

  return { title, metaDesc, h1s, h2s, bodyText, ctaButtons };
}
