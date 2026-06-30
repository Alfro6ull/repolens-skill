#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { buildContextGraph, contextGraphToTrace, readJson, writeContextGraph } from "./lib/context_graph.mjs";
import { resolveSafeOutFile } from "./lib/path_utils.mjs";

const RULE_ORDER = {
  P1: 1,
  P2: 2,
  P3: 3,
};

const PRIORITY_SCORE = {
  P1: 80,
  P2: 50,
  P3: 20,
};

const ACCEPTANCE_CRITERIA = {
  large_list_render: "The list render is bounded by pagination, virtualization, server-side slicing, or an explicit item cap under large fixtures.",
  duplicated_request: "Entering the same route does not issue duplicate requests for the same entity; shared data is cached, lifted, or merged.",
  rich_text_reparse: "The same markdown/HTML input is not reparsed during unrelated state changes.",
  image_without_lazy: "Non-critical list images use lazy loading and stable dimensions to avoid unnecessary bandwidth and layout shift.",
  missing_pagination: "The list endpoint requires a bounded limit, cursor, page, or offset contract and rejects unbounded list reads.",
  n_plus_one_query: "Related records loaded inside a loop are batched, joined, prefetched, or cached at request scope.",
  expensive_render_compute: "Sort/filter work is memoized, precomputed, or moved behind a bounded API/query contract.",
  heavy_dependency_import: "Heavy dependencies are loaded by subpath or dynamic import when they are not required for the initial route.",
  large_response_payload: "List responses return only fields required by the consumer, with detail-only fields moved behind detail endpoints or pagination.",
  sync_blocking_io: "Request handlers do not perform blocking file, network, sleep, or subprocess work on the hot path.",
  unbounded_search: "Search endpoints require a bounded limit or cursor and use indexed/ranked constraints rather than unbounded scans.",
};

function parseArgs(argv) {
  const args = [...argv];
  const root = path.resolve(args[0] && !args[0].startsWith("--") ? args.shift() : ".");
  const target = args[0] && !args[0].startsWith("--") ? args.shift() : "";
  const options = { root, target, hops: 4, out: null };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--hops") {
      options.hops = Number(args[i + 1] || 2);
      i += 1;
    } else if (args[i] === "--out") {
      options.out = args[i + 1];
      i += 1;
    }
  }

  if (!options.target) {
    throw new Error("Usage: node perf_report.mjs <repo-root> <route|file|component|api|keyword> [--out report.md]");
  }

  return options;
}

function collectModuleFacts(trace, starts) {
  const nodeById = new Map(trace.nodes.map((node) => [node.id, node]));
  const routeStarts = starts.filter((node) => node.type === "Route");

  if (routeStarts.length > 0) {
    const routeIds = new Set(routeStarts.map((node) => node.id));
    const componentIds = new Set();
    const queue = [...routeIds];

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      for (const edge of trace.edges) {
        if (edge.source !== current || edge.type !== "renders") continue;
        const target = nodeById.get(edge.target);
        if (target?.type === "ReactComponent" && !componentIds.has(target.id)) {
          componentIds.add(target.id);
          queue.push(target.id);
        }
      }
    }

    const filePaths = new Set();
    for (const route of routeStarts) {
      if (route.meta?.file) filePaths.add(route.meta.file);
    }
    for (const componentId of componentIds) {
      const component = nodeById.get(componentId);
      if (component?.meta?.file) filePaths.add(component.meta.file);
    }

    for (const edge of trace.edges) {
      if (edge.type !== "imports") continue;
      const sourceFile = edge.source.replace(/^File:/, "");
      const target = nodeById.get(edge.target);
      if (filePaths.has(sourceFile) && target?.meta?.kind === "api-client") {
        filePaths.add(target.label);
      }
    }

    const apis = trace.nodes.filter((node) => {
      if (node.type !== "APIEndpoint") return false;
      return trace.edges.some((edge) => {
        const sourceFile = edge.source.replace(/^File:/, "");
        return edge.target === node.id && filePaths.has(sourceFile);
      });
    });
    const targetTokens = routeStarts
      .flatMap((route) => String(route.meta?.path || route.label).toLowerCase().split(/[^a-z0-9]+/))
      .filter((token) => token.length > 2 && token !== "api");
    const normalizedTokens = targetTokens.map(normalizeToken);
    const focusedApis = apis.filter((api) => {
      const normalizedLabel = normalizeToken(api.label.toLowerCase());
      return normalizedTokens.some((token) => normalizedLabel.includes(token));
    });
    const selectedApis = focusedApis.length ? focusedApis : apis;

    for (const api of selectedApis) {
      for (const edge of trace.edges) {
        if (edge.type !== "defines" || edge.target !== api.id) continue;
        const sourceFile = edge.source.replace(/^File:/, "");
        if (sourceFile !== edge.source) filePaths.add(sourceFile);
      }
    }

    const risks = sortRisks(
      trace.nodes.filter((node) => node.type === "PerformanceRisk" && riskMatchesFocus(node, filePaths, normalizedTokens, selectedApis)),
      trace,
    );

    return {
      routes: routeStarts,
      files: trace.nodes.filter((node) => node.type === "File" && filePaths.has(node.label)),
      components: trace.nodes.filter((node) => node.type === "ReactComponent" && componentIds.has(node.id)),
      apis: selectedApis,
      risks,
    };
  }

  return {
    routes: trace.nodes.filter((node) => node.type === "Route"),
    files: trace.nodes.filter((node) => node.type === "File"),
    components: trace.nodes.filter((node) => node.type === "ReactComponent"),
    apis: trace.nodes.filter((node) => node.type === "APIEndpoint"),
    risks: sortRisks(
      trace.nodes.filter((node) => node.type === "PerformanceRisk"),
      trace,
    ),
  };
}

