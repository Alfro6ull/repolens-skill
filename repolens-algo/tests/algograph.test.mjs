#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const fixtureRoot = path.join(repoRoot, "repolens-graph", "tests", "fixtures", "phase-one");
const algorithmFixtureRoot = path.join(repoRoot, "repolens-graph", "tests", "fixtures", "algorithm-catalog");
const noAlgorithmFixtureRoot = path.join(repoRoot, "repolens-graph", "tests", "fixtures", "no-algorithm-signal");
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

run("repolens-graph/scripts/index_project.mjs", [projectRoot]);
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
const algorithmIndex = JSON.parse(fs.readFileSync(path.join(repoRoot, "repolens-algo", "knowledge", "algorithm_index.json"), "utf8"));
const knownAlgorithms = new Set(algorithmIndex.algorithms.map((item) => item.id));
const firstMatch = matches.matches[0];
const basicAlgorithmDebtCards = [
  "indexed_lookup",
  "rule_table",
  "batch_loading",
  "bounded_top_k",
  "explainable_scoring",
];

function assertMatchesUseLocalCards(matchGroup, reportText, label) {
  for (const match of matchGroup.matches) {
    assert.ok(knownAlgorithms.has(match.algorithm_id), `${label} should only use local algorithm cards`);
    assert.ok(reportText.includes(`\`${match.algorithm_id}\``), `${label} report should show local algorithm id ${match.algorithm_id}`);
  }
}

assert.equal(profiles.profiles[0].target, "/activity/:id");
assert.equal(profiles.profiles[0].algorithm_opportunity, true);
assert.ok(["content_based_recommendation", "hybrid_search_rag"].includes(firstMatch.top_algorithm));
for (const algorithmId of basicAlgorithmDebtCards) {
  assert.ok(knownAlgorithms.has(algorithmId), `algorithm index should include ${algorithmId}`);
}
assertMatchesUseLocalCards(firstMatch, report, "phase-one");
assert.match(report, /# Algorithm Opportunity Report: \/activity\/:id/);
assert.match(report, /Data To Add Next/);
assert.match(report, /Not Recommended Now/);
assert.match(report, /Why This Algorithm Now/);
assert.match(report, /What Data Blocks Heavier Algorithms/);
assert.match(report, /Content-Based Recommendation|Hybrid Search \/ Lightweight RAG/);

run("repolens-graph/scripts/index_project.mjs", [algorithmProjectRoot]);
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
const discoverMatches = algorithmMatches.matches[0];

assert.equal(discoverProfile.algorithm_opportunity, true);
assert.ok(discoverProfile.evidence.graph_facts.data_entities.includes("item"));
assert.ok(discoverProfile.evidence.graph_facts.data_entities.includes("query"));
assert.ok(discoverProfile.evidence.graph_facts.data_entities.includes("tag"));
assert.ok(discoverProfile.evidence.graph_facts.ranking_signals.includes("explicit_score"));
assert.ok(discoverProfile.evidence.graph_facts.ranking_signals.includes("text_similarity"));
assert.ok(discoverProfile.task_signals.includes("bounded_top_k"));
assert.ok(discoverProfile.task_signals.includes("explainable_scoring"));
assert.ok(discoverProfile.task_signals.includes("indexed_lookup"));
assert.ok(discoverProfile.task_signals.includes("search"));
assert.ok(discoverProfile.task_signals.includes("ranking"));
assert.ok(!discoverProfile.task_signals.includes("personalization"));
assert.ok(!discoverProfile.objectives.includes("personalize_candidates"));
assert.doesNotMatch(JSON.stringify(discoverProfile.evidence.risk_signals), /large_list_render/);
assert.ok(["content_based_recommendation", "hybrid_search_rag"].includes(discoverMatches.top_algorithm));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "content_based_recommendation" && match.status === "recommended_now"));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "hybrid_search_rag" && match.status === "recommended_now"));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "bounded_top_k" && match.status === "recommended_now"));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "explainable_scoring" && match.status === "recommended_now"));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "indexed_lookup" && match.status === "recommended_now"));
assert.ok(discoverMatches.matches.some((match) => match.algorithm_id === "batch_loading" && match.status === "blocked_now"));
const semanticCard = algorithmIndex.algorithms.find((algorithm) => algorithm.id === "semantic_retrieval");
const semanticMatch = discoverMatches.matches.find((match) => match.algorithm_id === "semantic_retrieval");
assert.ok(semanticCard.required_signals?.length > 0, "semantic retrieval should declare card-level signal requirements");
assert.equal(semanticMatch.status, "candidate_later");
assert.ok(semanticMatch.warnings.some((warning) => warning.includes("missing card signal")));
const ltrCard = algorithmIndex.algorithms.find((algorithm) => algorithm.id === "learning_to_rank");
const ltrMatch = discoverMatches.matches.find((match) => match.algorithm_id === "learning_to_rank");
assert.ok(ltrCard.required_signals?.length > 0, "learning to rank should declare card-level signal requirements");
assert.equal(ltrMatch.status, "candidate_later");
assert.ok(ltrMatch.warnings.some((warning) => warning.includes("missing card signal: exposure logs")));
const banditCard = algorithmIndex.algorithms.find((algorithm) => algorithm.id === "contextual_bandit");
const banditMatch = discoverMatches.matches.find((match) => match.algorithm_id === "contextual_bandit");
assert.ok(banditCard.required_signals?.length > 0, "contextual bandit should declare card-level signal requirements");
assert.equal(banditMatch.status, "blocked_now");
assert.ok(banditMatch.warnings.some((warning) => warning.includes("missing card signal: click or feedback logs")));
assert.ok(discoverMatches.matches.some((match) => match.status === "candidate_later"));
assert.ok(discoverMatches.matches.some((match) => match.status === "blocked_now"));
assertMatchesUseLocalCards(discoverMatches, algorithmReport, "algorithm demo");
assert.match(algorithmReport, /Knowledge Graph Signals/);
assert.match(algorithmReport, /Why This Algorithm Now/);
assert.match(algorithmReport, /What Data Blocks Heavier Algorithms/);
assert.match(algorithmReport, /behavior_log_missing/);
assert.doesNotMatch(algorithmReport, /large_list_render/);

run("repolens-graph/scripts/index_project.mjs", [noAlgorithmProjectRoot]);
run("repolens-algo/scripts/build_block_profiles.mjs", [noAlgorithmProjectRoot, "/status"]);
run("repolens-algo/scripts/retrieve_algorithms.mjs", [noAlgorithmProjectRoot, "/status"]);
run("repolens-algo/scripts/generate_algo_report.mjs", [noAlgorithmProjectRoot, "/status"]);

const noAlgorithmProfiles = JSON.parse(fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "block_profiles.json"), "utf8"));
const noAlgorithmMatches = JSON.parse(fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "algorithm_matches.json"), "utf8"));
const noAlgorithmReport = fs.readFileSync(path.join(noAlgorithmProjectRoot, ".project-memory", "algo", "reports", "status-algo-report.md"), "utf8");

assert.equal(noAlgorithmProfiles.profiles[0].algorithm_opportunity, false);
assert.equal(noAlgorithmMatches.matches[0].top_algorithm, null);
assert.ok(noAlgorithmMatches.matches[0].matches.every((match) => match.status === "not_applicable"));
assertMatchesUseLocalCards(noAlgorithmMatches.matches[0], noAlgorithmReport, "no-algorithm");
assert.match(noAlgorithmReport, /does not expose enough decision, lookup, rule, ranking, retrieval, or personalization evidence/);

console.log("algograph tests passed");
