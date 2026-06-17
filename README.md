# RepoLens PerfGraph Skill

RepoLens PerfGraph is a lightweight Codex Skill that turns a codebase into inspectable project memory, retrieves a bounded graph neighborhood for a target module, and generates evidence-backed performance reports for AI coding workflows.

Instead of asking an AI assistant to guess from the whole repository, RepoLens builds a JSON code graph, performs K-hop traversal around a route/file/component/API target, prunes context, and asks the model to reason from cited evidence.

## Features

- Extracts files, imports, routes, React components, API references, and performance signals.
- Builds `.project-memory/` with a project profile, module summaries, graph JSON, graph metrics, reports, and context packs.
- Uses K-hop graph traversal to retrieve target-specific context.
- Generates context packs that can be handed to an AI coding agent.
- Generates performance reports with evidence lines, risk levels, rule-specific acceptance criteria, fix tickets, and focused coding prompts.
- Includes frontend/backend performance rules and a public baseline evaluation.

## Repository Layout

```text
repolens-perf/
  SKILL.md
  agents/openai.yaml
  scripts/
    index_project.mjs
    trace_module.mjs
    build_context_pack.mjs
    perf_report.mjs
  references/
    perfgraph_algorithm.md
    frontend_perf_rules.md
    backend_perf_rules.md
    graph_schema.md
    report_format.md

demo-ai-community-mini/
  src/
  backend/
  .project-memory/

eval/
  baseline_vs_repolens.md
```

## Quick Start

Run the included demo:

```bash
node repolens-perf/scripts/index_project.mjs demo-ai-community-mini
node repolens-perf/scripts/trace_module.mjs demo-ai-community-mini "/activity/:id"
node repolens-perf/scripts/build_context_pack.mjs demo-ai-community-mini "/activity/:id"
node repolens-perf/scripts/perf_report.mjs demo-ai-community-mini "/activity/:id"
```

Open the generated artifacts:

```text
demo-ai-community-mini/.project-memory/graph_metrics.json
demo-ai-community-mini/.project-memory/context-packs/activity-id.md
demo-ai-community-mini/.project-memory/reports/activity-id-perf-report.md
```

## Use On Your Own Repository

```bash
node repolens-perf/scripts/index_project.mjs /path/to/your/repo
node repolens-perf/scripts/build_context_pack.mjs /path/to/your/repo "<route-or-module>"
node repolens-perf/scripts/perf_report.mjs /path/to/your/repo "<route-or-module>"
```

Examples:

```bash
node repolens-perf/scripts/build_context_pack.mjs ~/work/app "/dashboard"
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
  graph_metrics.json
  MODULE_SUMMARIES/
  graph/code_graph.json
  context-packs/
  reports/
```

## PerfGraph Workflow

1. Extract deterministic code facts.
2. Build a lightweight JSON code graph.
3. Match a target route, file, component, API, or keyword.
4. Retrieve the K-hop graph neighborhood.
5. Rank context and adjacent risks.
6. Generate a context pack for AI analysis.
7. Produce an evidence-backed performance report and focused coding prompt.

See `repolens-perf/references/perfgraph_algorithm.md` for details.

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
- Confirm high-impact findings with profiling, network traces, API latency measurements, or large fixtures.
- The first version intentionally avoids external databases; the graph is plain JSON for portability.
