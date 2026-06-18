# RepoLens AlgoGraph

RepoLens AlgoGraph is a small algorithm opportunity layer on top of RepoLens `.project-memory`.

It does not replace the existing PerfGraph workflow. It reuses the code graph, context evidence, routes, components, APIs, and performance signals to build a structured Block Profile, then matches that profile against local algorithm cards.

## What It Answers

- What algorithmic problem is hidden behind this code module?
- Is this a recommendation, ranking, search, retrieval, or personalization opportunity?
- What data is already visible in code?
- What data is missing before using heavier algorithms?
- Which first algorithm route is safe to implement now?
- Which algorithms should not be used yet?

## Runtime

- Node.js >= 18
- No npm dependencies
- No database
- No vector store
- No external AI API required

## Commands

Run the existing PerfGraph index first:

```bash
npm run demo:index
```

Then run AlgoGraph for the demo route:

```bash
npm run demo:algo
```

Or call the scripts directly:

```bash
node repolens-algo/scripts/build_block_profiles.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-algo/scripts/retrieve_algorithms.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-algo/scripts/generate_algo_report.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
```

## Outputs

```text
.project-memory/algo/block_profiles.json
.project-memory/algo/algorithm_matches.json
.project-memory/algo/reports/activity-id-algo-report.md
```

## Design Boundary

AlgoGraph only recommends algorithms from local cards in `knowledge/algorithm_index.json`. This keeps the output bounded and avoids generic AI brainstorming.
