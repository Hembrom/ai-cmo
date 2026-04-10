import type { ScrapedContent, Signals } from "./types";

export function extractSignals(scraped: ScrapedContent): Signals {
  const allText = [
    scraped.title,
    scraped.metaDesc,
    ...scraped.h1s,
    ...scraped.h2s,
    scraped.bodyText,
  ]
    .join(" ")
    .toLowerCase();

  const phoneRegex  = /(\+?\d[\d\s\-(). ]{7,}\d)/g;
  const emailRegex  = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
  const locationKws = ["location", "address", "city", "near", "serving"] as const;

  const phones      = [...allText.matchAll(phoneRegex)].map((m) => m[0]).slice(0, 3);
  const emails      = [...allText.matchAll(emailRegex)].map((m) => m[0]).slice(0, 3);
  const hasLocation = locationKws.some((kw) => allText.includes(kw));

  const ctaStrong    = ["book", "call", "get", "start", "free", "now", "today"] as const;
  const hasStrongCta = scraped.ctaButtons.some((b) =>
    ctaStrong.some((kw) => b.toLowerCase().includes(kw))
  );

  const hasBlog        = allText.includes("blog") || allText.includes("article");
  const hasLandingPage = allText.includes("landing") || scraped.h1s.length > 0;

  return {
    businessInfo: { phones, emails, hasLocation },
    marketingSignals: {
      keywords: scraped.h2s.slice(0, 10),
      ctaButtons: scraped.ctaButtons,
      hasStrongCta,
      hasBlog,
      hasLandingPage,
    },
  };
}
