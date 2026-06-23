# PerfGraph Algorithm

PerfGraph is the lightweight graph workflow behind RepoLens. It is not a machine-learning model; it is a deterministic extraction and retrieval layer that gives AlgoGraph and AI coding agents a bounded, evidence-rich context before analysis.

## 1. Code Fact Extraction

`index_project.mjs` extracts deterministic facts from the repository:

- source files and file kinds
- local import relationships
- frontend routes and backend route decorators
- React component declarations and render edges
- frontend API calls and backend API endpoint definitions
- static performance signals such as large list rendering, duplicated requests, missing pagination, and N+1-style calls
- algorithm graph facts such as data entities, user actions, ranking signals, and algorithm opportunities

## 2. Graph Construction

Each extracted fact becomes a node or edge in `.project-memory/graph/code_graph.json`.

Core node types:

- `File`
- `ReactComponent`
- `Route`
- `APIEndpoint`
- `PerformanceRisk`
- `DataEntity`
- `UserAction`
- `RankingSignal`
- `AlgorithmOpportunity`

Core edge types:

- `imports`
- `exports`
- `renders`
- `routesTo`
- `requests`
- `defines`
- `mayCause`
- `mentions`
- `captures`
- `usesSignal`
- `suggests`
- `supports`
- `exposes`

## 3. Target Matching

A user target can be a route, file path, component name, API path, or keyword. RepoLens matches it against node ids, labels, and relevant metadata fields such as `file`, `path`, and `url`.

The matched nodes become start nodes for retrieval.

## 4. K-Hop Graph Retrieval

RepoLens expands from the start nodes with bounded breadth-first search. The default depths are:

- 3 hops for route-to-component tracing
- 4 hops for route performance reports that should include API client calls

The graph is traversed as an undirected evidence graph during retrieval so callers, callees, imports, routes, and adjacent risks can all be included without scanning the entire repository.

## 5. Context Ranking

Context packs rank included nodes by a simple deterministic score:

```text
context_score = target_match
              + proximity_weight
              + node_type_weight
              + risk_adjacency_weight
              + centrality_weight
```

Current implementation materializes this score in the `Graph Neighborhood` table of each context pack, then sorts higher-scoring nodes first so route, API, component, file, and risk evidence stays close to the AI prompt.

## 6. Risk Scoring

Performance risks are prioritized from static rule metadata and graph position:

```text
risk_score = priority_weight
           + evidence_weight
           + graph_proximity_weight
           + repeated_signal_weight
           + affected_module_weight
```

`perf_report.mjs` materializes this score in the `Risk Table` and each generated fix ticket. `P1` risks are likely to affect route scalability, payload size, or visible latency. `P2` risks usually indicate repeated work or medium render/network cost. `P3` risks are maintainability or future scalability leads.

## 7. AI Evidence Constraints

The AI should receive only the ranked graph neighborhood, project profile, relevant rule references, and report template. Every performance claim must cite at least one concrete evidence source:

- route
- file
- component
- API endpoint
- graph edge
- performance rule
- evidence line

Static findings remain leads until confirmed with profiling, browser traces, API latency logs, or large fixtures.

## 8. Algorithm Evidence

AlgoGraph builds Block Profiles from the same graph. Prefer graph facts over raw source text when identifying:

- entities such as item, user, tag, query, content, or document
- actions such as search, exposure, click, or feedback
- ranking signals such as score, popularity, recency, text similarity, or semantic similarity
- opportunities such as recommendation, ranking, search, retrieval, or personalization

If these graph facts are missing, AlgoGraph should avoid recommending an algorithm and instead state what evidence must be added first.
