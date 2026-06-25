import path from "node:path";

export function resolveSafeOutDir(root, rawOut) {
  const out = String(rawOut || "").trim();
  if (!out) throw new Error("Invalid --out: expected a non-empty path.");

  const rootDir = path.resolve(root);
  const outDir = path.resolve(rootDir, out);
  const relativeOut = path.relative(rootDir, outDir);

  if (!relativeOut || relativeOut.startsWith("..") || path.isAbsolute(relativeOut)) {
    throw new Error(`Refuse to remove unsafe outDir outside project root: ${outDir}`);
  }

  return outDir;
}

export function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

export function rel(root, absolutePath) {
  return toPosix(path.relative(root, absolutePath));
}

export function safeName(name) {
  return String(name).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "module";
}
