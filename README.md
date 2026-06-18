# RepoLens Skill

RepoLens is a lightweight Codex Skill that turns a repository into inspectable project memory, then uses that memory to produce bounded AI context, evidence-backed performance reports, and algorithm opportunity reports.

It is designed for one repeatable path:

```text
codebase -> .project-memory -> code graph -> target trace -> context/report -> algorithm opportunity
```

Instead of asking an AI assistant to guess from the whole repository, RepoLens extracts deterministic code facts, traverses the graph around a route/file/component/API target, and writes artifacts that can be inspected without running any external service.

## Pipeline

1. **Index**: scan files, imports, routes, React components, API references, and static performance signals.
2. **Graph**: write a plain JSON code graph under `.project-memory/graph/code_graph.json`.
3. **Trace**: find a target such as `/activity/:id` and retrieve its K-hop graph neighborhood.
4. **Context**: generate a compact context pack for an AI coding agent.
5. **PerfGraph**: generate a performance report with evidence, risk scores, fix tickets, acceptance criteria, and a focused coding prompt.
6. **AlgoGraph**: build a Block Profile from the same graph evidence, match it to local algorithm cards, and produce an algorithm roadmap with rejected options.

## Outputs

RepoLens produces four output families:

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

.project-memory/traces/
  <target>-trace.md

.project-memory/context-packs/
  <target>.md

.project-memory/reports/
  <target>-perf-report.md

.project-memory/algo/
  block_profiles.json
  algorithm_matches.json
  reports/<target>-algo-report.md
```

The generated `.project-memory/` directory is ignored by Git. Static, pre-generated examples are committed under `examples/generated/` so reviewers can read the result without running the scripts first.

## Why Different From AI Review

RepoLens is not a large prompt. It gives the model a bounded, inspectable context boundary:

- Code facts come from deterministic extraction, not model memory.
- Context is selected by graph traversal around the requested target.
- Performance findings cite files, lines, routes, components, APIs, or graph edges.
- Risk scores are simple and explainable: priority weight + line evidence + graph proximity + adjacency + repeated signal.
- Algorithm matches are constrained to local cards in `repolens-algo/knowledge/algorithm_index.json`.
- Reports include rejected or not-recommended algorithms when the graph evidence is missing data or has a constraint.

## Demo

Runtime requirements:

- Node.js >= 18
- No npm dependencies
- No database, vector store, or external AI API

Run the complete reproducible demo:

```bash
npm run demo
```

That command indexes the included fixture repository, writes the trace/context/report/algo artifacts, and runs the test suite.

Run individual checks:

```bash
npm test
npm run check
```

Open the committed sample outputs:

```text
examples/generated/activity-id-context-pack.md
examples/generated/activity-id-trace.md
examples/generated/activity-id-perf-report.md
examples/generated/activity-id-block-profile.json
examples/generated/activity-id-algorithm-matches.json
examples/generated/activity-id-algo-report.md
```

After `npm run demo`, open the regenerated outputs:

```text
repolens-perf/tests/fixtures/phase-one/.project-memory/traces/activity-id-trace.md
repolens-perf/tests/fixtures/phase-one/.project-memory/context-packs/activity-id.md
repolens-perf/tests/fixtures/phase-one/.project-memory/reports/activity-id-perf-report.md
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/block_profiles.json
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/algorithm_matches.json
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/reports/activity-id-algo-report.md
```

## Use On Another Repository

```bash
node repolens-perf/scripts/index_project.mjs /path/to/repo
node repolens-perf/scripts/trace_module.mjs /path/to/repo "<route-or-module>" --out .project-memory/traces/target-trace.md
node repolens-perf/scripts/build_context_pack.mjs /path/to/repo "<route-or-module>"
node repolens-perf/scripts/perf_report.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/build_block_profiles.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/retrieve_algorithms.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/generate_algo_report.mjs /path/to/repo "<route-or-module>"
```

Example targets:

```bash
node repolens-perf/scripts/perf_report.mjs ~/work/app "/dashboard"
node repolens-perf/scripts/perf_report.mjs ~/work/app "RichTextRenderer"
node repolens-perf/scripts/perf_report.mjs ~/work/app "/api/posts"
```

## Repository Layout

```text
repolens-perf/       PerfGraph Skill, scripts, rules, tests, and fixture
repolens-algo/       AlgoGraph Skill, algorithm cards, scripts, and tests
examples/generated/  committed sample outputs
eval/                baseline comparison
package.json         demo, test, and check commands
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
Use $repolens-perf to index this repository and analyze /activity/:id performance.
Use $repolens-algo to identify algorithm opportunities for /activity/:id.
```

## Boundaries

- Static signals are leads, not proof of runtime slowness.
- Confirm high-impact findings with profiling, network traces, API latency measurements, or large fixtures.
- The first version intentionally avoids external databases; the graph is plain JSON for portability.
