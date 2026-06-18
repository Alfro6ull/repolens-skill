#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_EXTS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".md",
  ".mdx",
]);

const EXCLUDED_DIRS = new Set([
  ".git",
  ".project-memory",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "__pycache__",
]);

const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
]);

const RULE_META = {
  large_list_render: {
    level: "P1",
    title: "Large list render risk",
    fix: "Add pagination, virtualization, or server-side slicing.",
  },
  image_without_lazy: {
    level: "P2",
    title: "Image loading risk",
    fix: "Use lazy loading, thumbnails, and stable dimensions.",
  },
  rich_text_reparse: {
    level: "P2",
    title: "Rich text parse/render risk",
    fix: "Memoize parsed output and sanitize/cache server-side when possible.",
  },
  expensive_render_compute: {
    level: "P2",
    title: "Expensive render computation risk",
    fix: "Move sort/filter/map chains behind useMemo or to the server/API layer.",
  },
  duplicated_request: {
    level: "P2",
    title: "Potential duplicated request risk",
    fix: "Share cached query state or merge parent/sidebar data needs.",
  },
  missing_pagination: {
    level: "P1",
    title: "Missing pagination risk",
    fix: "Require limit/cursor/page parameters and return bounded payloads.",
  },
  n_plus_one_query: {
    level: "P1",
    title: "N+1 query risk",
    fix: "Batch related loads with joins, prefetch, or DataLoader-style caching.",
  },
  heavy_dependency_import: {
    level: "P3",
    title: "Heavy dependency import risk",
    fix: "Prefer dynamic import, subpath import, or smaller libraries.",
  },
  large_response_payload: {
    level: "P2",
    title: "Large response payload risk",
    fix: "Trim list payload schemas, split detail fields, or paginate the response.",
  },
  sync_blocking_io: {
    level: "P2",
    title: "Synchronous blocking I/O risk",
    fix: "Move blocking file, network, or process work to async APIs, background jobs, or cache.",
  },
  unbounded_search: {
    level: "P1",
    title: "Unbounded search risk",
    fix: "Add limit, indexed constraints, timeout, and query normalization.",
  },
};

function parseArgs(argv) {
  const args = [...argv];
  const rootArg = args[0] && !args[0].startsWith("--") ? args.shift() : ".";
  const options = { root: path.resolve(rootArg), out: ".project-memory" };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--out") {
      options.out = args[i + 1];
      i += 1;
    }
  }

  options.outDir = path.resolve(options.root, options.out);
  return options;
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function rel(root, absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

function classifyFile(relativePath) {
  const ext = path.extname(relativePath);
  if (/\b(pages?|routes?)\b/i.test(relativePath)) return "route-or-page";
  if (/\bcomponents?\b/i.test(relativePath)) return "component";
  if (/\b(api|services?|clients?)\b/i.test(relativePath)) return "api-client";
  if (/\b(stores?|state|redux|zustand)\b/i.test(relativePath)) return "state";
  if (/\btests?|specs?|__tests__\b/i.test(relativePath)) return "test";
  if ([".css", ".scss", ".sass", ".less"].includes(ext)) return "style";
  if ([".py"].includes(ext)) return "backend";
  if ([".md", ".mdx"].includes(ext)) return "docs";
  return "source";
}

async function walk(root, current = root, results = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walk(root, path.join(current, entry.name), results);
      continue;
    }

    if (!entry.isFile()) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;

    const absolutePath = path.join(current, entry.name);
    const ext = path.extname(entry.name);
    if (SOURCE_EXTS.has(ext)) results.push(absolutePath);
  }

  return results;
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function firstLineContaining(content, needles) {
  const lines = content.split(/\r?\n/);
  const lowered = needles.map((needle) => needle.toLowerCase());
  const foundIndex = lines.findIndex((line) =>
    lowered.some((needle) => line.toLowerCase().includes(needle)),
  );

  if (foundIndex === -1) return null;
  return {
    line: foundIndex + 1,
    text: lines[foundIndex].trim().slice(0, 220),
  };
}

