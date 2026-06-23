#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

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

function includesTarget(value, target) {
  return String(value || "").toLowerCase().includes(target.toLowerCase());
}

function canMatchByLocation(node) {
  return !["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity", "PerformanceRisk"].includes(node.type);
}

function findStartNodes(graph, target) {
  return graph.nodes.filter((node) => {
    if (!canMatchByLocation(node)) {
      return includesTarget(node.label, target) || includesTarget(node.meta?.id, target) || includesTarget(node.meta?.rule, target);
    }

    return (
      includesTarget(node.id, target) ||
      includesTarget(node.label, target) ||
      (canMatchByLocation(node) && (
        includesTarget(node.meta?.file, target) ||
        includesTarget(node.meta?.path, target) ||
        includesTarget(node.meta?.url, target) ||
        includesTarget(node.meta?.rawUrl, target) ||
        (Array.isArray(node.meta?.rawUrls) && node.meta.rawUrls.some((url) => includesTarget(url, target)))
      ))
    );
  });
}

function buildAdjacency(edges) {
  const adjacency = new Map();
  function add(source, edge) {
    if (!adjacency.has(source)) adjacency.set(source, []);
    adjacency.get(source).push(edge);
  }

  for (const edge of edges) {
    add(edge.source, { ...edge, direction: "out", next: edge.target });
    add(edge.target, { ...edge, direction: "in", next: edge.source });
  }

  return adjacency;
}

