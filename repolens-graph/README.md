# RepoLens Graph

RepoLens Graph is the lightweight code knowledge graph layer behind RepoLens. It distills a repository into `.project-memory`, builds a JSON graph, retrieves target-specific context, and emits supporting performance and algorithm graph signals.

## Runtime

- Node.js >= 18
- No npm dependencies
- No database
- No vector store
- No external AI API required during indexing

## Commands

```bash
node repolens-graph/scripts/index_project.mjs repolens-graph/tests/fixtures/algorithm-catalog
node repolens-graph/scripts/trace_module.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
node repolens-graph/scripts/build_context_pack.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
node repolens-graph/scripts/perf_report.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
node repolens-graph/tests/graph.test.mjs
```

From the repository root, the same demo can be reproduced with:

```bash
npm run demo
```

## Outputs

RepoLens Graph writes generated memory into the analyzed repository:

```text
.project-memory/
  PROJECT_PROFILE.md
  graph/code_graph.json
  graph_metrics.json
  algorithm_signals.json
  context-packs/
  reports/
```

## Fixtures

`tests/fixtures/algorithm-catalog` is the primary algorithm demo. It exposes item metadata, keyword search, tags, ranking signals, and missing feedback logs.

`tests/fixtures/phase-one` is a positive scanner fixture. It deliberately includes unbounded list and N+1-like backend patterns so tests have stable supporting risk evidence. Do not use it as a copy-paste application template.

`tests/fixtures/phase-one-bounded` keeps the same activity route and canonical API endpoint shape while adding pagination and batched author mapping. Tests use it to prove the backend rules do not keep firing after those boundaries are present.

## Scope

RepoLens Graph performs static code graph analysis. It detects graph facts and risk signals, but it does not replace runtime profiling, network traces, API latency checks, or manual review.

Context packs and performance reports intentionally have different scopes. A context pack is a bounded graph handoff artifact for an AI coding agent; a performance report is a supporting artifact, not the main RepoLens product surface.
