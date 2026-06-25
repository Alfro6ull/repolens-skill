# RepoLens Skill

RepoLens is a lightweight Codex Skill that turns a repository into an inspectable code knowledge graph, then uses that graph to find algorithm opportunities such as recommendation, ranking, search, retrieval, and personalization.

It is designed for one repeatable path:

```text
codebase -> .project-memory -> code knowledge graph -> Block Profile -> algorithm match -> roadmap
```

Instead of asking an AI assistant to guess from the whole repository, RepoLens extracts deterministic code facts, traverses the graph around a route/file/component/API target, and maps the resulting Block Profile to local algorithm cards.

Business context comes from three layers:

```text
code facts first -> user target sets the boundary -> optional business description calibrates meaning
```

The code graph supplies observable facts such as routes, APIs, entities, actions, filters, sorts, scores, risks, and feedback signals. The user points RepoLens at the module that matters. Any business description, such as "lead assignment" or "inventory risk," improves naming and interpretation but is not the only source of evidence.

Code-derived business context is evidence, not ground truth. RepoLens can show that a module contains `score`, `priority`, `assign`, or `risk` signals, but a human still confirms whether those signals mean lead scoring, ticket urgency, inventory exposure, or a temporary workaround. The Skill is intentionally human-in-the-loop: it reduces context guessing, then asks the user to validate business meaning before following an algorithm route.

## Current Status

RepoLens is currently a small, local-first prototype focused on the AlgoGraph path:

- **Working**: repository indexing, JSON code graph generation, target tracing, context packs, Block Profiles, local algorithm matching, algorithm opportunity reports, reproducible demo fixtures, and CI.
- **Intentionally supporting**: performance signals, which remain graph evidence and regression coverage rather than the main product surface.
- **Recently added**: basic algorithm-debt cards for indexed lookup, rule tables, batch loading, bounded Top-K, and explainable scoring, plus card-level `required_signals` so heavier algorithms are blocked when the graph lacks the necessary evidence.
- **Not added**: database, vector store, Web UI, external AI API, dependency-heavy AST pipeline, or broad review scanner behavior.

The next useful expansion is not "more algorithms" by default. Algorithm cards should grow only when the code graph can expose the evidence needed to decide whether that algorithm is currently usable.

## When This Skill Is Useful

RepoLens is not meant to force algorithm work into every repository. Many CRUD, admin, ERP, or CRM systems do not need fine-grained algorithm optimization in their early or ordinary workflows.

RepoLens becomes useful when a business module starts to contain a **decision surface**: a place where the system selects, ranks, filters, matches, prioritizes, routes, or recommends records for a user or downstream process.

The first useful finding is often not a machine-learning opportunity. It is usually an **algorithmic debt** hidden in business logic:

- brute-force scans over records that should be indexed, bounded, cached, or batched
- long `if/else` decision trees that should become rule tables or policy objects
- hard-coded scoring formulas spread across files
- duplicated filters between frontend, API clients, and backend routes
- hand-written matching or routing logic without visible inputs, metrics, or fallback behavior

RepoLens should surface these basic decision patterns before suggesting higher-level algorithms. The upgrade path can be a rule table, indexed lookup, batched matching, explainable scoring function, or cached query boundary; it does not have to be ML.

Examples:

- A CRM page stops being a plain customer table and starts ranking leads, deduplicating accounts, prioritizing follow-ups, or routing tasks.
- An ERP workflow starts selecting suppliers, forecasting stock risk, prioritizing orders, detecting anomalies, or recommending replenishment.
- A marketplace, content app, learning system, or support tool starts depending on search relevance, ranking quality, or matching quality.
- A dashboard starts surfacing "what to act on next" rather than only listing records.

For plain CRUD screens, RepoLens should often say "no algorithm route recommended." That is a feature, not a failure. The Skill is valuable because it makes that boundary explicit instead of inventing generic AI advice.

## Pipeline

1. **Index**: scan files, imports, routes, React components, API references, performance signals, and algorithm graph facts.
2. **Graph**: write a plain JSON code graph under `.project-memory/graph/code_graph.json`.
3. **Trace**: find a target such as `/discover` and retrieve its K-hop graph neighborhood.
4. **Profile**: build a Block Profile with data entities, user actions, ranking signals, constraints, and objectives.
5. **Match**: compare the profile to local algorithm cards, including card-level required signals.
6. **Roadmap**: produce an algorithm route with missing data, rejected options, and a focused implementation prompt.

### K-Hop Context Boundary

RepoLens uses K-hop graph neighborhoods as its context boundary. A target such as `/discover` is matched to graph nodes, then the trace walks outward through routes, components, files, API endpoints, data entities, user actions, ranking signals, and supporting risk nodes.

K-hop is the chunking radius: too small can miss the backend or API evidence; too large can pull in unrelated modules. RepoLens writes the trace and context pack to disk so this context boundary can be inspected instead of hidden inside a prompt.

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
- Heavier algorithms can declare `required_signals`, so missing exposure logs, feedback logs, or semantic signals become explicit `candidate_later` or `blocked_now` outcomes.
- Reports include rejected or not-recommended algorithms when the graph evidence is missing data or has a constraint.
- Performance risks remain supporting graph signals, not the main product surface.

