#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const fixtureRoot = path.join(testDir, "fixtures", "phase-one");
const boundedFixtureRoot = path.join(testDir, "fixtures", "phase-one-bounded");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-graph-"));
const projectRoot = path.join(tempRoot, "project");
const boundedProjectRoot = path.join(tempRoot, "bounded-project");

fs.cpSync(fixtureRoot, projectRoot, { recursive: true });
fs.cpSync(boundedFixtureRoot, boundedProjectRoot, { recursive: true });
fs.mkdirSync(path.join(projectRoot, "tests", "fixtures", "src", "pages"), { recursive: true });
fs.writeFileSync(
  path.join(projectRoot, "tests", "fixtures", "src", "pages", "FixtureOnlyPage.tsx"),
  [
    "export function FixtureOnlyPage() {",
    "  const works = [{ id: 'fixture', coverUrl: '/fixture.png' }];",
    "  return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>;",
    "}",
    "",
  ].join("\n"),
);
fs.writeFileSync(
  path.join(projectRoot, "src", "api", "activityMutation.ts"),
  [
    "export async function createActivityWork(id: string) {",
    "  const response = await fetch(`/api/activities/${id}/works`, {",
    '    method: "POST",',
    "    body: JSON.stringify({ title: 'New work' }),",
    "  });",
    "  return response.json();",
    "}",
    "",
  ].join("\n"),
);
fs.mkdirSync(path.join(projectRoot, "src", "features"), { recursive: true });
fs.writeFileSync(
  path.join(projectRoot, "src", "features", "rankWorks.ts"),
  [
    "export function rankWorks(works, tags) {",
    "  return works",
    "    .filter((work) => tags.some((tag) => work.tags.includes(tag)))",
    "    .sort((left, right) => right.score - left.score);",
    "}",
    "",
  ].join("\n"),
);
fs.mkdirSync(path.join(projectRoot, "scripts"), { recursive: true });
fs.writeFileSync(
  path.join(projectRoot, "scripts", "detectorNoise.mjs"),
  [
    "const item = 'detector noise';",
    "const query = 'search';",
    "const score = 1;",
    "console.log(item, query, score);",
    "",
  ].join("\n"),
);
fs.appendFileSync(
  path.join(projectRoot, "backend", "main.py"),
  [
    "",
    '@app.post("/api/activities/{activity_id}/works")',
    "def create_activity_work(activity_id: str):",
    '    return {"ok": True}',
    "",
  ].join("\n"),
);