function traceGraph(graph, starts, hops) {
  const adjacency = buildAdjacency(graph.edges);
  const visited = new Map();
  const queue = starts.map((node) => ({ id: node.id, depth: 0 }));

  for (const node of starts) {
    visited.set(node.id, { depth: 0, reason: "target match", via: null });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item.depth >= hops) continue;

    for (const edge of adjacency.get(item.id) || []) {
      if (!visited.has(edge.next)) {
        const direction = edge.direction === "out" ? "from" : "to";
        visited.set(edge.next, {
          depth: item.depth + 1,
          reason: `${edge.type} ${direction} ${item.id}`,
          via: edge,
        });
        queue.push({ id: edge.next, depth: item.depth + 1 });
      }
    }
  }

  const apiIds = new Set([...visited.keys()].filter((id) => id.startsWith("APIEndpoint:")));
  for (const edge of graph.edges) {
    if (edge.type !== "defines" || !apiIds.has(edge.target) || visited.has(edge.source)) continue;
    visited.set(edge.source, {
      depth: (visited.get(edge.target)?.depth ?? hops) + 1,
      reason: `defines backend contract for ${edge.target}`,
      via: edge,
    });
  }

  for (const edge of graph.edges) {
    if (edge.type !== "mayCause" || !visited.has(edge.source) || visited.has(edge.target)) continue;
    visited.set(edge.target, {
      depth: (visited.get(edge.source)?.depth ?? hops) + 1,
      reason: `mayCause from ${edge.source}`,
      via: edge,
    });
  }

  const nodeIds = new Set(visited.keys());
  return {
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
    visits: visited,
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

const ALGORITHM_NODE_TYPES = new Set(["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity"]);

function focusRouteTrace(starts, trace) {
  const routeStarts = starts.filter((node) => node.type === "Route");
  if (routeStarts.length === 0) return trace;

  const nodeById = new Map(trace.nodes.map((node) => [node.id, node]));
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

  const targetTokens = routeStarts
    .flatMap((route) => String(route.meta?.path || route.label).toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length > 2 && token !== "api")
    .map(normalizeToken);

  const apiIds = new Set();
  for (const node of trace.nodes) {
    if (node.type !== "APIEndpoint") continue;
    const requestedByFocusedFile = trace.edges.some((edge) => {
      const sourceFile = edge.source.replace(/^File:/, "");
      return edge.target === node.id && filePaths.has(sourceFile);
    });
    if (!requestedByFocusedFile) continue;
    const label = normalizeToken(node.label.toLowerCase());
    if (targetTokens.length === 0 || targetTokens.some((token) => label.includes(token))) {
      apiIds.add(node.id);
    }
  }

  for (const apiId of apiIds) {
    for (const edge of trace.edges) {
      if (edge.target !== apiId) continue;
      if (edge.type !== "defines" && edge.type !== "requests") continue;
      const sourceFile = edge.source.replace(/^File:/, "");
      if (sourceFile !== edge.source) filePaths.add(sourceFile);
    }
  }

  const selectedApis = [...apiIds].map((apiId) => nodeById.get(apiId)).filter(Boolean);
  const riskIds = new Set(
    trace.nodes
      .filter((node) => node.type === "PerformanceRisk" && riskMatchesFocus(node, filePaths, targetTokens, selectedApis))
      .map((node) => node.id),
  );

  const algorithmIds = new Set(
    trace.nodes
      .filter((node) => ALGORITHM_NODE_TYPES.has(node.type) && filePaths.has(node.meta?.file))
      .map((node) => node.id),
  );

  for (const edge of trace.edges) {
    if (edge.type !== "supports") continue;
    if (algorithmIds.has(edge.source)) algorithmIds.add(edge.target);
    if (algorithmIds.has(edge.target)) algorithmIds.add(edge.source);
  }

  const keptIds = new Set([...routeIds, ...componentIds, ...apiIds, ...riskIds, ...algorithmIds]);
  for (const node of trace.nodes) {
    if (node.type === "File" && filePaths.has(node.label)) keptIds.add(node.id);
  }

  const nodes = trace.nodes.filter((node) => keptIds.has(node.id));
  const edges = trace.edges.filter((edge) => keptIds.has(edge.source) && keptIds.has(edge.target));
  const visits = new Map([...trace.visits.entries()].filter(([id]) => keptIds.has(id)));
  return { nodes, edges, visits };
}

function safeTarget(target) {
  return target.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "target";
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

function riskScore(node, visit, trace, hops, nodeById) {
  const priorityWeight = PRIORITY_WEIGHT[node.meta?.level] || 1;
  const evidenceWeight = node.meta?.evidence?.line ? 2 : 0;
  const proximityWeight = Math.max(0, hops - (visit?.depth ?? hops) + 1);
  const adjacencyWeight = degreeFor(node.id, trace.edges) >= 2 ? 1 : 0;
  const moduleWeight = hasRiskAdjacency(node.id, trace.edges, nodeById) ? 1 : 0;
  return priorityWeight + evidenceWeight + proximityWeight + adjacencyWeight + moduleWeight;
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

function formatContextPack(target, starts, trace, hops) {
  const nodeById = new Map(trace.nodes.map((node) => [node.id, node]));
  const scoredNodes = trace.nodes
    .map((node) => ({ node, visit: trace.visits.get(node.id) }))
    .filter((item) => item.visit)
    .map((item) => ({ ...item, score: contextScore(item.node, item.visit, trace, hops, nodeById) }))
    .sort((a, b) => b.score - a.score || a.visit.depth - b.visit.depth || a.node.type.localeCompare(b.node.type) || a.node.label.localeCompare(b.node.label));
  const risks = trace.nodes
    .filter((node) => node.type === "PerformanceRisk")
    .map((node) => ({ node, score: riskScore(node, trace.visits.get(node.id), trace, hops, nodeById) }))
    .sort((a, b) => b.score - a.score || String(a.node.meta?.level).localeCompare(String(b.node.meta?.level)) || a.node.label.localeCompare(b.node.label));
  const files = contextFiles(trace.nodes);

  const lines = [
    `# Context Pack: ${target}`,
    "",
    "## Target",
    "",
    `- Query: ${target}`,
    `- Hops: ${hops}`,
    `- Start nodes: ${starts.length}`,
    `- Included nodes: ${trace.nodes.length}`,
    `- Included edges: ${trace.edges.length}`,
    "",
    "## Start Nodes",
    "",
    ...starts.map((node) => `- ${node.type}: ${node.label} (${node.id})`),
    "",
    "## Graph Neighborhood",
    "",
    "| Score | Distance | Type | Node | Why Included |",
    "|---:|---:|---|---|---|",
    ...scoredNodes.map(({ node, visit, score }) => formatNode(node, visit, score)),
    "",
    "## Evidence Edges",
    "",
    "| Source | Edge | Target | Evidence |",
    "|---|---|---|---|",
    ...trace.edges
      .slice()
      .sort((a, b) => a.source.localeCompare(b.source) || a.type.localeCompare(b.type) || a.target.localeCompare(b.target))
      .map((edge) => {
        const source = nodeById.get(edge.source)?.label || edge.source;
        const targetNode = nodeById.get(edge.target)?.label || edge.target;
        return `| ${escapeCell(source)} | ${edge.type} | ${escapeCell(targetNode)} | ${escapeCell(evidenceForEdge(edge))} |`;
      }),
    "",
    "## Supporting Performance Signals",
    "",
    "| Score | Priority | Rule | Evidence | Recommended Fix |",
    "|---:|---|---|---|---|",
    ...(risks.length ? risks.map(({ node, score }) => formatRisk(node, score)) : ["| - | - | - | No risk node in context | Review runtime metrics |"]),
    "",
    "## Recommended Context For AI",
    "",
    "Use this pack as the bounded context for the target. Prefer cited graph evidence over repository-wide guesses.",
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
  const graph = JSON.parse(await fs.readFile(graphPath, "utf8"));
  const starts = findStartNodes(graph, options.target);

  if (starts.length === 0) {
    throw new Error(`No graph nodes matched "${options.target}". Run index_project.mjs first or use a more specific target.`);
  }

  const rawTrace = traceGraph(graph, starts, options.hops);
  const trace = focusRouteTrace(starts, rawTrace);
  const markdown = formatContextPack(options.target, starts, trace, options.hops);
  const outPath = options.out
    ? path.resolve(options.root, options.out)
    : path.join(options.root, ".project-memory", "context-packs", `${safeTarget(options.target)}.md`);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${markdown}\n`, "utf8");
  console.log(`Context pack written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
