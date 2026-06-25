# RepoLens AlgoGraph

RepoLens AlgoGraph is the algorithm opportunity layer on top of the RepoLens code knowledge graph.

It reuses graph evidence such as routes, components, APIs, data entities, user actions, ranking signals, and supporting performance signals to build a structured Block Profile. The profile is then matched against local algorithm cards.

## What It Answers

- What algorithmic problem is hidden behind this code module?
- Is this a basic algorithm-debt issue, or a recommendation, ranking, search, retrieval, or personalization opportunity?
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

Run the graph index first:

```bash
npm run demo:index
```

Then run AlgoGraph for the demo route:

```bash
npm run demo:algo
```

Or call the scripts directly:

```bash
node repolens-algo/scripts/build_block_profiles.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
node repolens-algo/scripts/retrieve_algorithms.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
node repolens-algo/scripts/generate_algo_report.mjs repolens-graph/tests/fixtures/algorithm-catalog "/discover"
```

## Outputs

```text
.project-memory/algo/block_profiles.json
.project-memory/algo/algorithm_matches.json
.project-memory/algo/reports/discover-algo-report.md
```

## Design Boundary

AlgoGraph only recommends algorithms from local cards in `knowledge/algorithm_index.json`. This keeps the output bounded and avoids generic AI brainstorming. If the graph does not expose decision, lookup, rule, ranking, retrieval, or personalization evidence, AlgoGraph should say that no algorithm route is recommended yet.

The card set has two layers:

- Basic algorithm debt: indexed lookup, rule table, batch loading, bounded Top-K, and explainable scoring.
- Higher-level routes: content-based recommendation, collaborative filtering, hybrid search, semantic retrieval, learning-to-rank, and contextual bandit exploration.
