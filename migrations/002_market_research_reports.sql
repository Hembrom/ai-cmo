-- Market research reports: stores the full result of Q1-Q6 + optional URL analysis
-- Run: psql $POSTGRES_URL -f migrations/002_market_research_reports.sql

CREATE TABLE IF NOT EXISTS market_research_reports (
  id              TEXT        PRIMARY KEY,
  industry        TEXT        NOT NULL,
  target_customer TEXT,
  geography       TEXT,
  business_model  TEXT,
  monthly_budget  TEXT,
  website_url     TEXT,
  report_data     JSONB       NOT NULL,
  url_analysis    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mr_reports_created_at ON market_research_reports(created_at DESC);