function run(args) {
  return execFileSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertRunFails(args, pattern) {
  assert.throws(
    () => run(args),
    (error) => {
      assert.match(String(error.stderr), pattern);
      return true;
    },
  );
}

assertRunFails(["repolens-graph/scripts/index_project.mjs", projectRoot, "--out"], /Missing value for --out/);
assertRunFails(["repolens-graph/scripts/index_project.mjs", projectRoot, "--out", ""], /Missing value for --out/);
assertRunFails(["repolens-graph/scripts/index_project.mjs", projectRoot, "--out", "."], /Refuse to remove unsafe outDir/);
assertRunFails(["repolens-graph/scripts/index_project.mjs", projectRoot, "--out", ".."], /Refuse to remove unsafe outDir/);
assertRunFails(["repolens-graph/scripts/index_project.mjs", projectRoot, "--out", "src"], /Refuse to remove existing non-generated outDir/);

run(["repolens-graph/scripts/index_project.mjs", projectRoot]);

const graphPath = path.join(projectRoot, ".project-memory", "graph", "code_graph.json");
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
assert.ok(
  !graph.nodes.some((node) => node.type !== "File" && (node.id.includes("FixtureOnlyPage") || node.meta?.file?.includes("tests/fixtures"))),
  "test fixtures should not produce runtime graph fact nodes",
);
assert.ok(
  !graph.edges.some((edge) => edge.source.includes("tests/fixtures") || edge.target.includes("tests/fixtures")),
  "test fixtures should not produce runtime graph edges",
);
const endpointId = "APIEndpoint:GET:/api/activities/:param/works";
const endpoint = graph.nodes.find((node) => node.id === endpointId);
assert.ok(endpoint, "frontend template and backend path should share one canonical API endpoint");
assert.deepEqual(new Set(endpoint.meta.sources), new Set(["fetch", "fastapi"]));
assert.ok(endpoint.meta.rawUrls.includes("/api/activities/${id}/works"));
assert.ok(endpoint.meta.rawUrls.includes("/api/activities/{activity_id}/works"));

const endpointEdges = graph.edges.filter((edge) => edge.target === endpointId);
assert.ok(endpointEdges.some((edge) => edge.type === "requests"), "canonical endpoint should retain frontend request edge");
assert.ok(endpointEdges.some((edge) => edge.type === "defines"), "canonical endpoint should retain backend define edge");

const postEndpointId = "APIEndpoint:POST:/api/activities/:param/works";
const postEndpoint = graph.nodes.find((node) => node.id === postEndpointId);
assert.ok(postEndpoint, "fetch method options should preserve non-GET API endpoints");
assert.deepEqual(new Set(postEndpoint.meta.sources), new Set(["fetch", "fastapi"]));

const metricsPath = path.join(projectRoot, ".project-memory", "graph_metrics.json");
assert.ok(fs.existsSync(metricsPath), "index should write graph metrics");
const files = JSON.parse(fs.readFileSync(path.join(projectRoot, ".project-memory", "files.json"), "utf8"));
assert.equal(files.find((file) => file.path.endsWith("FixtureOnlyPage.tsx"))?.kind, "test");
assert.equal(files.find((file) => file.path.endsWith("rankWorks.ts"))?.kind, "source");
assert.equal(files.find((file) => file.path.endsWith("detectorNoise.mjs"))?.kind, "tooling");
const signals = JSON.parse(fs.readFileSync(path.join(projectRoot, ".project-memory", "performance_signals.json"), "utf8"));
assert.ok(
  !signals.some((signal) => signal.file.includes("tests/fixtures")),
  "test fixtures should not produce performance signals",
);
const algorithmSignals = JSON.parse(fs.readFileSync(path.join(projectRoot, ".project-memory", "algorithm_signals.json"), "utf8"));
assert.ok(
  algorithmSignals.algorithmOpportunities.some((opportunity) => opportunity.file === "src/features/rankWorks.ts"),
  "runtime source files should be allowed to produce algorithm facts",
);
assert.ok(
  !algorithmSignals.algorithmOpportunities.some((opportunity) => opportunity.file === "scripts/detectorNoise.mjs"),
  "tooling files should not produce algorithm facts",
);

assertRunFails(
  ["repolens-graph/scripts/trace_module.mjs", projectRoot, "/activity/:id", "--out", "../trace.md"],
  /Refuse to write unsafe outFile outside project root/,
);
assertRunFails(
  ["repolens-graph/scripts/build_context_pack.mjs", projectRoot, "/activity/:id", "--out", "../context.md"],
  /Refuse to write unsafe outFile outside project root/,
);

run(["repolens-graph/scripts/build_context_pack.mjs", projectRoot, "/activity/:id"]);
const contextGraphPath = path.join(projectRoot, ".project-memory", "traces", "activity-id-context-graph.json");
const contextGraph = JSON.parse(fs.readFileSync(contextGraphPath, "utf8"));
assert.equal(contextGraph.target, "/activity/:id");
assert.equal(contextGraph.hops, 4);
assert.ok(contextGraph.nodes.some((node) => node.id === endpointId), "context graph should include the canonical API endpoint");
assert.ok(contextGraph.edges.some((edge) => edge.type === "requests" && edge.target === endpointId), "context graph should preserve evidence edges");
assert.ok(contextGraph.visits[endpointId]?.depth >= 0, "context graph should record node visit depth");
const contextPack = fs.readFileSync(path.join(projectRoot, ".project-memory", "context-packs", "activity-id.md"), "utf8");
assert.match(contextPack, /\| Score \| Distance \| Type \| Node \| Why Included \|/);
assert.match(contextPack, /GET \/api\/activities\/:param\/works/);
assert.match(contextPack, /large_response_payload|n_plus_one_query|missing_pagination/);

run(["repolens-graph/scripts/perf_report.mjs", projectRoot, "/activity/:id"]);
const report = fs.readFileSync(path.join(projectRoot, ".project-memory", "reports", "activity-id-perf-report.md"), "utf8");
assert.match(report, /\| Score \| Priority \| Rule \| Evidence \| Recommended Fix \|/);
assert.match(report, /large_response_payload/);
assert.doesNotMatch(report, /unbounded_search/);
assert.doesNotMatch(contextPack, /unbounded_search/);
assert.match(report, /List responses return only fields required by the consumer/);

run(["repolens-graph/scripts/index_project.mjs", boundedProjectRoot]);
const boundedGraphPath = path.join(boundedProjectRoot, ".project-memory", "graph", "code_graph.json");
const boundedGraph = JSON.parse(fs.readFileSync(boundedGraphPath, "utf8"));
const boundedEndpoint = boundedGraph.nodes.find((node) => node.id === endpointId);
assert.ok(boundedEndpoint, "bounded fixture should still merge frontend and backend API endpoint references");
assert.deepEqual(new Set(boundedEndpoint.meta.sources), new Set(["fetch", "fastapi"]));
assert.ok(boundedEndpoint.meta.rawUrls.includes("/api/activities/${id}/works?${params.toString()}"));
assert.ok(boundedEndpoint.meta.rawUrls.includes("/api/activities/{activity_id}/works"));

const boundedSignalsPath = path.join(boundedProjectRoot, ".project-memory", "performance_signals.json");
const boundedSignals = JSON.parse(fs.readFileSync(boundedSignalsPath, "utf8"));
const boundedBackendRules = new Set(
  boundedSignals
    .filter((signal) => signal.file === "backend/main.py")
    .map((signal) => signal.rule),
);
assert.ok(!boundedBackendRules.has("missing_pagination"), "bounded fixture should not report missing pagination");
assert.ok(!boundedBackendRules.has("large_response_payload"), "bounded fixture should not report large response payload");
assert.ok(!boundedBackendRules.has("n_plus_one_query"), "bounded fixture should not report N+1 query risk");

console.log("graph phase-one tests passed");
