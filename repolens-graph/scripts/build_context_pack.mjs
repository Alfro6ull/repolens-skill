#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { buildContextGraph, contextGraphToTrace, readJson, safeTarget, writeContextGraph } from "./lib/context_graph.mjs";
import { resolveSafeOutFile } from "./lib/path_utils.mjs";

const NODE_TYPE_WEIGHT = {
  Route: 5,
  APIEndpoint: 4,
  AlgorithmOpportunity: 4,
  ReactComponent: 3,
  DataEntity: 3,
  RankingSignal: 3,
  UserAction: 3,
  PerformanceRisk: 3,
  File: 2,
};

const PRIORITY_WEIGHT = {
  P1: 8,
  P2: 5,
  P3: 2,
};

const MAX_EVIDENCE_EDGES = 48;
const EDGE_TYPE_WEIGHT = {
  routesTo: 9,
  renders: 9,
  requests: 8,
  defines: 8,
  exports: 7,
  imports: 6,
  mayCause: 6,
  exposes: 5,
  mentions: 4,
  captures: 4,
  usesSignal: 4,
  suggests: 3,
  supports: 1,
};

function parseArgs(argv) {
  const args = [...argv];
  const root = path.resolve(args[0] && !args[0].startsWith("--") ? args.shift() : ".");
  const target = args[0] && !args[0].startsWith("--") ? args.shift() : "";
  const options = { root, target, hops: 4, out: null };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--hops") {
      options.hops = Number(args[i + 1] || 4);
      i += 1;
    } else if (args[i] === "--out") {
      options.out = args[i + 1];
      i += 1;
    }
  }

  if (!options.target) {
    throw new Error("Usage: node build_context_pack.mjs <repo-root> <route|file|component|api|keyword> [--hops 4] [--out path]");
  }

  return options;
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function evidenceForEdge(edge) {
  if (edge.meta?.line) return `line ${edge.meta.line}`;
  if (edge.meta?.evidence?.line) return `line ${edge.meta.evidence.line}: ${edge.meta.evidence.text}`;
  if (edge.meta?.evidence) return edge.meta.evidence;
  return "-";
}

function edgeDisplay(edge, nodeById) {
  return {
    source: nodeById.get(edge.source)?.label || edge.source,
    type: edge.type,
    target: nodeById.get(edge.target)?.label || edge.target,
    evidence: evidenceForEdge(edge),
  };
}

function edgeImportance(edge, trace) {
  const sourceDepth = trace.depths.get(edge.source) ?? 99;
  const targetDepth = trace.depths.get(edge.target) ?? 99;
  const proximity = Math.max(0, 8 - Math.min(sourceDepth, targetDepth));
  const evidenceWeight = edge.meta?.line || edge.meta?.evidence ? 3 : 0;
  return (EDGE_TYPE_WEIGHT[edge.type] || 2) + proximity + evidenceWeight;
}