function canonicalApiPathForMatch(value) {
  return String(value || "")
    .split("?")[0]
    .replace(/^\w+\s+/, "")
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/\{[^}/]+\}/g, ":param")
    .replace(/\/\d+(?=\/|$)/g, "/:param")
    .replace(/\/:id(?=\/|$)/g, "/:param")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}

function apiMatchesRouteLiteral(api, routeLiteral) {
  const target = canonicalApiPathForMatch(routeLiteral);
  const candidates = [api.meta?.url, api.meta?.rawUrl, ...(api.meta?.rawUrls || []), api.label]
    .map(canonicalApiPathForMatch)
    .filter(Boolean);
  return candidates.includes(target);
}

function riskMatchesSelectedApis(risk, selectedApis) {
  if (!risk.meta?.file?.endsWith(".py") || selectedApis.length === 0) return true;

  const evidenceText = String(risk.meta?.evidence?.text || "");
  const routeLiteral = evidenceText.match(/["'`]([^"'`]*\/api\/[^"'`]+)["'`]/)?.[1];
  if (routeLiteral) return selectedApis.some((api) => apiMatchesRouteLiteral(api, routeLiteral));

  if (risk.meta?.rule === "unbounded_search") {
    return selectedApis.some((api) => /\b(search|query|lookup|find)\b/i.test(`${api.label} ${(api.meta?.rawUrls || []).join(" ")}`));
  }

  return true;
}

function normalizeToken(value) {
  return String(value)
    .replace(/ies\b/g, "y")
    .replace(/s\b/g, "");
}

function riskMatchesFocus(node, filePaths, targetTokens, selectedApis = []) {
  if (!filePaths.has(node.meta?.file)) return false;
  if (!riskMatchesSelectedApis(node, selectedApis)) return false;
  if (node.meta?.rule === "unbounded_search" && !targetTokens.includes("search")) return false;
  return true;
}

function degreeFor(nodeId, edges) {
  return edges.reduce((count, edge) => count + (edge.source === nodeId || edge.target === nodeId ? 1 : 0), 0);
}

function riskScore(risk, trace) {
  const priorityWeight = PRIORITY_SCORE[risk.meta?.level] || 10;
  const evidenceWeight = risk.meta?.evidence?.line ? 10 : 0;
  const depth = trace.depths?.get(risk.id) ?? 9;
  const graphProximityWeight = Math.max(0, 12 - depth * 2);
  const adjacencyWeight = Math.min(8, degreeFor(risk.id, trace.edges) * 2);
  const repeatedSignalWeight = trace.nodes.filter((node) => node.type === "PerformanceRisk" && node.meta?.rule === risk.meta?.rule).length > 1 ? 5 : 0;
  return priorityWeight + evidenceWeight + graphProximityWeight + adjacencyWeight + repeatedSignalWeight;
}

function sortRisks(risks, trace) {
  return risks
    .slice()
    .sort((a, b) => riskScore(b, trace) - riskScore(a, trace) || (RULE_ORDER[a.meta?.level] || 9) - (RULE_ORDER[b.meta?.level] || 9) || a.label.localeCompare(b.label));
}

function riskRow(risk, trace) {
  const evidence = risk.meta?.evidence
    ? `${risk.meta.file}:${risk.meta.evidence.line} - ${risk.meta.evidence.text.replace(/\|/g, "\\|")}`
    : risk.meta?.file || "needs manual verification";
  return `| ${riskScore(risk, trace)} | ${risk.meta?.level || "P?"} | ${risk.meta?.rule || risk.label} | ${evidence} | ${risk.meta?.fix || "Investigate and verify."} |`;
}

function acceptanceForRisk(risk) {
  return ACCEPTANCE_CRITERIA[risk.meta?.rule] || "The risk is verified with a focused fixture or runtime measurement and the affected contract remains stable.";
}

