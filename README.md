# RepoLens Perf Skill

RepoLens Perf is a lightweight Codex Skill that turns a codebase into inspectable project memory, then generates evidence-backed module performance reports.

It is designed for AI coding workflows where a model should reason from a bounded graph neighborhood instead of guessing from the whole repository.

## Features

- Builds `.project-memory/` from a local repository.
- Extracts files, imports, routes, React components, API references, and performance signals.
- Writes a lightweight JSON code graph.
- Traces a route, file, component, API, or keyword through nearby graph nodes.
- Generates performance reports with evidence, risk levels, fix tickets, and focused coding-agent prompts.
- Includes frontend and backend performance rule references.

## Repository Layout

```text
repolens-perf/
  SKILL.md
  agents/openai.yaml
  scripts/
    index_project.mjs
    trace_module.mjs
    perf_report.mjs
  references/
    frontend_perf_rules.md
    backend_perf_rules.md
    graph_schema.md
    report_format.md

demo-ai-community-mini/
  src/
  backend/
  .project-memory/
```

## Quick Start

Run the included demo:

```bash
node repolens-perf/scripts/index_project.mjs demo-ai-community-mini
node repolens-perf/scripts/trace_module.mjs demo-ai-community-mini "/activity/:id"
node repolens-perf/scripts/perf_report.mjs demo-ai-community-mini "/activity/:id"
```

Open the generated report:

```text
demo-ai-community-mini/.project-memory/reports/activity-id-perf-report.md
```

## Use On Your Own Repository

```bash
node repolens-perf/scripts/index_project.mjs /path/to/your/repo
node repolens-perf/scripts/trace_module.mjs /path/to/your/repo "<route-or-module>"
node repolens-perf/scripts/perf_report.mjs /path/to/your/repo "<route-or-module>"
```

Examples:

```bash
node repolens-perf/scripts/trace_module.mjs ~/work/app "/dashboard"
node repolens-perf/scripts/perf_report.mjs ~/work/app "RichTextRenderer"
node repolens-perf/scripts/perf_report.mjs ~/work/app "/api/posts"
```

## Generated Memory

The indexer writes:

```text
.project-memory/
  PROJECT_PROFILE.md
  files.json
  imports.json
  routes.json
  components.json
  apis.json
  performance_signals.json
  MODULE_SUMMARIES/
  graph/code_graph.json
  reports/
```

## Skill Usage

The reusable Skill lives in `repolens-perf/`. To install it for Codex discovery, copy or symlink that folder into your Codex skills directory.

```bash
mkdir -p ~/.codex/skills
cp -R repolens-perf ~/.codex/skills/
```

Then invoke it in Codex with:

```text
Use $repolens-perf to index this repository and analyze /activity/:id performance.
```

## Notes

- Static signals are leads, not proof of runtime slowness.
- Confirm high-impact findings with profiling, network traces, or API latency measurements.
- The first version intentionally avoids external databases; the graph is plain JSON for portability.
