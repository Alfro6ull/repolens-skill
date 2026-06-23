# RepoLens Skill

RepoLens is a lightweight Codex Skill that turns a repository into an inspectable code knowledge graph, then uses that graph to find algorithm opportunities such as recommendation, ranking, search, retrieval, and personalization.

It is designed for one repeatable path:

```text
codebase -> .project-memory -> code knowledge graph -> Block Profile -> algorithm match -> roadmap
```

Instead of asking an AI assistant to guess from the whole repository, RepoLens extracts deterministic code facts, traverses the graph around a route/file/component/API target, and maps the resulting Block Profile to local algorithm cards.

## Pipeline

1. **Index**: scan files, imports, routes, React components, API references, performance signals, and algorithm graph facts.
2. **Graph**: write a plain JSON code graph under `.project-memory/graph/code_graph.json`.
3. **Trace**: find a target such as `/discover` and retrieve its K-hop graph neighborhood.
4. **Profile**: build a Block Profile with data entities, user actions, ranking signals, constraints, and objectives.
5. **Match**: compare the profile to local algorithm cards.
6. **Roadmap**: produce an algorithm route with missing data, rejected options, and a focused implementation prompt.

## Outputs

RepoLens produces these generated artifacts:

```text
.project-memory/
  PROJECT_PROFILE.md
  files.json
  imports.json
  routes.json
  components.json
  apis.json
  performance_signals.json
  algorithm_signals.json
  graph_metrics.json
  MODULE_SUMMARIES/
  graph/code_graph.json

.project-memory/traces/
  <target>-trace.md

.project-memory/context-packs/
  <target>.md

.project-memory/algo/
  block_profiles.json
  algorithm_matches.json
  reports/<target>-algo-report.md

.project-memory/reports/
  <target>-perf-report.md
```

The generated `.project-memory/` directory is ignored by Git. Static, pre-generated examples are committed under `examples/generated/` so readers can inspect the result without running the scripts first.

## Why Different From Generic Review

RepoLens is not a general review checklist. It gives the model a bounded algorithm evidence graph:

- Code facts come from deterministic extraction, not model memory.
- Context is selected by graph traversal around the requested target.
- Algorithm profiles cite data entities, user actions, ranking signals, routes, components, APIs, or graph edges.
- Algorithm matches are constrained to local cards in `repolens-algo/knowledge/algorithm_index.json`.
- Reports include rejected or not-recommended algorithms when the graph evidence is missing data or has a constraint.
- Performance risks remain supporting graph signals, not the main product surface.

## Demo

Runtime requirements:

- Node.js >= 18
- No npm dependencies
- No database, vector store, or external AI API

Run the complete reproducible demo:

```bash
npm run demo
```

That command indexes the algorithm fixture, writes the trace/context/report/algo artifacts, and runs the test suite.

Run individual checks:

```bash
npm test
npm run check
```

Open the committed sample outputs:

```text
examples/generated/discover-context-pack.md
examples/generated/discover-trace.md
examples/generated/discover-block-profile.json
examples/generated/discover-algorithm-matches.json
examples/generated/discover-algo-report.md
```

After `npm run demo`, open the regenerated outputs:

```text
repolens-perf/tests/fixtures/algorithm-catalog/.project-memory/traces/discover-trace.md
repolens-perf/tests/fixtures/algorithm-catalog/.project-memory/context-packs/discover.md
repolens-perf/tests/fixtures/algorithm-catalog/.project-memory/algo/block_profiles.json
repolens-perf/tests/fixtures/algorithm-catalog/.project-memory/algo/algorithm_matches.json
repolens-perf/tests/fixtures/algorithm-catalog/.project-memory/algo/reports/discover-algo-report.md
```

## Fixtures

The `algorithm-catalog` fixture is the primary demo. It has content items, tags, keyword search, ranking signals, and intentionally missing click/exposure logs so AlgoGraph can recommend a simple algorithm route and reject heavier options.

The `phase-one` fixture intentionally contains performance risks so the scanner has positive regression coverage. It is not a production app template. Tests assert that this fixture emits `missing_pagination`, `large_response_payload`, and `n_plus_one_query`.

The `phase-one-bounded` fixture keeps the same route and API shape but adds pagination bounds and batched author mapping. Tests use it as negative coverage to make sure fixed backend patterns do not keep triggering those rules.

The `no-algorithm-signal` fixture is a guardrail: it proves AlgoGraph does not force a recommendation when the graph lacks item, query, ranking, retrieval, or personalization evidence.

## Use On Another Repository

```bash
node repolens-perf/scripts/index_project.mjs /path/to/repo
node repolens-perf/scripts/trace_module.mjs /path/to/repo "<route-or-module>" --out .project-memory/traces/target-trace.md
node repolens-perf/scripts/build_context_pack.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/build_block_profiles.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/retrieve_algorithms.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/generate_algo_report.mjs /path/to/repo "<route-or-module>"
```

Example targets:

```bash
node repolens-algo/scripts/build_block_profiles.mjs ~/work/app "/discover"
node repolens-algo/scripts/generate_algo_report.mjs ~/work/app "/api/search"
node repolens-perf/scripts/trace_module.mjs ~/work/app "RecommendationFeed"
```

## Repository Layout

```text
repolens-perf/       Knowledge graph indexer, trace, context packs, supporting performance signals
repolens-algo/       Block Profiles, algorithm cards, matching, and algorithm reports
examples/generated/  committed sample outputs
eval/                baseline comparison
package.json         demo, test, and check commands
scripts/             repository validation helpers
```

## Skill Usage

The reusable Skills live in `repolens-perf/` and `repolens-algo/`. To install them for Codex discovery, copy or symlink those folders into your Codex skills directory.

```bash
mkdir -p ~/.codex/skills
cp -R repolens-perf ~/.codex/skills/
cp -R repolens-algo ~/.codex/skills/
```

Then invoke them in Codex:

```text
Use $repolens-perf to index this repository and trace /discover.
Use $repolens-algo to identify algorithm opportunities for /discover.
```

## Boundaries

- Static signals are leads, not proof of runtime slowness.
- Algorithm recommendations are bounded by local cards and graph evidence.
- Confirm high-impact findings with profiling, network traces, API latency measurements, or large fixtures.
- The first version intentionally avoids external databases, vector stores, and heavy AST frameworks; the graph is plain JSON for portability.
