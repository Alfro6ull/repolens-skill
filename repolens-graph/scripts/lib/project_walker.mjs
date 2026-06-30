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

export function classifyFile(relativePath) {
  const ext = path.extname(relativePath);
  if (/\b(tests?|specs?|__tests__|fixtures?)\b/i.test(relativePath)) return "test";
  if (/\b(generated|snapshots?)\b/i.test(relativePath)) return "generated";
  if (/(^|\/)(scripts?|tools?|bin|cli)(\/|$)/i.test(relativePath)) return "tooling";
  if (/(^|\/)(config|configs)(\/|$)|(^|\/)[^/]*\.config\.[cm]?[jt]s$/i.test(relativePath)) return "tooling";
  if (/\b(pages?|routes?)\b/i.test(relativePath)) return "route-or-page";
  if (/\bcomponents?\b/i.test(relativePath)) return "component";
  if (/\b(api|services?|clients?)\b/i.test(relativePath)) return "api-client";
  if (/\b(stores?|state|redux|zustand)\b/i.test(relativePath)) return "state";
  if ([".css", ".scss", ".sass", ".less"].includes(ext)) return "style";
  if ([".py"].includes(ext)) return "backend";
  if ([".md", ".mdx"].includes(ext)) return "docs";
  return "source";
}

export async function walkProjectFiles(root, current = root, results = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await walkProjectFiles(root, path.join(current, entry.name), results);
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
