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

function findStartNodes(graph, target) {
  return graph.nodes.filter((node) => {
    return (
      includesTarget(node.id, target) ||
      includesTarget(node.label, target) ||
      includesTarget(node.meta?.file, target) ||
      includesTarget(node.meta?.path, target) ||
      includesTarget(node.meta?.url, target)
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

  const nodeIds = new Set(visited.keys());
  return {
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
    visits: visited,
  };
}

function normalizeToken(value) {
  return String(value)
    .replace(/ies\b/g, "y")
    .replace(/s\b/g, "");
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

  const riskIds = new Set(
    trace.nodes
      .filter((node) => node.type === "PerformanceRisk" && filePaths.has(node.meta?.file))
      .map((node) => node.id),
  );

  const keptIds = new Set([...routeIds, ...componentIds, ...apiIds, ...riskIds]);
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

function formatNode(node, visit) {
  return `| ${visit.depth} | ${node.type} | ${escapeCell(node.label)} | ${escapeCell(visit.reason)} |`;
}

function formatRisk(node) {
  const evidence = node.meta?.evidence
    ? `${node.meta.file}:${node.meta.evidence.line} - ${node.meta.evidence.text}`
    : node.meta?.file || "needs manual verification";
  return `| ${node.meta?.level || "P?"} | ${escapeCell(node.meta?.rule || node.label)} | ${escapeCell(evidence)} | ${escapeCell(node.meta?.fix || "Investigate and verify.")} |`;
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
  const risks = trace.nodes
    .filter((node) => node.type === "PerformanceRisk")
    .sort((a, b) => String(a.meta?.level).localeCompare(String(b.meta?.level)) || a.label.localeCompare(b.label));
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
    "| Distance | Type | Node | Why Included |",
    "|---:|---|---|---|",
    ...trace.nodes
      .map((node) => ({ node, visit: trace.visits.get(node.id) }))
      .sort((a, b) => a.visit.depth - b.visit.depth || a.node.type.localeCompare(b.node.type) || a.node.label.localeCompare(b.node.label))
      .map(({ node, visit }) => formatNode(node, visit)),
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
    "## Performance Risks",
    "",
    "| Priority | Rule | Evidence | Recommended Fix |",
    "|---|---|---|---|",
    ...(risks.length ? risks.map(formatRisk) : ["| - | - | No risk node in context | Review runtime metrics |"]),
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
    "- Every performance claim should cite a route, file, component, API endpoint, edge, or risk rule from this pack.",
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
