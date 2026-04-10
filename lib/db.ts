import { Pool } from "pg";
import type { Analysis, Project } from "./types";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });

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
