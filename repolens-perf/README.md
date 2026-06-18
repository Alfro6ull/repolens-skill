# RepoLens PerfGraph

RepoLens PerfGraph is a lightweight code graph analysis Skill. It distills a repository into `.project-memory`, builds a JSON code graph, retrieves a target-specific context pack, and generates module-level performance and risk reports.

## Runtime

- Node.js >= 18
- No npm dependencies
- No database
- No vector store
- No external AI API required during indexing

## Commands

```bash
node repolens-perf/scripts/index_project.mjs repolens-perf/tests/fixtures/phase-one
node repolens-perf/scripts/trace_module.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-perf/scripts/build_context_pack.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-perf/scripts/perf_report.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-perf/tests/perfgraph.test.mjs
```

From the repository root, the same demo can be reproduced with:

```bash
npm run demo
```

## Outputs

PerfGraph writes generated memory into the analyzed repository:

```text
.project-memory/
  PROJECT_PROFILE.md
  graph/code_graph.json
  graph_metrics.json
  context-packs/
  reports/
```

## Scope

PerfGraph performs static code graph analysis. It detects risk signals and generates evidence-based reports, but it does not replace runtime profiling, network traces, API latency checks, or manual review.

Context packs and performance reports intentionally have different scopes. A context pack is a narrower handoff artifact for an AI coding agent; a performance report may include a wider analysis neighborhood so it can cite adjacent risk evidence and produce fix tickets.
