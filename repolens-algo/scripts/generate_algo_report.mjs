#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { resolveSafeOutFile } from "./lib/path_utils.mjs";

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
      return `| ${match.score} | ${match.status || "unknown"} | ${match.fit} | \`${match.algorithm_id}\` | ${match.algorithm_name} | ${why} | ${warnings} |`;
    })
    .join("\n");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function availableFieldSummary(profile) {
  const evidenceText = (profile.evidence?.code_lines || []).map((item) => item.text).join("\n");
  const fieldMatches = [
    ...evidenceText.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g),
    ...evidenceText.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*[).])/g),
  ]
    .map((match) => match[1])
    .filter((field) => !["return", "const", "let", "var", "function", "def", "if", "for", "map", "sort", "filter"].includes(field));
  const candidates = unique([
    ...(profile.data_shapes || []),
    ...(profile.entities || []),
    ...(profile.actions || []),
    ...fieldMatches,
  ]).slice(0, 8);
  return candidates.length ? candidates.join(", ") : "fields already visible in the Block Profile";
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

function graphFacts(profile) {
  return profile.evidence?.graph_facts || {
    data_entities: [],
    user_actions: [],
    ranking_signals: [],
    algorithm_opportunities: [],
  };
}

function graphFactLines(profile) {
  const facts = graphFacts(profile);
  return [
    `- Data entities: ${facts.data_entities.length ? facts.data_entities.join(", ") : "none detected"}`,
    `- User actions: ${facts.user_actions.length ? facts.user_actions.join(", ") : "none detected"}`,
    `- Ranking signals: ${facts.ranking_signals.length ? facts.ranking_signals.join(", ") : "none detected"}`,
    `- Algorithm opportunities: ${facts.algorithm_opportunities.length ? facts.algorithm_opportunities.join(", ") : "none detected"}`,
  ];
}

function topCurrentMatch(matches, preferredAlgorithmId = null) {
  if (preferredAlgorithmId) {
    const preferred = matches.find((match) => match.algorithm_id === preferredAlgorithmId);
    if (preferred) return preferred;
  }
  return matches.find((match) => match.status === "recommended_now") || matches[0];
}

function uniqueMatches(matches) {
  const seen = new Set();
  return matches.filter((match) => {
    if (!match || seen.has(match.algorithm_id)) return false;
    seen.add(match.algorithm_id);
    return true;
  });
}

function whyNowLines(profile, top) {
  const facts = graphFacts(profile);
  const reasonLines = top.reasons.slice(0, 4).map((reason) => `- ${reason}`);
  return [
    `- Current route: ${top.algorithm_name} (\`${top.algorithm_id}\`, ${top.status}).`,
    `- Graph evidence: data entities [${facts.data_entities.join(", ") || "none"}], actions [${facts.user_actions.join(", ") || "none"}], ranking signals [${facts.ranking_signals.join(", ") || "none"}].`,
    ...(reasonLines.length ? reasonLines : ["- The match is based on the local algorithm card and the current Block Profile."]),
  ];
}

function blockingLines(matches) {
  const blockers = unique(
    matches
      .filter((match) => ["candidate_later", "blocked_now"].includes(match.status))
      .flatMap((match) => [
        ...(match.missing_data || []).map((item) => `${match.status}: ${match.algorithm_name} needs ${item}`),
        ...(match.warnings || []).map((warning) => `${match.status}: ${match.algorithm_name} - ${warning}`),
      ]),
  ).slice(0, 10);

  return blockers.length ? blockers.map((item) => `- ${item}`) : ["- none detected"];
}

function roadmapLines(top, matches) {
  const laterMatches = matches.filter((match) => match.status === "candidate_later");
  const currentMatches = matches.filter((match) => match.status === "recommended_now");
  const roadmapMatches = uniqueMatches([top, ...currentMatches, ...laterMatches]).slice(0, 3);
  const lines = [
    "### Phase 1: Rule baseline plus bounded ranking",
    "Keep the current score, tags, and keyword filters as the measurable baseline. Log enough events to compare later algorithms.",
    "",
  ];

  roadmapMatches.forEach((match, index) => {
    const phase = index + 2;
    const suffix = match.status === "candidate_later" ? " after data improves" : "";
    lines.push(`### Phase ${phase}: ${match.algorithm_name}${suffix}`);
    lines.push(match.first_version);
    lines.push("");
  });

  return lines;
}

