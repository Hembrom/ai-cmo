import "dotenv/config";
import express from "express";
import path from "path";
import projectsHandler from "./api/projects/index";
import runHandler from "./api/analysis/run";
import marketResearchHandler from "./api/market-research";
import analysisHandler from "./api/analysis/[project_id]";
import metaConnectHandler from "./api/meta/connect";
import metaCallbackHandler from "./api/meta/callback";
import metaStatusHandler from "./api/meta/status/[project_id]";
import metaAnalyticsHandler from "./api/meta/analytics/[project_id]";
import metaRefreshHandler from "./api/meta/analytics/refresh/[project_id]";
import { startTokenRefreshScheduler } from "./lib/meta/token-refresh";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Clean URL for market research page (no .html)
app.get("/market-research", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "market-research.html"));
});

app.all("/api/projects", (req, res) => projectsHandler(req as any, res as any));
app.all("/api/market-research", (req, res) => marketResearchHandler(req as any, res as any));
app.all("/api/analysis/run", (req, res) => runHandler(req as any, res as any));
app.all("/api/analysis/:project_id", (req, res) => {
  const merged = Object.create(req);
  Object.defineProperty(merged, "query", {
    value: { ...req.query, project_id: req.params.project_id },
    writable: true, configurable: true, enumerable: true,
  });
  analysisHandler(merged as any, res as any);
});

// Meta (Facebook + Instagram) routes
app.all("/api/meta/connect", (req, res) => metaConnectHandler(req as any, res as any));
app.all("/api/meta/callback", (req, res) => metaCallbackHandler(req as any, res as any));
app.all("/api/meta/status/:project_id", (req, res) => {
  const merged = Object.create(req);
  Object.defineProperty(merged, "query", {
    value: { ...req.query, project_id: req.params.project_id },
    writable: true, configurable: true, enumerable: true,
  });
  metaStatusHandler(merged as any, res as any);
});
app.all("/api/meta/analytics/refresh/:project_id", (req, res) => {
  const merged = Object.create(req);
  Object.defineProperty(merged, "query", {
    value: { ...req.query, project_id: req.params.project_id },
    writable: true, configurable: true, enumerable: true,
  });
  metaRefreshHandler(merged as any, res as any);
});
app.all("/api/meta/analytics/:project_id", (req, res) => {
  const merged = Object.create(req);
  Object.defineProperty(merged, "query", {
    value: { ...req.query, project_id: req.params.project_id },
    writable: true, configurable: true, enumerable: true,
  });
  metaAnalyticsHandler(merged as any, res as any);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  startTokenRefreshScheduler();
});
