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
    throw new Error("Usage: node build_block_profiles.mjs <repo-root> <route|file|component|api|keyword> [--hops N] [--out path]");
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

function includesTarget(value, target) {
  return String(value || "").toLowerCase().includes(String(target || "").toLowerCase());
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function findStartNodes(graph, target) {
  return graph.nodes.filter((node) => {
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
    add(edge.source, { ...edge, next: edge.target });
    add(edge.target, { ...edge, next: edge.source });
  }
  return adjacency;
}

function traceGraph(graph, starts, hops) {
  const adjacency = buildAdjacency(graph.edges);
  const visited = new Set(starts.map((node) => node.id));
  const depths = new Map(starts.map((node) => [node.id, 0]));
  const queue = starts.map((node) => ({ id: node.id, depth: 0 }));

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item.depth >= hops) continue;
    for (const edge of adjacency.get(item.id) || []) {
      if (!visited.has(edge.next)) {
        visited.add(edge.next);
        depths.set(edge.next, item.depth + 1);
        queue.push({ id: edge.next, depth: item.depth + 1 });
      }
    }
  }

  const apiIds = new Set([...visited].filter((id) => id.startsWith("APIEndpoint:")));
  for (const edge of graph.edges) {
    if (edge.type !== "defines" || !apiIds.has(edge.target)) continue;
    if (!visited.has(edge.source)) {
      visited.add(edge.source);
      depths.set(edge.source, (depths.get(edge.target) ?? hops) + 1);
    }
  }

  for (const edge of graph.edges) {
    if (edge.type !== "mayCause" || !visited.has(edge.source)) continue;
    if (!visited.has(edge.target)) {
      visited.add(edge.target);
      depths.set(edge.target, (depths.get(edge.source) ?? hops) + 1);
    }
  }

  return materializeTrace(graph, visited, depths);
}

function materializeTrace(graph, nodeIds, depths) {
  return {
    nodeIds,
    depths,
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  };
}

function focusTrace(graph, trace, target) {
  const targetText = String(target || "").toLowerCase();
  const removeSearchOnly = targetText.includes("activity") && !targetText.includes("search");
  if (!removeSearchOnly) return trace;

  const keep = new Set(
    [...trace.nodeIds].filter((id) => {
      const text = id.toLowerCase();
      if (text.includes("searchpage") || text.includes("route:get:/search") || text.includes("/api/search")) return false;
      if (text.includes("unbounded_search")) return false;
      return true;
    }),
  );
  return materializeTrace(graph, keep, trace.depths);
}

