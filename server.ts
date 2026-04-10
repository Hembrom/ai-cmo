import "dotenv/config";
import express from "express";
import path from "path";
import projectsHandler from "./api/projects/index";
import runHandler from "./api/analysis/run";
import analysisHandler from "./api/analysis/[project_id]";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.all("/api/projects", (req, res) => projectsHandler(req as any, res as any));
app.all("/api/analysis/run", (req, res) => runHandler(req as any, res as any));
app.all("/api/analysis/:project_id", (req, res) => {
  const merged = Object.create(req);
  Object.defineProperty(merged, "query", {
    value: { ...req.query, project_id: req.params.project_id },
    writable: true, configurable: true, enumerable: true,
  });
  analysisHandler(merged as any, res as any);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
