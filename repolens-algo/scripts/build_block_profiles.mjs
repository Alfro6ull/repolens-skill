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

function canMatchByLocation(node) {
  return !["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity", "PerformanceRisk"].includes(node.type);
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

function targetTokens(target) {
  return String(target || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && token !== "api" && token !== "get");
}

function nodeSearchText(node) {
  return [
    node.id,
    node.label,
    node.type,
    node.meta?.file,
    node.meta?.path,
    node.meta?.url,
    node.meta?.rawUrl,
    node.meta?.id,
    node.meta?.reason,
    ...(Array.isArray(node.meta?.rawUrls) ? node.meta.rawUrls : []),
  ]
    .join(" ")
    .toLowerCase();
}

function relevanceScore(node, tokens) {
  const text = nodeSearchText(node);
  return tokens.filter((token) => text.includes(token)).length;
}

function focusTrace(graph, trace, target) {
  const tokens = targetTokens(target);
  if (tokens.length === 0) return trace;

  const nodeById = new Map(trace.nodes.map((node) => [node.id, node]));
  const keep = new Set();

  for (const node of trace.nodes) {
    const depth = trace.depths.get(node.id) ?? 99;
    if (depth <= 1 || relevanceScore(node, tokens) > 0) {
      keep.add(node.id);
    }
  }

  for (const node of trace.nodes) {
    if (node.type !== "PerformanceRisk") continue;
    const sourceKept = trace.edges.some((edge) => edge.type === "mayCause" && edge.target === node.id && keep.has(edge.source));
    if (sourceKept) keep.add(node.id);
  }

  for (const edge of trace.edges) {
    if (edge.type === "defines" && keep.has(edge.target)) keep.add(edge.source);
    if (edge.type === "requests" && keep.has(edge.source)) keep.add(edge.target);
    if (edge.type === "imports" && keep.has(edge.source)) keep.add(edge.target);
  }

  const graphFactTypes = new Set(["DataEntity", "UserAction", "RankingSignal", "AlgorithmOpportunity"]);
  for (const node of trace.nodes) {
    if (!graphFactTypes.has(node.type)) continue;
    const connectedToKeptNode = trace.edges.some((edge) => {
      return (edge.source === node.id && keep.has(edge.target)) || (edge.target === node.id && keep.has(edge.source));
    });
    if (connectedToKeptNode || relevanceScore(node, tokens) > 0) keep.add(node.id);
  }

  for (const edge of trace.edges) {
    if (edge.type !== "supports") continue;
    if (keep.has(edge.source)) keep.add(edge.target);
    if (keep.has(edge.target)) keep.add(edge.source);
  }

  for (const id of [...keep]) {
    if (!nodeById.has(id)) keep.delete(id);
  }

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
  const interesting = [
    /items?/i,
    /works?/i,
    /records?/i,
    /entries?/i,
    /tags?/i,
    /score/i,
    /priority/i,
    /weight/i,
    /keyword/i,
    /filter\(/i,
    /sort\(/i,
    /find\(/i,
    /includes\(/i,
    /intersection\(/i,
    /\blimit\b/i,
    /\bif\b/i,
    /\belse\b/i,
    /fetch\(/i,
    /@app\.get/i,
  ];
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
  const graphEntities = unique(trace.nodes.filter((node) => node.type === "DataEntity").map((node) => node.meta?.id || node.label));
  const graphActions = unique(trace.nodes.filter((node) => node.type === "UserAction").map((node) => node.meta?.id || node.label));
  const graphRankingSignals = unique(trace.nodes.filter((node) => node.type === "RankingSignal").map((node) => node.meta?.id || node.label));
  const graphOpportunities = unique(trace.nodes.filter((node) => node.type === "AlgorithmOpportunity").map((node) => node.meta?.id || node.label));
  const sourceText = sources.map((source) => source.text).join("\n");
  const haystack = [target, ...routes, ...components, ...apis, ...files, ...riskSignals, ...graphEntities, ...graphActions, ...graphRankingSignals, ...graphOpportunities, sourceText].join("\n");
  const branchCount = (haystack.match(/\bif\b|\belif\b|\belse\b|switch\s*\(|\bcase\b/gi) || []).length;
  const hasBranchingRules = branchCount >= 3 || /\belif\b|\belse\b|switch\s*\(|\bcase\b/i.test(haystack);

  const detectedEntities = detectTerms(haystack, [
    { id: "collection", patterns: [/\bcollection\b/i, /\bgroup\b/i, /\bcategory\b/i] },
    { id: "item", patterns: [/\bitem\b/i, /items/i, /\bwork\b/i, /works/i, /\bcandidate\b/i, /candidates/i] },
    { id: "user", patterns: [/\buser\b/i, /\buser[_-]?id\b/i, /profile/i, /account/i] },
    { id: "tag", patterns: [/\btag\b/i, /tags/i] },
    { id: "score", patterns: [/\bscore\b/i, /vote/i, /rating/i] },
    { id: "keyword", patterns: [/keyword/i, /query/i, /\bq\b/] },
  ]);

  const detectedActions = detectTerms(haystack, [
    { id: "list", patterns: [/\.map\(/i, /load_all/i, /items/i, /works/i, /records/i, /entries/i] },
    { id: "filter", patterns: [/\.filter\(/i, /keyword/i] },
    { id: "sort", patterns: [/\.sort\(/i, /score/i] },
    { id: "search", patterns: [/search/i, /keyword/i] },
    { id: "view", patterns: [/view/i, /coverUrl/i] },
    { id: "submit", patterns: [/submit/i, /submitting/i] },
  ]);

  const dataShapes = [];
  if (graphEntities.some((item) => ["content", "tag"].includes(item)) || /title|description|tags?|coverUrl|authorName|metadata/i.test(haystack)) dataShapes.push("content metadata");
  if (graphEntities.includes("query") || graphActions.includes("search") || /keyword|search|\bq=|filter\(/i.test(haystack)) dataShapes.push("keyword query");
  if (graphEntities.includes("item") || /works?|items?|candidates?|load_all/i.test(haystack)) dataShapes.push("item list");
  if (graphRankingSignals.length > 0 || /score|sort\(|rank/i.test(haystack)) dataShapes.push("ranked item list");
  if (graphActions.some((item) => ["click", "feedback", "exposure"].includes(item)) || /like|vote|collect|comment|submit/i.test(haystack)) dataShapes.push("implicit feedback candidate");
  if (/\b(limit|top|take)\b|slice\(0|ranked\[:limit\]|Query\([^)]*\ble\b/i.test(haystack)) dataShapes.push("bounded result set");
  if (/\bSet\(|\bMap\(|\.has\(|\.includes\(|\.find\(|intersection\(/i.test(haystack)) dataShapes.push("lookup key or membership set");

  const taskSignals = [...graphOpportunities];
  if (/works?|tags?|score|recommend|similar/i.test(haystack)) taskSignals.push("recommendation");
  if (graphRankingSignals.length > 0 || /score|sort\(|rank|top/i.test(haystack)) taskSignals.push("ranking");
  if (graphEntities.includes("query") || graphActions.includes("search") || /keyword|search|filter\(/i.test(haystack)) taskSignals.push("search");
  if (graphEntities.includes("user") || /\buser\b|profile|account/i.test(haystack)) taskSignals.push("personalization");
  if (/\bSet\(|\bMap\(|\.has\(|\.includes\(|\.find\(|intersection\(/i.test(haystack)) taskSignals.push("indexed_lookup");
  if (hasBranchingRules) taskSignals.push("rule_table");
  if (riskSignals.includes("n_plus_one_query") || /load_author\([^)]*\)/i.test(haystack)) taskSignals.push("batch_loading");
  if (/\b(limit|top|take)\b|slice\(0|ranked\[:limit\]|Query\([^)]*\ble\b/i.test(haystack)) taskSignals.push("bounded_top_k");
  if (graphRankingSignals.length > 0 || /\b(score|priority|weight|risk)\b|tag_overlap/i.test(haystack)) taskSignals.push("explainable_scoring");

  const constraints = [];
  if (/title|tags?|description/i.test(haystack)) constraints.push("cold_start");
  if (/load_all|range\(500\)|fixture|mock|sample|static/i.test(haystack)) constraints.push("small_data");
  if (!graphActions.some((item) => ["click", "feedback", "exposure"].includes(item)) && !/exposure_id|impression|click|like|collect|favorite|view_event/i.test(haystack)) constraints.push("behavior_log_missing");
  if (/tags?|score|title/i.test(haystack)) constraints.push("needs_explainability");

  const currentLogic = [];
  if (/fetch\(|@app\.get/i.test(haystack)) currentLogic.push("api_fetch");
  if (/load_all|return \[/i.test(haystack)) currentLogic.push("list_loading");
  if (/filter\(/i.test(haystack)) currentLogic.push("client_filtering");
  if (graphRankingSignals.length > 0 || /sort\(/i.test(haystack)) currentLogic.push("score_sorting");
  if (/keyword|search/i.test(haystack)) currentLogic.push("keyword_search");
  if (hasBranchingRules) currentLogic.push("branching_rules");
  if (/\bSet\(|\bMap\(|\.has\(|\.includes\(|\.find\(|intersection\(/i.test(haystack)) currentLogic.push("membership_lookup");
  if (riskSignals.includes("n_plus_one_query") || /load_author\([^)]*\)/i.test(haystack)) currentLogic.push("n_plus_one_lookup");
  if (/\b(limit|top|take)\b|slice\(0|ranked\[:limit\]|Query\([^)]*\ble\b/i.test(haystack)) currentLogic.push("bounded_result_set");
  if (graphRankingSignals.length > 0 || /\b(score|priority|weight|risk)\b|tag_overlap/i.test(haystack)) currentLogic.push("hardcoded_scoring");

  const objectives = [];
  if (taskSignals.includes("recommendation")) objectives.push("improve_discovery");
  if (taskSignals.includes("personalization")) objectives.push("personalize_candidates");
  if (taskSignals.includes("ranking")) objectives.push("optimize_ranking", "explainable_ranking");
  if (taskSignals.includes("search")) objectives.push("improve_search_relevance");
  if (taskSignals.includes("retrieval")) objectives.push("improve_search_relevance", "improve_discovery");
  if (taskSignals.includes("indexed_lookup")) objectives.push("reduce_lookup_cost");
  if (taskSignals.includes("rule_table")) objectives.push("make_rules_auditable");
  if (taskSignals.includes("batch_loading")) objectives.push("reduce_round_trips");
  if (taskSignals.includes("bounded_top_k")) objectives.push("bound_result_work");
  if (taskSignals.includes("explainable_scoring")) objectives.push("explainable_ranking");

  const codeLines = collectEvidenceLines(sources);
  const graphFactCount = graphEntities.length + graphActions.length + graphRankingSignals.length + graphOpportunities.length;
  const confidence = Math.min(0.95, 0.4 + Math.min(0.25, graphFactCount * 0.04) + Math.min(0.2, codeLines.length * 0.02) + Math.min(0.2, taskSignals.length * 0.04));
  const finalTaskSignals = unique(taskSignals);

  return {
    block_id: safeSlug(target),
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
      graph_facts: {
        data_entities: graphEntities,
        user_actions: graphActions,
        ranking_signals: graphRankingSignals,
        algorithm_opportunities: graphOpportunities,
      },
      code_lines: codeLines,
    },
    entities: unique([...graphEntities, ...detectedEntities]),
    actions: unique([...graphActions, ...detectedActions]),
    data_shapes: unique(dataShapes),
    current_logic: unique(currentLogic),
    task_signals: finalTaskSignals,
    constraints: unique(constraints),
    objectives: unique(objectives),
    algorithm_opportunity: finalTaskSignals.some((task) =>
      [
        "recommendation",
        "ranking",
        "search",
        "retrieval",
        "personalization",
        "indexed_lookup",
        "rule_table",
        "batch_loading",
        "bounded_top_k",
        "explainable_scoring",
      ].includes(task),
    ),
    opportunity_summary: finalTaskSignals.length
      ? "The graph exposes data entities, actions, or ranking signals that can be mapped to bounded algorithm routes."
      : "No algorithm opportunity was inferred from the current graph neighborhood.",
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
