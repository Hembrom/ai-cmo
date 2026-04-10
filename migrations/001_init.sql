-- AI CMO: initial schema
-- Run: psql $POSTGRES_URL -f migrations/001_init.sql

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT        PRIMARY KEY,
  url         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analyses (
  id           TEXT        PRIMARY KEY,
  project_id   TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'full',
  started_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  scraped      JSONB,
  signals      JSONB,
  seo_data     JSONB,
  insights     JSONB
);

CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_started_at  ON analyses(started_at DESC);