function firstRequestEvidence(content) {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (/^(export\s+)?(async\s+)?function\s+get[A-Z]/.test(trimmed)) return false;
    return /\b(fetch|axios\.(get|post|put|patch|delete)|client\.(get|post|put|patch|delete)|http\.(get|post|put|patch|delete))\s*\(/.test(trimmed)
      || /\bget[A-Z][A-Za-z0-9_]*\s*\(/.test(trimmed)
      || /\bsearch[A-Z][A-Za-z0-9_]*\s*\(/.test(trimmed);
  });

  if (index === -1) return null;
  return {
    line: index + 1,
    text: lines[index].trim().slice(0, 220),
  };
}

function firstBackendListRouteEvidence(content) {
  const routeMatches = addMatch(
    /@\w+\.(get|post)\(\s*["']([^"']+)["']/g,
    content,
    (match, line) => ({ method: match[1].toUpperCase(), path: match[2], line }),
  );
  const candidate = routeMatches.find((route) => {
    const routePath = route.path.toLowerCase();
    const looksLikeCollection = /(works|search|list|items|users|posts|comments|activities|products|orders)\b/.test(routePath);
    const looksLikeSingleDetail = /\/\{[^}]+\}$/.test(routePath) && !/(works|search|list|items)\b/.test(routePath);
    return looksLikeCollection && !looksLikeSingleDetail;
  }) || routeMatches[0];

  if (!candidate) return null;
  const lineText = content.split(/\r?\n/)[candidate.line - 1] || "";
  return {
    line: candidate.line,
    text: lineText.trim().slice(0, 220),
  };
}

function firstLoopRelatedCallEvidence(content) {
  const lines = content.split(/\r?\n/);
  const loopIndex = lines.findIndex((line) => /\bfor\s+\w+\s+in\b/.test(line));
  if (loopIndex === -1) return null;
  const loopVar = lines[loopIndex].match(/\bfor\s+(\w+)\s+in\b/)?.[1];

  const start = Math.max(0, loopIndex - 16);
  const end = Math.min(lines.length, loopIndex + 24);

  const passes = [
    /\b(load_author|get_author|load_user|get_user|load_profile|get_profile|load_detail|get_detail)\s*\(/,
    /\b(load_[A-Za-z0-9_]+|fetch_[A-Za-z0-9_]+|get_[A-Za-z0-9_]+)\s*\(|\.(query|execute|get)\s*\(/,
  ];

  for (const pattern of passes) {
    for (let index = start; index < end; index += 1) {
      const text = lines[index].trim();
      if (text.startsWith("@") || text.startsWith("def ") || text.startsWith("async def ")) continue;
      if (index < loopIndex && loopVar && !text.includes(loopVar)) continue;
      if (pattern.test(text)) {
        return {
          line: index + 1,
          text: text.slice(0, 220),
        };
      }
    }
  }

  return {
    line: loopIndex + 1,
    text: lines[loopIndex].trim().slice(0, 220),
  };
}

function firstLargeResponsePayloadEvidence(content) {
  const lines = content.split(/\r?\n/);
  const listIndex = lines.findIndex((line) => /return\s+\[/.test(line));
  if (listIndex !== -1) {
    return {
      line: listIndex + 1,
      text: lines[listIndex].trim().slice(0, 220),
    };
  }
  return firstLineContaining(content, ["for work in works", "for item in items", "return {"]);
}

function firstBlockingIoEvidence(content) {
  return firstLineContaining(content, ["open(", "requests.get", "requests.post", "urllib.request", "subprocess.", "time.sleep"]);
}

function firstSearchRouteEvidence(content) {
  const routeEvidence = firstLineContaining(content, ["/search", "search_"]);
  return routeEvidence || firstLineContaining(content, ["return [", "filter("]);
}

function addMatch(regex, content, mapper) {
  const matches = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(content))) {
    matches.push(mapper(match, lineNumberFor(content, match.index)));
  }
  return matches;
}

function resolveImport(root, fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(path.join(root, fromFile)), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];

  return candidates.map((candidate) => rel(root, candidate));
}

function analyzeImports(root, file, content) {
  const patterns = [
    /import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
    /from\s+["']([^"']+)["']/g,
  ];
  const imports = [];

  for (const pattern of patterns) {
    imports.push(
      ...addMatch(pattern, content, (match, line) => ({
        from: file,
        specifier: match[1],
        resolvedCandidates: resolveImport(root, file, match[1]),
        line,
      })),
    );
  }

  return imports;
}

function analyzeComponents(file, content) {
  const componentMap = new Map();
  const declarationPatterns = [
    /(?:export\s+default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(/g,
    /(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:memo\(|forwardRef\()?[\s\S]{0,80}?=>/g,
  ];

  for (const pattern of declarationPatterns) {
    for (const item of addMatch(pattern, content, (match, line) => ({ name: match[1], line }))) {
      if (!componentMap.has(item.name)) {
        componentMap.set(item.name, {
          name: item.name,
          file,
          line: item.line,
          renders: [],
          hooks: [],
          requests: [],
          signals: [],
        });
      }
    }
  }

  const rendered = new Set(
    addMatch(/<([A-Z][A-Za-z0-9_]*)\b/g, content, (match) => match[1]).filter(
      (name) => !["React", "Fragment"].includes(name),
    ),
  );
  const hooks = new Set(addMatch(/\b(use[A-Z][A-Za-z0-9_]*)\b/g, content, (match) => match[1]));

  for (const component of componentMap.values()) {
    component.renders = [...rendered].filter((name) => name !== component.name).sort();
    component.hooks = [...hooks].sort();
  }

  return [...componentMap.values()];
}

function analyzeRoutes(file, content) {
  const routes = [];
  routes.push(
    ...addMatch(
      /<Route\b[^>]*path=["'`]([^"'`]+)["'`][^>]*element=\{\s*<([A-Z][A-Za-z0-9_]*)/g,
      content,
      (match, line) => ({ path: match[1], method: "GET", file, component: match[2], line, source: "react-router" }),
    ),
  );
  routes.push(
    ...addMatch(
      /path\s*:\s*["'`]([^"'`]+)["'`][\s\S]{0,220}?element\s*:\s*<([A-Z][A-Za-z0-9_]*)/g,
      content,
      (match, line) => ({ path: match[1], method: "GET", file, component: match[2], line, source: "route-object" }),
    ),
  );
  routes.push(
    ...addMatch(
      /@\w+\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g,
      content,
      (match, line) => ({ path: match[2], method: match[1].toUpperCase(), file, component: null, line, source: "fastapi" }),
    ),
  );
  return routes;
}

function cleanUrl(raw) {
  return raw.replace(/^`|`$/g, "").replace(/^["']|["']$/g, "");
}

function canonicalApiPath(raw) {
  const cleaned = cleanUrl(raw).trim();
  if (!cleaned) return cleaned;

  const [rawPath] = cleaned.split("?");
  let canonicalPath = rawPath
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/\{[^}/]+\}/g, ":param")
    .replace(/\/\d+(?=\/|$)/g, "/:param")
    .replace(/\/:id(?=\/|$)/g, "/:param")
    .replace(/\/{2,}/g, "/");

  if (!canonicalPath.startsWith("/")) canonicalPath = `/${canonicalPath}`;

  return canonicalPath;
}

function apiFact(file, method, rawUrl, line, source) {
  const cleaned = cleanUrl(rawUrl);
  return {
    file,
    method,
    url: canonicalApiPath(cleaned),
    rawUrl: cleaned,
    line,
    source,
  };
}

function analyzeApis(file, content) {
  const apis = [];
  apis.push(
    ...addMatch(/fetch\(\s*(`[^`]+`|"[^"]+"|'[^']+')/g, content, (match, line) =>
      apiFact(file, "GET", match[1], line, "fetch"),
    ),
  );
  apis.push(
    ...addMatch(
      /\b(?:axios|client|http|request)\.(get|post|put|patch|delete)\(\s*(`[^`]+`|"[^"]+"|'[^']+')/g,
      content,
      (match, line) => apiFact(file, match[1].toUpperCase(), match[2], line, "http-client"),
    ),
  );
  apis.push(
    ...addMatch(
      /@\w+\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g,
      content,
      (match, line) => apiFact(file, match[1].toUpperCase(), match[2], line, "fastapi"),
    ),
  );
  return apis;
}

function analyzeSignals(file, kind, content) {
  const signals = [];
  const isUiFile = [".tsx", ".jsx", ".ts", ".js"].includes(path.extname(file));
  const hasComponentShape = /<[A-Za-z][^>]*>|function\s+[A-Z]|const\s+[A-Z][A-Za-z0-9_]*\s*=/.test(content);

  function push(rule, evidenceNeedles, extra = {}) {
    const evidence = extra.evidence ?? firstLineContaining(content, evidenceNeedles);
    const { evidence: _ignoredEvidence, ...rest } = extra;
    signals.push({
      rule,
      file,
      level: RULE_META[rule].level,
      title: RULE_META[rule].title,
      fix: RULE_META[rule].fix,
      evidence,
      ...rest,
    });
  }

  if (isUiFile && hasComponentShape && /\.map\s*\(/.test(content)) {
    push("large_list_render", [".map("]);
  }

  if (isUiFile && /<img\b/i.test(content) && !/\bloading\s*=/.test(content)) {
    push("image_without_lazy", ["<img"]);
  }

  if (isUiFile && /(dangerouslySetInnerHTML|marked\.parse|markdownToHtml|rehype|remark)/.test(content)) {
    push("rich_text_reparse", ["dangerouslySetInnerHTML", "marked.parse", "rehype", "remark"]);
  }

  if (isUiFile && hasComponentShape && /\.(sort|filter)\s*\(/.test(content)) {
    push("expensive_render_compute", [".sort(", ".filter("]);
  }

  const requestMatches = content.match(/\b(get[A-Z][A-Za-z0-9_]*|fetch|axios\.get|client\.get)\s*\(/g) || [];
  if (isUiFile && /useEffect\s*\(/.test(content) && requestMatches.length > 0) {
    push("duplicated_request", ["fetch(", "axios.get", "client.get"], {
      evidence: firstRequestEvidence(content),
    });
  }

  if (/\b(lodash|moment|antd|echarts|monaco-editor)\b/.test(content)) {
    push("heavy_dependency_import", ["lodash", "moment", "antd", "echarts", "monaco-editor"]);
  }

  if (kind === "backend" && /@\w+\.(get|post)\(/.test(content) && !/\b(limit|page|cursor|offset|top_k|max_results|page_size)\b/.test(content)) {
    push("missing_pagination", ["@"], {
      evidence: firstBackendListRouteEvidence(content),
    });
  }

  if (kind === "backend" && /\breturn\s+\[[\s\S]{0,900}(for\s+\w+\s+in|load_all_|load_global_|range\s*\()/.test(content)) {
    push("large_response_payload", ["return [", "for work in works", "load_all_"], {
      evidence: firstLargeResponsePayloadEvidence(content),
    });
  }

  if (kind === "backend" && (/for\s+\w+\s+in[\s\S]{0,420}\b(load_[A-Za-z0-9_]+|fetch_[A-Za-z0-9_]+|get_[A-Za-z0-9_]+|query|execute)\s*\(/.test(content)
    || /\b(load_[A-Za-z0-9_]+|fetch_[A-Za-z0-9_]+|get_[A-Za-z0-9_]+|query|execute)\s*\([\s\S]{0,420}for\s+\w+\s+in/.test(content))) {
    push("n_plus_one_query", ["load_author(", "load_", "fetch_", ".query(", ".execute("], {
      evidence: firstLoopRelatedCallEvidence(content),
    });
  }

  if (kind === "backend" && /@\w+\.(get|post)\(\s*["'][^"']*(search|query|lookup|find)/i.test(content) && !/\b(limit|page|cursor|offset|top_k|max_results|page_size)\b/.test(content)) {
    push("unbounded_search", ["/search", "search_", "load_global_work_index"], {
      evidence: firstSearchRouteEvidence(content),
    });
  }

  if (kind === "backend" && /\b(requests\.(get|post|put|patch|delete)|urllib\.request|open\s*\(|time\.sleep\s*\(|subprocess\.)/.test(content)) {
    push("sync_blocking_io", ["requests.get", "open(", "time.sleep", "subprocess."], {
      evidence: firstBlockingIoEvidence(content),
    });
  }

  return signals;
}

function ensureNode(nodes, id, type, label, meta = {}) {
  if (!nodes.has(id)) nodes.set(id, { id, type, label, meta });
  return nodes.get(id);
}

function addEdge(edges, source, target, type, meta = {}) {
  if (!source || !target || source === target) return;
  const key = `${source}::${type}::${target}`;
  if (!edges.has(key)) edges.set(key, { source, target, type, meta });
}

function safeName(name) {
  return name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "module";
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function buildUndirectedAdjacency(edges) {
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

function graphMetrics(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const fanOut = new Map();
  const riskAdjacent = new Map();

  for (const edge of edges) {
    fanOut.set(edge.source, (fanOut.get(edge.source) || 0) + 1);
    if (edge.type === "mayCause" && nodeById.get(edge.target)?.type === "PerformanceRisk") {
      riskAdjacent.set(edge.source, (riskAdjacent.get(edge.source) || 0) + 1);
    }
  }

  const topFanOutNodes = [...fanOut.entries()]
    .map(([id, outDegree]) => ({
      id,
      label: nodeById.get(id)?.label || id,
      type: nodeById.get(id)?.type || "unknown",
      out_degree: outDegree,
    }))
    .sort((a, b) => b.out_degree - a.out_degree || a.id.localeCompare(b.id))
    .slice(0, 10);

  const topRiskAdjacentNodes = [...riskAdjacent.entries()]
    .map(([id, riskCount]) => ({
      id,
      label: nodeById.get(id)?.label || id,
      type: nodeById.get(id)?.type || "unknown",
      risk_count: riskCount,
    }))
    .sort((a, b) => b.risk_count - a.risk_count || a.id.localeCompare(b.id))
    .slice(0, 10);

  const adjacency = buildUndirectedAdjacency(edges);
  const routeRiskDensity = nodes
    .filter((node) => node.type === "Route")
    .map((route) => {
      const visited = new Map([[route.id, 0]]);
      const queue = [{ id: route.id, depth: 0 }];
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        if (item.depth >= 4) continue;
        for (const edge of adjacency.get(item.id) || []) {
          if (!visited.has(edge.next)) {
            visited.set(edge.next, item.depth + 1);
            queue.push({ id: edge.next, depth: item.depth + 1 });
          }
        }
      }

      const riskNodes = [...visited.keys()]
        .map((id) => nodeById.get(id))
        .filter((node) => node?.type === "PerformanceRisk");
      const density = visited.size === 0 ? 0 : riskNodes.length / visited.size;
      return {
        route: route.label,
        id: route.id,
        risk_count: riskNodes.length,
        neighborhood_node_count: visited.size,
        density: Number(density.toFixed(3)),
        risks: riskNodes.map((node) => node.label).sort(),
      };
    })
    .sort((a, b) => b.density - a.density || b.risk_count - a.risk_count || a.route.localeCompare(b.route));

  return {
    generated_at: new Date().toISOString(),
    node_count: nodes.length,
    edge_count: edges.length,
    node_type_counts: countBy(nodes, (node) => node.type),
    edge_type_counts: countBy(edges, (edge) => edge.type),
    top_fan_out_nodes: topFanOutNodes,
    top_risk_adjacent_nodes: topRiskAdjacentNodes,
    route_risk_density: routeRiskDensity,
  };
}

function moduleMarkdown(component, fileSignals, componentApis) {
  const lines = [
    `# ${component.name}`,
    "",
    `- Type: ReactComponent`,
    `- File: ${component.file}`,
    `- Declared at: line ${component.line}`,
    `- Hooks: ${component.hooks.length ? component.hooks.join(", ") : "none detected"}`,
    `- Renders: ${component.renders.length ? component.renders.join(", ") : "none detected"}`,
    `- Requests: ${componentApis.length ? componentApis.map((api) => `${api.method} ${api.url}`).join(", ") : "none detected"}`,
    "",
    "## Performance Signals",
  ];

  if (fileSignals.length === 0) {
    lines.push("- No deterministic rule signals detected.");
  } else {
    for (const signal of fileSignals) {
      const evidence = signal.evidence ? ` line ${signal.evidence.line}: ${signal.evidence.text}` : "";
      lines.push(`- ${signal.level} ${signal.rule}: ${signal.title}.${evidence}`);
    }
  }

  lines.push("", "## Agent Notes", "- Use this summary as a starting point; verify runtime-sensitive claims with code or measurements.");
  return `${lines.join("\n")}\n`;
}

function projectProfile(files, routes, components, apis, signals) {
  const byKind = files.reduce((acc, file) => {
    acc[file.kind] = (acc[file.kind] || 0) + 1;
    return acc;
  }, {});
  const topSignals = signals.reduce((acc, signal) => {
    acc[signal.rule] = (acc[signal.rule] || 0) + 1;
    return acc;
  }, {});

  return [
    "# Project Profile",
    "",
    `- Files indexed: ${files.length}`,
    `- Routes detected: ${routes.length}`,
    `- React components detected: ${components.length}`,
    `- API references detected: ${apis.length}`,
    `- Performance signals detected: ${signals.length}`,
    "",
    "## File Kinds",
    ...Object.entries(byKind)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, count]) => `- ${kind}: ${count}`),
    "",
    "## Top Performance Signals",
    ...(Object.keys(topSignals).length
      ? Object.entries(topSignals)
          .sort((a, b) => b[1] - a[1])
          .map(([rule, count]) => `- ${rule}: ${count}`)
      : ["- none detected"]),
    "",
    "## Suggested Next Commands",
    "- Trace a route: `node repolens-perf/scripts/trace_module.mjs <repo> \"/activity/:id\" --hops 2`",
    "- Generate a report: `node repolens-perf/scripts/perf_report.mjs <repo> \"/activity/:id\"`",
    "",
  ].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const absoluteFiles = await walk(options.root);
  const fileContents = new Map();
  const files = [];
  const imports = [];
  const routes = [];
  const components = [];
  const apis = [];
  const signals = [];

  for (const absolutePath of absoluteFiles.sort()) {
    const file = rel(options.root, absolutePath);
    const content = await fs.readFile(absolutePath, "utf8");
    const stat = await fs.stat(absolutePath);
    const kind = classifyFile(file);
    fileContents.set(file, content);
    files.push({
      path: file,
      kind,
      ext: path.extname(file),
      bytes: stat.size,
      lines: content.split(/\r?\n/).length,
    });
    imports.push(...analyzeImports(options.root, file, content));
    routes.push(...analyzeRoutes(file, content));
    components.push(...analyzeComponents(file, content));
    apis.push(...analyzeApis(file, content));
    signals.push(...analyzeSignals(file, kind, content));
  }

  const fileSet = new Set(files.map((file) => file.path));
  const componentByName = new Map();
  for (const component of components) {
    if (!componentByName.has(component.name)) componentByName.set(component.name, []);
    componentByName.get(component.name).push(component);
    component.requests = apis.filter((api) => api.file === component.file);
    component.signals = signals.filter((signal) => signal.file === component.file);
  }

  const nodes = new Map();
  const edges = new Map();

  for (const file of files) {
    ensureNode(nodes, `File:${file.path}`, "File", file.path, file);
  }

  for (const entry of imports) {
    for (const candidate of entry.resolvedCandidates || []) {
      if (fileSet.has(candidate)) {
        addEdge(edges, `File:${entry.from}`, `File:${candidate}`, "imports", { line: entry.line, specifier: entry.specifier });
        break;
      }
    }
  }

  for (const component of components) {
    const id = `ReactComponent:${component.name}:${component.file}`;
    ensureNode(nodes, id, "ReactComponent", component.name, component);
    addEdge(edges, `File:${component.file}`, id, "exports", { line: component.line });

    for (const rendered of component.renders) {
      const targets = componentByName.get(rendered) || [];
      for (const target of targets) {
        addEdge(edges, id, `ReactComponent:${target.name}:${target.file}`, "renders", { evidence: `<${rendered}>` });
      }
    }
  }

  for (const route of routes) {
    const id = `Route:${route.method}:${route.path}`;
    ensureNode(nodes, id, "Route", `${route.method} ${route.path}`, route);
    addEdge(edges, id, `File:${route.file}`, "routesTo", { line: route.line, source: route.source });
    if (route.component) {
      const targets = componentByName.get(route.component) || [];
      for (const target of targets) addEdge(edges, id, `ReactComponent:${target.name}:${target.file}`, "renders", { line: route.line });
    }
  }

  for (const api of apis) {
    const id = `APIEndpoint:${api.method}:${api.url}`;
    const node = ensureNode(nodes, id, "APIEndpoint", `${api.method} ${api.url}`, api);
    node.meta.rawUrls = [...new Set([...(node.meta.rawUrls || []), node.meta.rawUrl, api.rawUrl].filter(Boolean))];
    node.meta.sources = [...new Set([...(node.meta.sources || []), node.meta.source, api.source].filter(Boolean))];
    const edgeType = api.source === "fastapi" ? "defines" : "requests";
    addEdge(edges, `File:${api.file}`, id, edgeType, { line: api.line, source: api.source, rawUrl: api.rawUrl });
  }

  for (const signal of signals) {
    const id = `PerformanceRisk:${signal.rule}:${signal.file}`;
    ensureNode(nodes, id, "PerformanceRisk", `${signal.level} ${signal.rule}`, signal);
    addEdge(edges, `File:${signal.file}`, id, "mayCause", { evidence: signal.evidence });
    for (const component of components.filter((item) => item.file === signal.file)) {
      addEdge(edges, `ReactComponent:${component.name}:${component.file}`, id, "mayCause", { evidence: signal.evidence });
    }
  }

  await fs.rm(options.outDir, { recursive: true, force: true });
  await fs.mkdir(path.join(options.outDir, "graph"), { recursive: true });
  await fs.mkdir(path.join(options.outDir, "MODULE_SUMMARIES"), { recursive: true });

  await writeJson(path.join(options.outDir, "files.json"), files);
  await writeJson(path.join(options.outDir, "imports.json"), imports);
  await writeJson(path.join(options.outDir, "routes.json"), routes);
  await writeJson(path.join(options.outDir, "components.json"), components);
  await writeJson(path.join(options.outDir, "apis.json"), apis);
  await writeJson(path.join(options.outDir, "performance_signals.json"), signals);

  const graphNodes = [...nodes.values()];
  const graphEdges = [...edges.values()];
  const graph = {
    generatedAt: new Date().toISOString(),
    root: options.root,
    nodes: graphNodes,
    edges: graphEdges,
  };
  await writeJson(path.join(options.outDir, "graph", "code_graph.json"), graph);
  await writeJson(path.join(options.outDir, "graph_metrics.json"), graphMetrics(graphNodes, graphEdges));

  await fs.writeFile(path.join(options.outDir, "PROJECT_PROFILE.md"), `${projectProfile(files, routes, components, apis, signals)}\n`, "utf8");

  for (const component of components) {
    const fileSignals = signals.filter((signal) => signal.file === component.file);
    const componentApis = apis.filter((api) => api.file === component.file);
    await fs.writeFile(
      path.join(options.outDir, "MODULE_SUMMARIES", `${safeName(component.name)}.md`),
      moduleMarkdown(component, fileSignals, componentApis),
      "utf8",
    );
  }

  console.log(`RepoLens indexed ${files.length} files, ${routes.length} routes, ${components.length} components, ${signals.length} performance signals.`);
  console.log(`Memory written to ${options.outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
