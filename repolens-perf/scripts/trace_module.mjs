#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = [...argv];
  const root = path.resolve(args[0] && !args[0].startsWith("--") ? args.shift() : ".");
  const target = args[0] && !args[0].startsWith("--") ? args.shift() : "";
  const options = { root, target, hops: 3, out: null };

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
    throw new Error("Usage: node trace_module.mjs <repo-root> <route|file|component|api|keyword> [--hops 2]");
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

  for (const node of starts) visited.set(node.id, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item.depth >= hops) continue;
    for (const edge of adjacency.get(item.id) || []) {
      if (!visited.has(edge.next)) {
        visited.set(edge.next, item.depth + 1);
        queue.push({ id: edge.next, depth: item.depth + 1 });
      }
    }
  }

  const nodeIds = new Set(visited.keys());
  const edges = graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
  return { nodes, edges, depths: visited };
}

function groupByType(nodes) {
  return nodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = [];
    acc[node.type].push(node);
    return acc;
  }, {});
}

function formatEdge(edge) {
  const evidence = edge.meta?.line ? ` line ${edge.meta.line}` : "";
  return `- ${edge.source} --${edge.type}${evidence}--> ${edge.target}`;
}

function formatTrace(target, starts, trace) {
  const groups = groupByType(trace.nodes);
  const lines = [
    `# RepoLens Trace: ${target}`,
    "",
    `- Start nodes: ${starts.length}`,
    `- Related nodes: ${trace.nodes.length}`,
    `- Related edges: ${trace.edges.length}`,
    "",
    "## Start Nodes",
    ...starts.map((node) => `- ${node.type}: ${node.label} (${node.id})`),
    "",
    "## Related Nodes",
  ];

  for (const [type, nodes] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push("", `### ${type}`);
    for (const node of nodes.sort((a, b) => a.label.localeCompare(b.label))) {
      const depth = trace.depths.get(node.id);
      const file = node.meta?.file || node.meta?.path;
      lines.push(`- d${depth} ${node.label}${file ? ` - ${file}` : ""}`);
    }
  }

  lines.push("", "## Evidence Edges", ...trace.edges.map(formatEdge).sort(), "");
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

  const trace = traceGraph(graph, starts, options.hops);
  const markdown = formatTrace(options.target, starts, trace);

  if (options.out) {
    const outPath = path.resolve(options.root, options.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, `${markdown}\n`, "utf8");
    console.log(`Trace written to ${outPath}`);
  } else {
    console.log(markdown);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