function noOpportunityReport(target, profile, matchGroup) {
  const matches = matchGroup.matches;
  return [
    `# Algorithm Opportunity Report: ${target}`,
    "",
    "## Executive Summary",
    `RepoLens built a Block Profile for ${target}, but the graph neighborhood does not expose enough decision, lookup, rule, ranking, retrieval, or personalization evidence to recommend an algorithm implementation now.`,
    "",
    "This is the intended guardrail: AlgoGraph should not turn every module into a recommendation or ranking problem.",
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
    "## Knowledge Graph Signals",
    "",
    ...graphFactLines(profile),
    "",
    "## Diagnostic Algorithm Matches",
    "",
    "| Score | Status | Fit | Algorithm ID | Algorithm | Why Matched | Warnings |",
    "|---:|---|---|---|---|---|---|",
    tableRows(matches),
    "",
    "## Not Recommended Now",
    "",
    "- Do not implement a recommendation, ranking, search, retrieval, personalization, or algorithm-debt refactor for this block until the graph shows a real decision boundary.",
    "- Add item/query/ranking/user-action evidence, or visible lookup/rule/batch-loading evidence, first if this module is meant to become an algorithmic surface.",
    "",
    "## Source Artifacts",
    "",
    "- `.project-memory/algo/block_profiles.json`",
    "- `.project-memory/algo/algorithm_matches.json`",
    "- `repolens-algo/knowledge/algorithm_index.json`",
  ].join("\n");
}

function reportMarkdown(target, profile, matchGroup) {
  const matches = matchGroup.matches;
  if (!profile.algorithm_opportunity) return noOpportunityReport(target, profile, matchGroup);

  const top = topCurrentMatch(matches, matchGroup.top_algorithm);
  const lines = [
    `# Algorithm Opportunity Report: ${target}`,
    "",
    "## Executive Summary",
    `RepoLens built a Block Profile for ${target} and matched it against local algorithm cards. The strongest current route is **${top.algorithm_name}** because it matches graph-visible entities, actions, and ranking signals while keeping the first version simple.`,
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
    "## Knowledge Graph Signals",
    "",
    ...graphFactLines(profile),
    "",
    "## Why This Algorithm Now",
    "",
    ...whyNowLines(profile, top),
    "",
    "## Code Evidence",
    "",
    "| File | Line | Evidence |",
    "|---|---:|---|",
    ...profile.evidence.code_lines.slice(0, 6).map((item) => `| ${item.file} | ${item.line} | ${compact(item.text, 110)} |`),
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
    "| Score | Status | Fit | Algorithm ID | Algorithm | Why Matched | Warnings |",
    "|---:|---|---|---|---|---|---|",
    tableRows(matches),
    "",
    "## What Data Blocks Heavier Algorithms",
    "",
    ...blockingLines(matches),
    "",
    "## Recommended Algorithm Roadmap",
    "",
    ...roadmapLines(top, matches),
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
    `Use the RepoLens Algorithm Opportunity Report for ${target}. Implement a first-version algorithm route without adding external services. Start with a bounded rule baseline and ${top.algorithm_name}. Use available module evidence such as ${availableFieldSummary(profile)}. Add a small telemetry contract for user_id, item_id, action_type, timestamp, exposure_id, position, and source_page. Do not implement deep recommendation models, reinforcement learning, or real-time LLM reranking in this phase. Keep the ranking explainable and add tests for deterministic ordering and missing-data fallback.`,
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
    ? resolveSafeOutFile(options.root, options.out)
    : path.join(options.root, ".project-memory", "algo", "reports", `${safeSlug(options.target)}-algo-report.md`);
  await writeText(outPath, markdown);
  console.log(`Algorithm opportunity report written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
