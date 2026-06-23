#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const fixtureRoot = path.join(repoRoot, "repolens-perf", "tests", "fixtures", "phase-one");
const algorithmFixtureRoot = path.join(repoRoot, "repolens-perf", "tests", "fixtures", "algorithm-catalog");
const noAlgorithmFixtureRoot = path.join(repoRoot, "repolens-perf", "tests", "fixtures", "no-algorithm-signal");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-algograph-"));
const projectRoot = path.join(tempRoot, "project");
const algorithmProjectRoot = path.join(tempRoot, "algorithm-project");
const noAlgorithmProjectRoot = path.join(tempRoot, "no-algorithm-project");

fs.cpSync(fixtureRoot, projectRoot, { recursive: true });
fs.cpSync(algorithmFixtureRoot, algorithmProjectRoot, { recursive: true });
fs.cpSync(noAlgorithmFixtureRoot, noAlgorithmProjectRoot, { recursive: true });

function run(script, args = []) {
  return execFileSync(process.execPath, [path.join(repoRoot, script), ...args], {
    cwd: tempRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

run("repolens-perf/scripts/index_project.mjs", [projectRoot]);
run("repolens-algo/scripts/build_block_profiles.mjs", [projectRoot, "/activity/:id"]);
run("repolens-algo/scripts/retrieve_algorithms.mjs", [projectRoot, "/activity/:id"]);
run("repolens-algo/scripts/generate_algo_report.mjs", [projectRoot, "/activity/:id"]);

const algoRoot = path.join(projectRoot, ".project-memory", "algo");
const profilesPath = path.join(algoRoot, "block_profiles.json");
const matchesPath = path.join(algoRoot, "algorithm_matches.json");
const reportPath = path.join(algoRoot, "reports", "activity-id-algo-report.md");

assert.ok(fs.existsSync(profilesPath), "AlgoGraph should write block_profiles.json");
assert.ok(fs.existsSync(matchesPath), "AlgoGraph should write algorithm_matches.json");
assert.ok(fs.existsSync(reportPath), "AlgoGraph should write an algorithm opportunity report");

const profiles = JSON.parse(fs.readFileSync(profilesPath, "utf8"));
const matches = JSON.parse(fs.readFileSync(matchesPath, "utf8"));
const report = fs.readFileSync(reportPath, "utf8");
const knownAlgorithms = new Set(JSON.parse(fs.readFileSync(path.join(repoRoot, "repolens-algo", "knowledge", "algorithm_index.json"), "utf8")).algorithms.map((item) => item.id));
const firstMatch = matches.matches[0];

assert.equal(profiles.profiles[0].target, "/activity/:id");
assert.equal(profiles.profiles[0].algorithm_opportunity, true);
assert.ok(["content_based_recommendation", "hybrid_search_rag"].includes(firstMatch.top_algorithm));
assert.ok(firstMatch.matches.every((match) => knownAlgorithms.has(match.algorithm_id)), "all matches should come from local algorithm cards");
assert.match(report, /# Algorithm Opportunity Report: \/activity\/:id/);
assert.match(report, /Data To Add Next/);
assert.match(report, /Not Recommended Now/);
assert.match(report, /Content-Based Recommendation|Hybrid Search \/ Lightweight RAG/);

run("repolens-perf/scripts/index_project.mjs", [algorithmProjectRoot]);
run("repolens-algo/scripts/build_block_profiles.mjs", [algorithmProjectRoot, "/discover"]);
run("repolens-algo/scripts/retrieve_algorithms.mjs", [algorithmProjectRoot, "/discover"]);
run("repolens-algo/scripts/generate_algo_report.mjs", [algorithmProjectRoot, "/discover"]);

const algorithmGraph = JSON.parse(fs.readFileSync(path.join(algorithmProjectRoot, ".project-memory", "graph", "code_graph.json"), "utf8"));
const algorithmNodeTypes = new Set(algorithmGraph.nodes.map((node) => node.type));
assert.ok(algorithmNodeTypes.has("DataEntity"), "algorithm demo graph should expose data entities");
assert.ok(algorithmNodeTypes.has("RankingSignal"), "algorithm demo graph should expose ranking signals");
assert.ok(algorithmNodeTypes.has("AlgorithmOpportunity"), "algorithm demo graph should expose algorithm opportunities");

const algorithmProfiles = JSON.parse(fs.readFileSync(path.join(algorithmProjectRoot, ".project-memory", "algo", "block_profiles.json"), "utf8"));
const algorithmMatches = JSON.parse(fs.readFileSync(path.join(algorithmProjectRoot, ".project-memory", "algo", "algorithm_matches.json"), "utf8"));
const algorithmReport = fs.readFileSync(path.join(algorithmProjectRoot, ".project-memory", "algo", "reports", "discover-algo-report.md"), "utf8");
const discoverProfile = algorithmProfiles.profiles[0];

assert.equal(discoverProfile.algorithm_opportunity, true);
assert.ok(discoverProfile.evidence.graph_facts.data_entities.includes("item"));
assert.ok(discoverProfile.evidence.graph_facts.data_entities.includes("query"));
assert.ok(discoverProfile.evidence.graph_facts.ranking_signals.includes("explicit_score"));
assert.ok(discoverProfile.task_signals.includes("search"));
assert.ok(discoverProfile.task_signals.includes("ranking"));
assert.equal(algorithmMatches.matches[0].top_algorithm, algorithmMatches.matches[0].matches[0].algorithm_id);
assert.ok(algorithmMatches.matches[0].matches.every((match) => knownAlgorithms.has(match.algorithm_id)), "algorithm demo matches should come from local algorithm cards");
assert.match(algorithmReport, /Knowledge Graph Signals/);
assert.match(algorithmReport, /behavior_log_missing/);

run("repolens-perf/scripts/index_project.mjs", [noAlgorithmProjectRoot]);
run("repolens-algo/scripts/build_block_profiles.mjs", [noAlgorithmProjectRoot, "/status"]);
run("repolens-algo/scripts/retrieve_algorithms.mjs", [noAlgorithmProjectRoot, "/status"]);
run("repolens-algo/scripts/generate_algo_report.mjs", [noAlgorithmProjectRoot, "/status"]);

const noAlgorithmProfiles = JSON.parse(fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "block_profiles.json"), "utf8"));
const noAlgorithmMatches = JSON.parse(fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "algorithm_matches.json"), "utf8"));
const noAlgorithmReport = fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "reports", "status-algo-report.md"), "utf8");

assert.equal(noAlgorithmProfiles.profiles[0].algorithm_opportunity, false);
assert.equal(noAlgorithmMatches.matches[0].top_algorithm, null);
assert.match(noAlgorithmReport, /does not expose enough item, query, ranking, retrieval, or personalization evidence/);

console.log("algograph tests passed");
