import fs from "node:fs";
import path from "node:path";

function insideRoot(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
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
