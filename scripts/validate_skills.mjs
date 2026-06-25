#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const DEFAULT_SKILLS = ["repolens-graph", "repolens-algo"];
const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 200;

function parseScalar(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error("SKILL.md must start with YAML frontmatter");

  const frontmatter = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyValue) throw new Error(`unsupported frontmatter line: ${rawLine}`);
    frontmatter[keyValue[1]] = parseScalar(keyValue[2]);
  }
  return frontmatter;
}

function parseSimpleYaml(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const result = {};
  const stack = [{ indent: -1, value: result }];

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.match(/^ */)[0].length;
    const keyValue = rawLine.trim().match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyValue) throw new Error(`unsupported YAML line in ${filePath}: ${rawLine}`);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    const key = keyValue[1];
    const rawValue = keyValue[2] ?? "";
    if (rawValue === "") {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }
  return result;
}

function validateSkill(skillDir) {
  const errors = [];
  const skillMd = path.join(skillDir, "SKILL.md");
  const agentsYaml = path.join(skillDir, "agents", "openai.yaml");

  if (!fs.existsSync(skillMd)) {
    errors.push("missing SKILL.md");
    return errors;
  }

  let frontmatter = {};
  try {
    frontmatter = parseFrontmatter(fs.readFileSync(skillMd, "utf8"));
  } catch (error) {
    errors.push(error.message);
  }

  const keys = Object.keys(frontmatter).sort();
  if (keys.join(",") !== "description,name") {
    errors.push(`frontmatter must contain only name and description; found: ${keys.join(", ") || "none"}`);
  }

  const name = frontmatter.name || "";
  const description = frontmatter.description || "";
  const folderName = path.basename(skillDir);

  if (!/^[a-z0-9-]+$/.test(name)) errors.push("name must use lowercase hyphen-case");
  if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) errors.push("name cannot start/end with hyphen or contain consecutive hyphens");
  if (name.length > MAX_NAME_LENGTH) errors.push(`name must be ${MAX_NAME_LENGTH} characters or fewer`);
  if (name !== folderName) errors.push(`name must match folder name ${folderName}`);

  if (!description) errors.push("description is required");
  if (description.length > MAX_DESCRIPTION_LENGTH) errors.push(`description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`);
  if (/[<>]/.test(description)) errors.push("description cannot contain angle brackets");
  if (!/\b(use|when)\b/i.test(description)) errors.push("description must include trigger wording such as Use or when");

  if (!fs.existsSync(agentsYaml)) {
    errors.push("missing agents/openai.yaml");
    return errors;
  }

  try {
    const metadata = parseSimpleYaml(agentsYaml);
    const iface = metadata.interface || {};
    const shortDescription = iface.short_description || "";
    const defaultPrompt = iface.default_prompt || "";

    if (!iface.display_name) errors.push("agents/openai.yaml missing interface.display_name");
    if (shortDescription.length < 25 || shortDescription.length > 64) {
      errors.push("interface.short_description must be 25-64 characters");
    }
    if (!defaultPrompt.includes(`$${name}`)) {
      errors.push(`interface.default_prompt must mention $${name}`);
    }
  } catch (error) {
    errors.push(error.message);
  }

  return errors;
}

const skillDirs = process.argv.slice(2);
const targets = skillDirs.length > 0 ? skillDirs : DEFAULT_SKILLS;
let failed = false;

for (const target of targets) {
  const errors = validateSkill(target);
  if (errors.length > 0) {
    failed = true;
    console.error(`${target}:`);
    for (const error of errors) console.error(`  - ${error}`);
  } else {
    console.log(`${target}: ok`);
  }
}

if (failed) process.exit(1);
