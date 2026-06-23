#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, "..");

function parseArgs(argv) {
  const args = [...argv];
  const root = path.resolve(args[0] && !args[0].startsWith("--") ? args.shift() : ".");
  const target = args[0] && !args[0].startsWith("--") ? args.shift() : "";
  const options = { root, target, out: null };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out") {
      options.out = args[i + 1];
      i += 1;
    }
  }

  if (!options.target) {
    throw new Error("Usage: node retrieve_algorithms.mjs <repo-root> <route|file|component|api|keyword> [--out path]");
  }

  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function intersection(left, right) {
  const rightSet = new Set(right.map(normalize));
  return left.filter((value) => rightSet.has(normalize(value)));
}

function fitLabel(score) {
  if (score >= 18) return "strong";
  if (score >= 10) return "medium";
  return "weak";
}

function scoreAlgorithm(profile, algorithm) {
  const profileSignals = [
    ...profile.task_signals,
    ...profile.data_shapes,
    ...profile.constraints,
    ...profile.objectives,
    ...profile.current_logic,
    ...profile.actions,
  ];
  const taskMatches = intersection(algorithm.tasks || [], profile.task_signals || []);
  const dataMatches = intersection(algorithm.data_required || [], profile.data_shapes || []);
  const objectiveMatches = intersection(algorithm.objectives || [], profile.objectives || []);
  const goodForMatches = intersection(algorithm.good_for || [], profileSignals);
  const badForMatches = intersection(algorithm.bad_for || [], profile.constraints || []);
  const missingData = (algorithm.data_required || []).filter((item) => !intersection([item], profile.data_shapes || []).length);
  const evidenceStrength = Math.min(4, Math.ceil((profile.evidence?.code_lines?.length || 0) / 4));
  const score =
    taskMatches.length * 4 +
    dataMatches.length * 3 +
    objectiveMatches.length * 2 +
    goodForMatches.length * 2 +
    evidenceStrength -
    badForMatches.length * 5;

  const warnings = [
    ...badForMatches.map((item) => `profile has constraint: ${item}`),
    ...missingData.map((item) => `missing required data: ${item}`),
  ];
  const reasons = [
    ...taskMatches.map((item) => `matched task: ${item}`),
    ...dataMatches.map((item) => `matched data: ${item}`),
    ...objectiveMatches.map((item) => `matched objective: ${item}`),
    ...goodForMatches.map((item) => `matched fit condition: ${item}`),
  ];

  return {
    algorithm_id: algorithm.id,
    algorithm_name: algorithm.name,
    score,
    fit: fitLabel(score),
    reasons,
    warnings,
    matched: {
      tasks: taskMatches,
      data_shapes: dataMatches,
      objectives: objectiveMatches,
      constraints: goodForMatches,
      anti_patterns: badForMatches,
    },
    missing_data: missingData,
    metrics: algorithm.metrics || [],
    first_version: algorithm.first_version,
    complexity: algorithm.complexity,
    explainability: algorithm.explainability,
    card: algorithm.card,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const profilesPath = path.join(options.root, ".project-memory", "algo", "block_profiles.json");
  const indexPath = path.join(skillRoot, "knowledge", "algorithm_index.json");
  const profiles = await readJson(profilesPath);
  const index = await readJson(indexPath);
  const matches = profiles.profiles.map((profile) => {
    const scored = index.algorithms
      .map((algorithm) => scoreAlgorithm(profile, algorithm))
      .sort((a, b) => b.score - a.score || a.algorithm_name.localeCompare(b.algorithm_name));
    return {
      block_id: profile.block_id,
      target: profile.target,
      top_algorithm: profile.algorithm_opportunity ? scored[0]?.algorithm_id || null : null,
      matches: scored,
    };
  });

  const output = {
    generated_at: new Date().toISOString(),
    target: options.target,
    algorithm_index: "repolens-algo/knowledge/algorithm_index.json",
    matches,
  };
  const outPath = options.out
    ? path.resolve(options.root, options.out)
    : path.join(options.root, ".project-memory", "algo", "algorithm_matches.json");
  await writeJson(outPath, output);
  console.log(`Algorithm matches written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
