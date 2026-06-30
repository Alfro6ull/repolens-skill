import fs from "node:fs";
import path from "node:path";

const DEFAULT_MEMORY_DIR = ".project-memory";
const GENERATED_MARKER = ".repolens-generated";

function insideRoot(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function isDefaultMemoryPath(rootDir, targetPath) {
  const relativePath = toPosix(path.relative(rootDir, targetPath));
  return relativePath === DEFAULT_MEMORY_DIR || relativePath.startsWith(`${DEFAULT_MEMORY_DIR}/`);
}

export function resolveSafeOutDir(root, rawOut) {
  const out = String(rawOut || "").trim();
  if (!out) throw new Error("Invalid --out: expected a non-empty path.");

  const rootDir = path.resolve(root);
  const outDir = path.resolve(rootDir, out);

  if (!insideRoot(rootDir, outDir)) {
    throw new Error(`Refuse to remove unsafe outDir outside project root: ${outDir}`);
  }

  if (fs.existsSync(outDir)) {
    const stat = fs.statSync(outDir);
    if (!stat.isDirectory()) {
      throw new Error(`Refuse to remove unsafe outDir that is not a directory: ${outDir}`);
    }

    const markerPath = path.join(outDir, GENERATED_MARKER);
    if (!isDefaultMemoryPath(rootDir, outDir) && !fs.existsSync(markerPath)) {
      throw new Error(`Refuse to remove existing non-generated outDir: ${outDir}`);
    }
  }

  return outDir;
}

export function resolveSafeOutFile(root, rawOut) {
  const out = String(rawOut || "").trim();
  if (!out) throw new Error("Invalid --out: expected a non-empty path.");

  const rootDir = path.resolve(root);
  const outFile = path.resolve(rootDir, out);

  if (!insideRoot(rootDir, outFile)) {
    throw new Error(`Refuse to write unsafe outFile outside project root: ${outFile}`);
  }

  if (fs.existsSync(outFile) && fs.statSync(outFile).isDirectory()) {
    throw new Error(`Refuse to overwrite directory with generated file: ${outFile}`);
  }

  return outFile;
}

export function generatedMarkerName() {
  return GENERATED_MARKER;
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