## Algorithm Card Expansion

Algorithm cards are the opinionated knowledge layer. They should be expanded from code-visible opportunities, not from a generic algorithm catalog.

Good card sources:

- **Search and retrieval surfaces**: query text, title/body/tags, documents, chunks, semantic similarity, bounded result sets.
- **Ranking surfaces**: explicit scores, positions, multi-feature sort keys, exposure logs, click or feedback logs.
- **Recommendation surfaces**: items, tags, content metadata, user-item events, session sequences, behavior logs.
- **Algorithmic debt surfaces**: brute-force scans, nested business conditions, hard-coded scoring, duplicated filters, manual matching, routing rules.
- **Missing-data blockers**: no exposure logs, no feedback, no item metadata, no stable reward, no document chunks, no semantic signal.

Current card families:

- **Basic algorithm debt**: `indexed_lookup`, `rule_table`, `batch_loading`, `bounded_top_k`, `explainable_scoring`.
- **Search and retrieval**: `hybrid_search_rag`, `semantic_retrieval`.
- **Recommendation and personalization**: `content_based_recommendation`, `collaborative_filtering`.
- **Heavier ranking and exploration**: `learning_to_rank`, `contextual_bandit`.

Near-term card candidates:

- `popularity_baseline`: a simple baseline route for item lists and ranking surfaces.
- `bm25_keyword_search`: an explainable search card for query plus text fields before semantic retrieval is justified.
- `session_based_recommendation`: only when the graph sees session or sequence signals.

Avoid adding cards for deep recommenders, full RL, graph neural networks, or vector-database-specific designs until the graph can detect the required data boundary.

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
repolens-graph/tests/fixtures/algorithm-catalog/.project-memory/traces/discover-trace.md
repolens-graph/tests/fixtures/algorithm-catalog/.project-memory/context-packs/discover.md
repolens-graph/tests/fixtures/algorithm-catalog/.project-memory/algo/block_profiles.json
repolens-graph/tests/fixtures/algorithm-catalog/.project-memory/algo/algorithm_matches.json
repolens-graph/tests/fixtures/algorithm-catalog/.project-memory/algo/reports/discover-algo-report.md
```

## Fixtures

The `algorithm-catalog` fixture is the primary demo. It has content items, tags, keyword search, ranking signals, and intentionally missing click/exposure logs so AlgoGraph can recommend a simple algorithm route and reject heavier options.

The `phase-one` fixture intentionally contains performance risks so the scanner has positive regression coverage. It is not a production app template. Tests assert that this fixture emits `missing_pagination`, `large_response_payload`, and `n_plus_one_query`.

The `phase-one-bounded` fixture keeps the same route and API shape but adds pagination bounds and batched author mapping. Tests use it as negative coverage to make sure fixed backend patterns do not keep triggering those rules.

The `no-algorithm-signal` fixture is a guardrail: it proves AlgoGraph does not force a recommendation when the graph lacks item, query, ranking, retrieval, or personalization evidence.

## Use On Another Repository

```bash
node repolens-graph/scripts/index_project.mjs /path/to/repo
node repolens-graph/scripts/trace_module.mjs /path/to/repo "<route-or-module>" --out .project-memory/traces/target-trace.md
node repolens-graph/scripts/build_context_pack.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/build_block_profiles.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/retrieve_algorithms.mjs /path/to/repo "<route-or-module>"
node repolens-algo/scripts/generate_algo_report.mjs /path/to/repo "<route-or-module>"
```

Example targets:

```bash
node repolens-algo/scripts/build_block_profiles.mjs ~/work/app "/discover"
node repolens-algo/scripts/generate_algo_report.mjs ~/work/app "/api/search"
node repolens-graph/scripts/trace_module.mjs ~/work/app "RecommendationFeed"
```

## Repository Layout

```text
repolens-graph/       Knowledge graph indexer, trace, context packs, supporting performance signals
repolens-algo/       Block Profiles, algorithm cards, matching, and algorithm reports
examples/generated/  committed sample outputs
eval/                baseline comparison
package.json         demo, test, and check commands
scripts/             repository validation helpers
```

## Skill Usage

The reusable Skills live in `repolens-graph/` and `repolens-algo/`. To install them for Codex discovery, copy or symlink those folders into your Codex skills directory.

```bash
mkdir -p ~/.codex/skills
cp -R repolens-graph ~/.codex/skills/
cp -R repolens-algo ~/.codex/skills/
```

Then invoke them in Codex:

```text
Use $repolens-graph to index this repository and trace /discover.
Use $repolens-algo to identify algorithm opportunities for /discover.
```

## Boundaries

- Static signals are leads, not proof of runtime slowness.
- Algorithm recommendations are bounded by local cards and graph evidence.
- Confirm high-impact findings with profiling, network traces, API latency measurements, or large fixtures.
- The first version intentionally avoids external databases, vector stores, and heavy AST frameworks; the graph is plain JSON for portability.