function compactEvidenceEdges(trace, nodeById) {
  const seen = new Set();
  return trace.edges
    .map((edge) => ({ edge, display: edgeDisplay(edge, nodeById), score: edgeImportance(edge, trace) }))
    .filter((item) => {
      const key = `${item.display.source}::${item.display.type}::${item.display.target}::${item.display.evidence}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score || a.display.source.localeCompare(b.display.source) || a.display.type.localeCompare(b.display.type) || a.display.target.localeCompare(b.display.target));
}

function degreeFor(nodeId, edges) {
  return edges.reduce((count, edge) => count + (edge.source === nodeId || edge.target === nodeId ? 1 : 0), 0);
}

function hasRiskAdjacency(nodeId, edges, nodeById) {
  return edges.some((edge) => {
    if (edge.source !== nodeId && edge.target !== nodeId) return false;
    const otherId = edge.source === nodeId ? edge.target : edge.source;
    return nodeById.get(otherId)?.type === "PerformanceRisk";
  });
}

function contextScore(node, visit, trace, hops, nodeById) {
  const targetMatch = visit.depth === 0 ? 5 : 0;
  const proximityWeight = Math.max(0, hops - visit.depth + 1);
  const nodeTypeWeight = NODE_TYPE_WEIGHT[node.type] || 1;
  const riskAdjacencyWeight = hasRiskAdjacency(node.id, trace.edges, nodeById) ? 2 : 0;
  const centralityWeight = degreeFor(node.id, trace.edges) >= 3 ? 1 : 0;
  return targetMatch + proximityWeight + nodeTypeWeight + riskAdjacencyWeight + centralityWeight;
}

function riskScore(node, visit, trace, hops) {
  const priorityWeight = PRIORITY_WEIGHT[node.meta?.level] || 1;
  const evidenceWeight = node.meta?.evidence?.line ? 2 : 0;
  const proximityWeight = Math.max(0, hops - (visit?.depth ?? hops) + 1);
  const adjacencyWeight = degreeFor(node.id, trace.edges) >= 2 ? 1 : 0;
  return priorityWeight + evidenceWeight + proximityWeight + adjacencyWeight;
}

function formatNode(node, visit, score) {
  return `| ${score} | ${visit.depth} | ${node.type} | ${escapeCell(node.label)} | ${escapeCell(visit.reason)} |`;
}

function formatRisk(node, score) {
  const evidence = node.meta?.evidence
    ? `${node.meta.file}:${node.meta.evidence.line} - ${node.meta.evidence.text}`
    : node.meta?.file || "needs manual verification";
  return `| ${score} | ${node.meta?.level || "P?"} | ${escapeCell(node.meta?.rule || node.label)} | ${escapeCell(evidence)} | ${escapeCell(node.meta?.fix || "Investigate and verify.")} |`;
}

function contextFiles(nodes) {
  return nodes
    .map((node) => node.meta?.file || node.meta?.path || (node.type === "File" ? node.label : null))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}

function formatContextPack(contextGraph) {
  const trace = contextGraphToTrace(contextGraph);
  const nodeById = new Map(trace.nodes.map((node) => [node.id, node]));
  const scoredNodes = trace.nodes
    .map((node) => ({ node, visit: trace.visits.get(node.id) }))
    .filter((item) => item.visit)
    .map((item) => ({ ...item, score: contextScore(item.node, item.visit, trace, contextGraph.hops, nodeById) }))
    .sort((a, b) => b.score - a.score || a.visit.depth - b.visit.depth || a.node.type.localeCompare(b.node.type) || a.node.label.localeCompare(b.node.label));
  const risks = trace.nodes
    .filter((node) => node.type === "PerformanceRisk")
    .map((node) => ({ node, score: riskScore(node, trace.visits.get(node.id), trace, contextGraph.hops) }))
    .sort((a, b) => b.score - a.score || String(a.node.meta?.level).localeCompare(String(b.node.meta?.level)) || a.node.label.localeCompare(b.node.label));
  const files = contextFiles(trace.nodes);
  const evidenceEdges = compactEvidenceEdges(trace, nodeById);
  const primaryEvidenceEdges = evidenceEdges.filter(({ edge, display }) => edge.type !== "supports" || display.evidence !== "-");
  const shownEvidenceEdges = (primaryEvidenceEdges.length ? primaryEvidenceEdges : evidenceEdges).slice(0, MAX_EVIDENCE_EDGES);

  const lines = [
    `# Context Pack: ${contextGraph.target}`,
    "",
    "## Target",
    "",
    `- Query: ${contextGraph.target}`,
    `- Hops: ${contextGraph.hops}`,
    `- Start nodes: ${contextGraph.start_nodes.length}`,
    `- Included nodes: ${trace.nodes.length}`,
    `- Included edges: ${trace.edges.length}`,
    `- Source graph: .project-memory/traces/${safeTarget(contextGraph.target)}-context-graph.json`,
    "",
    "## Start Nodes",
    "",
    ...contextGraph.start_nodes.map((node) => `- ${node.type}: ${node.label} (${node.id})`),
    "",
    "## Graph Neighborhood",
    "",
    "| Score | Distance | Type | Node | Why Included |",
    "|---:|---:|---|---|---|",
    ...scoredNodes.map(({ node, visit, score }) => formatNode(node, visit, score)),
    "",
    "## Evidence Edges",
    "",
    `Showing ${shownEvidenceEdges.length} of ${evidenceEdges.length} deduplicated edge(s). The full machine-readable graph is in the JSON context graph.`,
    "",
    "| Source | Edge | Target | Evidence |",
    "|---|---|---|---|",
    ...shownEvidenceEdges.map(({ display }) => `| ${escapeCell(display.source)} | ${display.type} | ${escapeCell(display.target)} | ${escapeCell(display.evidence)} |`),
    "",
    "## Supporting Performance Signals",
    "",
    "| Score | Priority | Rule | Evidence | Recommended Fix |",
    "|---:|---|---|---|---|",
    ...(risks.length ? risks.map(({ node, score }) => formatRisk(node, score)) : ["| - | - | - | No risk node in context | Review runtime metrics |"]),
    "",
    "## Recommended Context For AI",
    "",
    "Use this pack as a readable view of the context graph. Prefer the JSON context graph for downstream analysis.",
    "",
    "### Files To Inspect",
    "",
    ...(files.length ? files.map((file) => `- ${file}`) : ["- none detected"]),
    "",
    "### Evidence Rules",
    "",
    "- Every algorithm or performance claim should cite a route, file, component, API endpoint, graph fact, edge, or rule from this pack.",
    "- Treat static risks as leads until profiling, network traces, or API measurements confirm runtime impact.",
    "- Keep fixes within this graph neighborhood unless a direct dependency proves a wider change is necessary.",
    "",
  ];

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const graphPath = path.join(options.root, ".project-memory", "graph", "code_graph.json");
  const graph = await readJson(graphPath);
  const contextGraph = buildContextGraph(graph, options.target, options.hops);
  await writeContextGraph(options.root, contextGraph);
  const markdown = formatContextPack(contextGraph);
  const outPath = options.out
    ? resolveSafeOutFile(options.root, options.out)
    : path.join(options.root, ".project-memory", "context-packs", `${safeTarget(options.target)}.md`);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${markdown}\n`, "utf8");
  console.log(`Context pack written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
