import fs from "node:fs/promises";
import path from "node:path";

import { safeName } from "./path_utils.mjs";

export async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await fs.writeFile(filePath, `${String(value).trimEnd()}\n`, "utf8");
}

export async function resetProjectMemory(outDir) {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(outDir, "graph"), { recursive: true });
  await fs.mkdir(path.join(outDir, "MODULE_SUMMARIES"), { recursive: true });
}

export async function writeProjectMemory({
  outDir,
  files,
  imports,
  routes,
  components,
  apis,
  signals,
  algorithmFacts,
  graph,
  metrics,
  projectProfileMarkdown,
  moduleSummaries,
}) {
  await resetProjectMemory(outDir);

  await writeJson(path.join(outDir, "files.json"), files);
  await writeJson(path.join(outDir, "imports.json"), imports);
  await writeJson(path.join(outDir, "routes.json"), routes);
  await writeJson(path.join(outDir, "components.json"), components);
  await writeJson(path.join(outDir, "apis.json"), apis);
  await writeJson(path.join(outDir, "performance_signals.json"), signals);
  await writeJson(path.join(outDir, "algorithm_signals.json"), algorithmFacts);
  await writeJson(path.join(outDir, "graph", "code_graph.json"), graph);
  await writeJson(path.join(outDir, "graph_metrics.json"), metrics);
  await writeText(path.join(outDir, "PROJECT_PROFILE.md"), projectProfileMarkdown);

  for (const summary of moduleSummaries) {
    await writeText(path.join(outDir, "MODULE_SUMMARIES", `${safeName(summary.name)}.md`), summary.markdown);
  }
}
