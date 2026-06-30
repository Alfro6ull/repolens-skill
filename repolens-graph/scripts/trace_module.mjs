#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { buildContextGraph, contextGraphToTrace, readJson, writeContextGraph } from "./lib/context_graph.mjs";
import { resolveSafeOutFile } from "./lib/path_utils.mjs";

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
    throw new Error("Usage: node trace_module.mjs <repo-root> <route|file|component|api|keyword> [--hops 4] [--out trace.md]");
  }

  return options;
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

function formatTrace(contextGraph) {
  const starts = contextGraph.start_nodes;
  const trace = contextGraphToTrace(contextGraph);
  const groups = groupByType(trace.nodes);
  const lines = [
    `# RepoLens Trace: ${contextGraph.target}`,
    "",
    `- Hops: ${contextGraph.hops}`,
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
  const graph = await readJson(graphPath);
  const contextGraph = buildContextGraph(graph, options.target, options.hops);
  const contextGraphPath = await writeContextGraph(options.root, contextGraph);
  const markdown = formatTrace(contextGraph);

  if (options.out) {
    const outPath = resolveSafeOutFile(options.root, options.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, `${markdown}\n`, "utf8");
    console.log(`Trace written to ${outPath}`);
    console.log(`Context graph written to ${contextGraphPath}`);
  } else {
    console.log(markdown);
    console.error(`Context graph written to ${contextGraphPath}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
