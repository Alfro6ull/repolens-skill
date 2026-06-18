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
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "repolens-algograph-"));
const projectRoot = path.join(tempRoot, "project");

fs.cpSync(fixtureRoot, projectRoot, { recursive: true });

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

console.log("algograph tests passed");
