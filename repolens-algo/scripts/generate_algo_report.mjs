#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

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
    throw new Error("Usage: node generate_algo_report.mjs <repo-root> <route|file|component|api|keyword> [--out path]");
  }

  return options;
}

function safeSlug(value) {
  return String(value || "target")
    .replace(/^\/+/, "")
    .replace(/[:{}]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "target";
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeText(file, text) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${text.trimEnd()}\n`, "utf8");
}

function list(values, fallback = "none detected", indent = "") {
  if (!values || values.length === 0) return `${indent}- ${fallback}`;
  return values.map((value) => `${indent}- ${value}`).join("\n");
}

function compact(value, max = 90) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function tableRows(matches) {
  return matches
    .map((match) => {
      const why = compact(match.reasons.slice(0, 3).join("; ") || "low direct evidence");
      const warnings = compact(match.warnings.slice(0, 2).join("; ") || "none");
      return `| ${match.score} | ${match.fit} | ${match.algorithm_name} | ${why} | ${warnings} |`;
    })
    .join("\n");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function dataToAdd(matches) {
  const fromMatches = matches.flatMap((match) => match.missing_data || []);
  return unique([
    ...fromMatches,
    "user_id",
    "item_id",
    "action_type",
    "timestamp",
    "exposure_id",
    "position",
    "source_page",
  ]);
}

function reportMarkdown(target, profile, matchGroup) {
  const matches = matchGroup.matches;
  const top = matches[0];
  const second = matches[1];
  const third = matches[2];
  const lines = [
    `# Algorithm Opportunity Report: ${target}`,
    "",
    "## Executive Summary",
    `RepoLens built a Block Profile for ${target} and matched it against local algorithm cards. The strongest current route is **${top.algorithm_name}** because it matches the module task signals and available code evidence while keeping the first version simple.`,
    "",
    "This is not a generic code review. The report translates code evidence into an algorithm opportunity boundary, then recommends only algorithms present in `repolens-algo/knowledge/algorithm_index.json`.",
    "",
    "## Module Identification",
    "",
    `- Block: ${profile.block_id}`,
    `- Confidence: ${profile.confidence}`,
    "- Routes:",
    list(profile.evidence.routes, "none detected", "  "),
    "- Components:",
    list(profile.evidence.components, "none detected", "  "),
    "- APIs:",
    list(profile.evidence.apis, "none detected", "  "),
    "",
    "## Code Evidence",
    "",
    "| File | Line | Evidence |",
    "|---|---:|---|",
    ...profile.evidence.code_lines.slice(0, 10).map((item) => `| ${item.file} | ${item.line} | ${compact(item.text, 110)} |`),
    "",
    "## Block Profile",
    "",
    "- Entities:",
    list(profile.entities, "none detected", "  "),
    "- Actions:",
    list(profile.actions, "none detected", "  "),
    "- Data shapes:",
    list(profile.data_shapes, "none detected", "  "),
    "- Current logic:",
    list(profile.current_logic, "none detected", "  "),
    "- Task signals:",
    list(profile.task_signals, "none detected", "  "),
    "- Constraints:",
    list(profile.constraints, "none detected", "  "),
    "",
    "## Algorithm Matches",
    "",
    "| Score | Fit | Algorithm | Why Matched | Warnings |",
    "|---:|---|---|---|---|",
    tableRows(matches),
    "",
    "## Recommended Algorithm Roadmap",
    "",
    "### Phase 1: Rule baseline plus bounded ranking",
    "Use the current score, tags, and keyword filters as an explicit baseline. Add stable limits and log enough events to measure quality.",
    "",
    `### Phase 2: ${top.algorithm_name}`,
    top.first_version,
    "",
    `### Phase 3: ${second.algorithm_name}`,
    second.first_version,
    "",
    `### Phase 4: ${third.algorithm_name}`,
    third.first_version,
    "",
    "## Not Recommended Now",
    "",
    "- Deep recommendation models: the current evidence points to small data and missing behavior logs.",
    "- Reinforcement learning: there is no online feedback loop or reward definition in the code evidence.",
    "- Real-time LLM reranking: cost and latency are not justified before a baseline ranking and query log exist.",
    ...matches.flatMap((match) => match.warnings.slice(0, 2).map((warning) => `- ${match.algorithm_name}: ${warning}.`)),
    "",
    "## Data To Add Next",
    "",
    list(dataToAdd(matches)),
    "",
    "## Coding Agent Prompt",
    "",
    "```text",
    `Use the RepoLens Algorithm Opportunity Report for ${target}. Implement a first-version algorithm route without adding external services. Start with a bounded rule baseline and ${top.algorithm_name}. Use existing fields such as title, tags, score, activity id, and work id. Add a small telemetry contract for user_id, item_id, action_type, timestamp, exposure_id, position, and source_page. Do not implement deep recommendation models, reinforcement learning, or real-time LLM reranking in this phase. Keep the ranking explainable and add tests for deterministic ordering and missing-data fallback.`,
    "```",
    "",
    "## Source Artifacts",
    "",
    "- `.project-memory/algo/block_profiles.json`",
    "- `.project-memory/algo/algorithm_matches.json`",
    "- `repolens-algo/knowledge/algorithm_index.json`",
  ];

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const profiles = await readJson(path.join(options.root, ".project-memory", "algo", "block_profiles.json"));
  const matches = await readJson(path.join(options.root, ".project-memory", "algo", "algorithm_matches.json"));
  const profile = profiles.profiles.find((item) => item.target === options.target) || profiles.profiles[0];
  const matchGroup = matches.matches.find((item) => item.block_id === profile.block_id) || matches.matches[0];
  const markdown = reportMarkdown(options.target, profile, matchGroup);
  const outPath = options.out
    ? path.resolve(options.root, options.out)
    : path.join(options.root, ".project-memory", "algo", "reports", `${safeSlug(options.target)}-algo-report.md`);
  await writeText(outPath, markdown);
  console.log(`Algorithm opportunity report written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