async function readSourceFiles(root, files) {
  const sources = [];
  for (const file of files) {
    try {
      sources.push({ file, text: await fs.readFile(path.join(root, file), "utf8") });
    } catch {
      // Ignore missing files; graph evidence is still useful.
    }
  }
  return sources;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function detectTerms(haystack, detectors) {
  return detectors.filter((item) => item.patterns.some((pattern) => pattern.test(haystack))).map((item) => item.id);
}

function collectEvidenceLines(sources) {
  const interesting = [/works?/i, /activity/i, /tags?/i, /score/i, /keyword/i, /filter\(/i, /sort\(/i, /fetch\(/i, /@app\.get/i];
  const lines = [];
  for (const source of sources) {
    source.text.split(/\r?\n/).forEach((text, index) => {
      if (interesting.some((pattern) => pattern.test(text))) {
        lines.push({ file: source.file, line: index + 1, text: text.trim() });
      }
    });
  }
  return lines.slice(0, 16);
}

function inferProfile({ target, trace, starts, sources }) {
  const routes = unique(trace.nodes.filter((node) => node.type === "Route").map((node) => node.label));
  const components = unique(trace.nodes.filter((node) => node.type === "ReactComponent").map((node) => node.label).filter((name) => name !== "App"));
  const apis = unique(trace.nodes.filter((node) => node.type === "APIEndpoint").map((node) => node.label));
  const files = unique(trace.nodes.filter((node) => node.type === "File").map((node) => node.meta?.path || node.label));
  const riskSignals = unique(trace.nodes.filter((node) => node.type === "PerformanceRisk").map((node) => node.meta?.rule || node.label));
  const sourceText = sources.map((source) => source.text).join("\n");
  const haystack = [target, ...routes, ...components, ...apis, ...files, ...riskSignals, sourceText].join("\n");

  const entities = detectTerms(haystack, [
    { id: "activity", patterns: [/\bactivity\b/i, /activities/i] },
    { id: "work", patterns: [/\bwork\b/i, /works/i] },
    { id: "user", patterns: [/\buser\b/i, /author/i] },
    { id: "tag", patterns: [/\btag\b/i, /tags/i] },
    { id: "score", patterns: [/\bscore\b/i, /vote/i, /rating/i] },
    { id: "keyword", patterns: [/keyword/i, /query/i, /\bq\b/] },
  ]);

  const actions = detectTerms(haystack, [
    { id: "list", patterns: [/\.map\(/i, /load_all/i, /works/i] },
    { id: "filter", patterns: [/\.filter\(/i, /keyword/i] },
    { id: "sort", patterns: [/\.sort\(/i, /score/i] },
    { id: "search", patterns: [/search/i, /keyword/i] },
    { id: "view", patterns: [/view/i, /coverUrl/i] },
    { id: "submit", patterns: [/submit/i, /submitting/i] },
  ]);

  const dataShapes = [];
  if (/title|description|tags?|coverUrl|authorName|metadata/i.test(haystack)) dataShapes.push("content metadata");
  if (/keyword|search|\bq=|filter\(/i.test(haystack)) dataShapes.push("keyword query");
  if (/works?|items?|candidates?|load_all/i.test(haystack)) dataShapes.push("item list");
  if (/score|sort\(|rank/i.test(haystack)) dataShapes.push("ranked item list");
  if (/view|like|vote|collect|comment|submit|score/i.test(haystack)) dataShapes.push("implicit feedback candidate");

  const taskSignals = [];
  if (/works?|tags?|score|recommend|similar/i.test(haystack)) taskSignals.push("recommendation");
  if (/score|sort\(|rank|top/i.test(haystack)) taskSignals.push("ranking");
  if (/keyword|search|filter\(/i.test(haystack)) taskSignals.push("search");
  if (/user|author|activity/i.test(haystack)) taskSignals.push("personalization");

  const constraints = [];
  if (/title|tags?|description/i.test(haystack)) constraints.push("cold_start");
  if (/load_all|range\(500\)|demo|static/i.test(haystack)) constraints.push("small_data");
  if (!/exposure_id|impression|click|like|collect|favorite|view_event/i.test(haystack)) constraints.push("behavior_log_missing");
  if (/tags?|score|title|author/i.test(haystack)) constraints.push("needs_explainability");

  const currentLogic = [];
  if (/fetch\(|@app\.get/i.test(haystack)) currentLogic.push("api_fetch");
  if (/load_all|return \[/i.test(haystack)) currentLogic.push("list_loading");
  if (/filter\(/i.test(haystack)) currentLogic.push("client_filtering");
  if (/sort\(/i.test(haystack)) currentLogic.push("score_sorting");
  if (/keyword|search/i.test(haystack)) currentLogic.push("keyword_search");

  const objectives = [];
  if (taskSignals.includes("recommendation")) objectives.push("improve_discovery", "personalize_candidates");
  if (taskSignals.includes("ranking")) objectives.push("optimize_ranking", "explainable_ranking");
  if (taskSignals.includes("search")) objectives.push("improve_search_relevance");

  const codeLines = collectEvidenceLines(sources);
  const confidence = Math.min(0.95, 0.45 + Math.min(0.3, codeLines.length * 0.03) + Math.min(0.2, taskSignals.length * 0.05));

  return {
    block_id: target.includes("activity") ? "activity-work-list" : safeSlug(target),
    block_type: "feature",
    target,
    confidence: Number(confidence.toFixed(2)),
    start_nodes: starts.map((node) => ({ id: node.id, type: node.type, label: node.label })),
    evidence: {
      routes,
      components,
      apis,
      files,
      risk_signals: riskSignals,
      code_lines: codeLines,
    },
    entities: unique(entities),
    actions: unique(actions),
    data_shapes: unique(dataShapes),
    current_logic: unique(currentLogic),
    task_signals: unique(taskSignals),
    constraints: unique(constraints),
    objectives: unique(objectives),
    algorithm_opportunity: taskSignals.some((task) => ["recommendation", "ranking", "search", "personalization"].includes(task)),
    opportunity_summary: "The module exposes item metadata, list/ranking behavior, and query/filter logic, so it can be mapped to bounded recommendation, ranking, and search algorithm routes.",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const graphPath = path.join(options.root, ".project-memory", "graph", "code_graph.json");
  const graph = await readJson(graphPath);
  const starts = findStartNodes(graph, options.target);

  if (starts.length === 0) {
    throw new Error(`No graph nodes matched "${options.target}". Run index_project.mjs first or use a more specific target.`);
  }

  const trace = focusTrace(graph, traceGraph(graph, starts, options.hops), options.target);
  const files = unique(trace.nodes.filter((node) => node.type === "File").map((node) => node.meta?.path || node.label));
  const sources = await readSourceFiles(options.root, files);
  const profile = inferProfile({ target: options.target, trace, starts, sources });
  const output = {
    generated_at: new Date().toISOString(),
    target: options.target,
    source_graph: ".project-memory/graph/code_graph.json",
    profiles: [profile],
  };

  const outPath = options.out
    ? path.resolve(options.root, options.out)
    : path.join(options.root, ".project-memory", "algo", "block_profiles.json");
  await writeJson(outPath, output);
  console.log(`Block profiles written to ${outPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
