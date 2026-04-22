import { Pool } from "pg";
import type { Analysis, MarketResearchReport, Project } from "./types";

const pool = new Pool({
  host:     process.env.POSTGRES_HOST,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  port:     parseInt(process.env.POSTGRES_PORT || "5432"),
  ssl: { rejectUnauthorized: false },
});

async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  let text = "";
  strings.forEach((s, i) => {
    text += s;
    if (i < values.length) text += `$${i + 1}`;
  });
  const client = await pool.connect();
  try {
    return client.query(text, values as unknown[]);
  } finally {
    client.release();
  }
}

export async function createProject(id: string, url: string): Promise<Project> {
  const { rows } = await sql`
    INSERT INTO projects (id, url, created_at)
    VALUES (${id}, ${url}, NOW())
    RETURNING id, url, created_at
  `;
  return { id: rows[0].id, url: rows[0].url, createdAt: rows[0].created_at };
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const { rows } = await sql`
    SELECT id, url, created_at FROM projects WHERE id = ${projectId}
  `;
  if (rows.length === 0) return null;
  return { id: rows[0].id, url: rows[0].url, createdAt: rows[0].created_at };
}

export async function saveAnalysis(analysis: Analysis): Promise<void> {
  const scrapedJson  = JSON.stringify(analysis.scraped);
  const signalsJson  = JSON.stringify(analysis.signals);
  const seoDataJson  = JSON.stringify(analysis.seoData);
  const insightsJson = JSON.stringify(analysis.insights);

  await sql`
    INSERT INTO analyses
      (id, project_id, type, started_at, completed_at, scraped, signals, seo_data, insights)
    VALUES (
      ${analysis.id},
      ${analysis.projectId},
      ${analysis.type},
      ${analysis.startedAt}::timestamptz,
      ${analysis.completedAt}::timestamptz,
      ${scrapedJson}::jsonb,
      ${signalsJson}::jsonb,
      ${seoDataJson}::jsonb,
      ${insightsJson}::jsonb
    )
  `;
}

export async function getAnalysesByProjectId(projectId: string): Promise<Analysis[]> {
  const { rows } = await sql`
    SELECT
      id, project_id, type, started_at, completed_at,
      scraped, signals, seo_data, insights
    FROM analyses
    WHERE project_id = ${projectId}
    ORDER BY started_at DESC
  `;
  return rows.map((row) => ({
    id:          row.id,
    projectId:   row.project_id,
    type:        row.type,
    startedAt:   row.started_at,
    completedAt: row.completed_at,
    scraped:     row.scraped,
    signals:     row.signals,
    seoData:     row.seo_data,
    insights:    row.insights,
  }));
}

export async function saveMarketResearchReport(
  id: string,
  inputs: { industry: string; targetCustomer: string; geography: string; businessModel: string; monthlyBudget: string; websiteUrl?: string },
  reportData: Record<string, unknown>,
  urlAnalysis: Record<string, unknown> | null,
): Promise<MarketResearchReport> {
  const reportJson     = JSON.stringify(reportData);
  const urlAnalysisJson = urlAnalysis ? JSON.stringify(urlAnalysis) : null;

  const { rows } = await sql`
    INSERT INTO market_research_reports
      (id, industry, target_customer, geography, business_model, monthly_budget, website_url, report_data, url_analysis, created_at)
    VALUES (
      ${id},
      ${inputs.industry},
      ${inputs.targetCustomer || null},
      ${inputs.geography || null},
      ${inputs.businessModel || null},
      ${inputs.monthlyBudget || null},
      ${inputs.websiteUrl || null},
      ${reportJson}::jsonb,
      ${urlAnalysisJson}::jsonb,
      NOW()
    )
    RETURNING *
  `;
  return rowToReport(rows[0]);
}

export async function getMarketResearchReport(id: string): Promise<MarketResearchReport | null> {
  const { rows } = await sql`
    SELECT * FROM market_research_reports WHERE id = ${id}
  `;
  if (!rows.length) return null;
  return rowToReport(rows[0]);
}

function rowToReport(row: Record<string, unknown>): MarketResearchReport {
  return {
    id:             row.id as string,
    industry:       row.industry as string,
    targetCustomer: row.target_customer as string,
    geography:      row.geography as string,
    businessModel:  row.business_model as string,
    monthlyBudget:  row.monthly_budget as string,
    websiteUrl:     row.website_url as string | null,
    reportData:     row.report_data as Record<string, unknown>,
    urlAnalysis:    row.url_analysis as Record<string, unknown> | null,
    createdAt:      row.created_at as string,
  };
}
