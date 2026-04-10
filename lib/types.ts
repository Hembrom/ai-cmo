export interface ScrapedContent {
  title: string;
  metaDesc: string;
  h1s: string[];
  h2s: string[];
  bodyText: string;
  ctaButtons: string[];
}

export interface BusinessInfo {
  phones: string[];
  emails: string[];
  hasLocation: boolean;
}

export interface MarketingSignals {
  keywords: string[];
  ctaButtons: string[];
  hasStrongCta: boolean;
  hasBlog: boolean;
  hasLandingPage: boolean;
}

export interface Signals {
  businessInfo: BusinessInfo;
  marketingSignals: MarketingSignals;
}

export interface PageSpeed {
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
}

export interface CoreWebVitals {
  lcp: string;
  fid: string;
  cls: string;
}

export interface SEOData {
  pageSpeed: PageSpeed | null;
  coreWebVitals: CoreWebVitals | null;
}

export interface AIInsights {
  servicesOffered: string[];
  missingServices: string[];
  seoIssues: string[];
  marketingGaps: string[];
  quickWins: string[];
  overallScore: number;
  summary: string;
}

export interface Project {
  id: string;
  url: string;
  createdAt: string;
}

export interface Analysis {
  id: string;
  projectId: string;
  type: string;
  startedAt: string;
  completedAt: string | null;
  scraped: ScrapedContent;
  signals: Signals;
  seoData: SEOData;
  insights: AIInsights;
}
