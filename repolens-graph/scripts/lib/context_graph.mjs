import fs from "node:fs/promises";
import path from "node:path";

const FACT_NODE_TYPES = new Set(["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity", "PerformanceRisk"]);
const ALGORITHM_NODE_TYPES = new Set(["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity"]);

export function safeTarget(target) {
  return String(target || "target")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "target";
}

export function defaultContextGraphPath(root, target) {
  return path.join(root, ".project-memory", "traces", `${safeTarget(target)}-context-graph.json`);
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function writeContextGraph(root, contextGraph, outPath = null) {
  const targetPath = outPath || defaultContextGraphPath(root, contextGraph.target);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(contextGraph, null, 2)}\n`, "utf8");
  return targetPath;
}

function includesTarget(value, target) {
  return String(value || "").toLowerCase().includes(String(target || "").toLowerCase());
}

function canMatchByLocation(node) {
  return !FACT_NODE_TYPES.has(node.type);
}

export function findStartNodes(graph, target) {
  return graph.nodes.filter((node) => {
    if (!canMatchByLocation(node)) {
      return includesTarget(node.label, target) || includesTarget(node.meta?.id, target) || includesTarget(node.meta?.rule, target);
    }

    return (
      includesTarget(node.id, target) ||
      includesTarget(node.label, target) ||
      includesTarget(node.meta?.file, target) ||
      includesTarget(node.meta?.path, target) ||
      includesTarget(node.meta?.url, target) ||
      includesTarget(node.meta?.rawUrl, target) ||
      (Array.isArray(node.meta?.rawUrls) && node.meta.rawUrls.some((url) => includesTarget(url, target)))
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

function materializeTrace(graph, visits) {
  const nodeIds = new Set(visits.keys());
  return {
    nodeIds,
    depths: new Map([...visits.entries()].map(([id, visit]) => [id, visit.depth])),
    visits,
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  };
}

function traceGraph(graph, starts, hops) {
  const adjacency = buildAdjacency(graph.edges);
  const visits = new Map();
  const queue = starts.map((node) => ({ id: node.id, depth: 0 }));

  for (const node of starts) {
    visits.set(node.id, { depth: 0, reason: "target match", via: null });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item.depth >= hops) continue;

    for (const edge of adjacency.get(item.id) || []) {
      if (visits.has(edge.next)) continue;
      const direction = edge.direction === "out" ? "from" : "to";
      visits.set(edge.next, {
        depth: item.depth + 1,
        reason: `${edge.type} ${direction} ${item.id}`,
        via: compactEdge(edge),
      });
      queue.push({ id: edge.next, depth: item.depth + 1 });
    }
  }

  const apiIds = new Set([...visits.keys()].filter((id) => id.startsWith("APIEndpoint:")));
  for (const edge of graph.edges) {
    if (edge.type !== "defines" || !apiIds.has(edge.target) || visits.has(edge.source)) continue;
    visits.set(edge.source, {
      depth: (visits.get(edge.target)?.depth ?? hops) + 1,
      reason: `defines backend contract for ${edge.target}`,
      via: compactEdge(edge),
    });
  }

  for (const edge of graph.edges) {
    if (edge.type !== "mayCause" || !visits.has(edge.source) || visits.has(edge.target)) continue;
    visits.set(edge.target, {
      depth: (visits.get(edge.source)?.depth ?? hops) + 1,
      reason: `mayCause from ${edge.source}`,
      via: compactEdge(edge),
    });
  }

  return materializeTrace(graph, visits);
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

  return materializeTrace(
    {
      nodes: trace.nodes,
      edges: trace.edges,
    },
    new Map([...trace.visits.entries()].filter(([id]) => keptIds.has(id))),
  );
}

function compactEdge(edge) {
  if (!edge) return null;
  return {
    source: edge.source,
    target: edge.target,
    type: edge.type,
  };
}

function serializeTrace({ target, hops, starts, trace }) {
  const visits = {};
  for (const [id, visit] of trace.visits.entries()) {
    visits[id] = {
      depth: visit.depth,
      reason: visit.reason,
      via: visit.via || null,
    };
  }

  return {
    version: 1,
    target,
    hops,
    start_nodes: starts.map((node) => ({ id: node.id, type: node.type, label: node.label, meta: node.meta || {} })),
    nodes: trace.nodes,
    edges: trace.edges,
    visits,
  };
}

export function contextGraphToTrace(contextGraph) {
  const visits = new Map(Object.entries(contextGraph.visits || {}));
  const nodeIds = new Set(contextGraph.nodes.map((node) => node.id));
  return {
    nodeIds,
    depths: new Map([...visits.entries()].map(([id, visit]) => [id, visit.depth])),
    visits,
    nodes: contextGraph.nodes,
    edges: contextGraph.edges,
  };
}

export function buildContextGraph(graph, target, hops = 4) {
  const starts = findStartNodes(graph, target);
  if (starts.length === 0) {
    throw new Error(`No graph nodes matched "${target}". Run index_project.mjs first or use a more specific target.`);
  }

  const trace = focusRouteTrace(starts, traceGraph(graph, starts, hops));
  return serializeTrace({ target, hops, starts, trace });
}