function ticketForRisk(index, risk, trace) {
  const file = risk.meta?.file || "related file";
  return [
    `### Ticket ${index}: ${risk.meta?.title || risk.label}`,
    "",
    `- Priority: ${risk.meta?.level || "P?"}`,
    `- Risk Score: ${riskScore(risk, trace)}`,
    `- Evidence: ${risk.meta?.evidence ? `${file}:${risk.meta.evidence.line} ${risk.meta.evidence.text}` : file}`,
    `- Change: ${risk.meta?.fix || "Investigate the hotspot and reduce repeated work."}`,
    `- Acceptance: ${acceptanceForRisk(risk)}`,
    "- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.",
    "",
  ].join("\n");
}

function focusedPrompt(target, facts) {
  const files = facts.files.map((node) => node.label).slice(0, 12).join(", ") || "the traced files";
  const risks = [...new Set(facts.risks.map((node) => node.meta?.rule).filter(Boolean))].join(", ") || "the reported risks";
  return [
    `Use the RepoLens memory for target "${target}". Focus only on this graph neighborhood unless a direct dependency forces a wider change.`,
    `Relevant files: ${files}.`,
    `Prioritize these risks: ${risks}.`,
    "Make the smallest safe code changes, preserve existing UI conventions, and add verification for the changed behavior.",
    "After editing, summarize evidence, touched files, tests run, and any runtime risks that still need measurement.",
  ].join(" ");
}

function listOrNone(nodes, formatter) {
  if (nodes.length === 0) return ["- none detected in traced neighborhood"];
  return nodes.map(formatter);
}

function contextPackRelativePath(target) {
  return path.posix.join(".project-memory", "context-packs", `${safeTarget(target)}.md`);
}

function formatReport(target, starts, trace) {
  const facts = collectModuleFacts(trace, starts);
  const lines = [
    `# Performance Report: ${target}`,
    "",
    "## Executive Summary",
    `RepoLens traced ${starts.length} start node(s), ${trace.nodes.length} related node(s), and ${trace.edges.length} evidence edge(s).`,
    `Context Pack: ${contextPackRelativePath(target)}`,
    facts.risks.length
      ? `Detected ${facts.risks.length} deterministic performance signal(s), led by ${facts.risks[0].meta?.level || "P?"} ${facts.risks[0].meta?.rule || facts.risks[0].label}.`
      : "No deterministic performance signal was detected in this graph neighborhood; continue with targeted code review and runtime measurement.",
    "",
    "## Related Modules",
    "",
    "### Routes",
    ...listOrNone(facts.routes, (node) => `- ${node.label} (${node.meta?.file || "unknown file"})`),
    "",
    "### Components",
    ...listOrNone(facts.components, (node) => `- ${node.label} (${node.meta?.file || "unknown file"})`),
    "",
    "### APIs",
    ...listOrNone(facts.apis, (node) => `- ${node.label} (${node.meta?.file || "unknown file"})`),
    "",
    "### Files",
    ...listOrNone(facts.files, (node) => `- ${node.label}`),
    "",
    "## Risk Table",
    "",
    "| Score | Priority | Rule | Evidence | Recommended Fix |",
    "|---:|---|---|---|---|",
    ...(facts.risks.length ? facts.risks.map((risk) => riskRow(risk, trace)) : ["| - | - | - | No deterministic rule hit | Review runtime metrics |"]),
    "",
    "## Fix Tickets",
    "",
    ...(facts.risks.length ? facts.risks.map((risk, index) => ticketForRisk(index + 1, risk, trace)) : ["- No automatic ticket generated."]),
    "",
    "## Focused Coding Prompt",
    "",
    "```text",
    focusedPrompt(target, facts),
    "```",
    "",
    "## Notes",
    "- Scanner findings are static signals. Confirm high-impact changes with profiling, network traces, or route-level measurements.",
    "- Keep unrelated refactors out of the first pass so the performance delta remains attributable.",
    "",
  ];

  return lines.flat().join("\n");
}

function safeTarget(target) {
  return target.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "target";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const graphPath = path.join(options.root, ".project-memory", "graph", "code_graph.json");
  const graph = await readJson(graphPath);
  const contextGraph = buildContextGraph(graph, options.target, options.hops);
  await writeContextGraph(options.root, contextGraph);
  const trace = contextGraphToTrace(contextGraph);
  const markdown = formatReport(options.target, contextGraph.start_nodes, trace);
  const outPath = options.out
    ? resolveSafeOutFile(options.root, options.out)
    : path.join(options.root, ".project-memory", "reports", `${safeTarget(options.target)}-perf-report.md`);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${markdown}\n`, "utf8");
  console.log(`Performance report written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
