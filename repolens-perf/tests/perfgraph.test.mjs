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
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-perfgraph-"));
const projectRoot = path.join(tempRoot, "project");

fs.cpSync(fixtureRoot, projectRoot, { recursive: true });

function run(args) {
  return execFileSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

run(["repolens-perf/scripts/index_project.mjs", projectRoot]);

const graphPath = path.join(projectRoot, ".project-memory", "graph", "code_graph.json");
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const endpointId = "APIEndpoint:GET:/api/activities/:param/works";
const endpoint = graph.nodes.find((node) => node.id === endpointId);
assert.ok(endpoint, "frontend template and backend path should share one canonical API endpoint");
assert.deepEqual(new Set(endpoint.meta.sources), new Set(["fetch", "fastapi"]));
assert.ok(endpoint.meta.rawUrls.includes("/api/activities/${id}/works"));
assert.ok(endpoint.meta.rawUrls.includes("/api/activities/{activity_id}/works"));

const endpointEdges = graph.edges.filter((edge) => edge.target === endpointId);
assert.ok(endpointEdges.some((edge) => edge.type === "requests"), "canonical endpoint should retain frontend request edge");
assert.ok(endpointEdges.some((edge) => edge.type === "defines"), "canonical endpoint should retain backend define edge");

const metricsPath = path.join(projectRoot, ".project-memory", "graph_metrics.json");
assert.ok(fs.existsSync(metricsPath), "index should write graph metrics");

run(["repolens-perf/scripts/build_context_pack.mjs", projectRoot, "/activity/:id"]);
const contextPack = fs.readFileSync(path.join(projectRoot, ".project-memory", "context-packs", "activity-id.md"), "utf8");
assert.match(contextPack, /\| Score \| Distance \| Type \| Node \| Why Included \|/);
assert.match(contextPack, /GET \/api\/activities\/:param\/works/);
assert.match(contextPack, /large_response_payload|n_plus_one_query|missing_pagination/);

run(["repolens-perf/scripts/perf_report.mjs", projectRoot, "/activity/:id"]);
const report = fs.readFileSync(path.join(projectRoot, ".project-memory", "reports", "activity-id-perf-report.md"), "utf8");
assert.match(report, /\| Score \| Priority \| Rule \| Evidence \| Recommended Fix \|/);
assert.match(report, /large_response_payload/);
assert.doesNotMatch(report, /unbounded_search/);
assert.doesNotMatch(contextPack, /unbounded_search/);
assert.match(report, /List responses return only fields required by the consumer/);

console.log("perfgraph phase-one tests passed");
