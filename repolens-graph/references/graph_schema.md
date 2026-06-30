# RepoLens Graph Schema

Use this schema when extending scanners or interpreting `.project-memory/graph/code_graph.json`.

## Nodes

| Type | ID Format | Meaning |
|---|---|---|
| `File` | `File:<path>` | A source, style, backend, test, or docs file. |
| `ReactComponent` | `ReactComponent:<name>:<path>` | A detected React component declaration. |
| `Route` | `Route:<method>:<path>` | A frontend route or backend route decorator. |
| `APIEndpoint` | `APIEndpoint:<method>:<url>` | A frontend request target or backend endpoint. |
| `PerformanceRisk` | `PerformanceRisk:<rule>:<path>` | A deterministic static signal tied to a file. |
| `DataEntity` | `DataEntity:<entity>:<path>` | A code-visible domain object such as item, user, tag, query, content, or document. |
| `UserAction` | `UserAction:<action>:<path>` | A visible behavior or feedback action such as search, exposure, click, or feedback. |
| `RankingSignal` | `RankingSignal:<signal>:<path>` | A ranking feature or scoring signal such as score, popularity, recency, text similarity, or semantic similarity. |
| `AlgorithmOpportunity` | `AlgorithmOpportunity:<task>:<path>` | A bounded opportunity such as recommendation, ranking, search, retrieval, or personalization. |

## Edges

| Edge | Source -> Target | Meaning |
|---|---|---|
| `imports` | `File -> File` | One file imports another local file. |
| `exports` | `File -> ReactComponent` | A file declares or exports a component. |
| `renders` | `Route/ReactComponent -> ReactComponent` | A route or component renders a component. |
| `routesTo` | `Route -> File` | A route is declared in, or resolves to, a file. |
| `requests` | `File -> APIEndpoint` | Frontend code calls an API endpoint. |
| `defines` | `File -> APIEndpoint` | Backend code defines an API endpoint. |
| `mayCause` | `File/ReactComponent -> PerformanceRisk` | Static rules found a possible risk. |
| `mentions` | `File/ReactComponent -> DataEntity` | Code mentions a domain entity useful for Block Profiles. |
| `captures` | `File/ReactComponent -> UserAction` | Code captures or names a user behavior signal. |
| `usesSignal` | `File/ReactComponent -> RankingSignal` | Code uses a ranking or scoring signal. |
| `exposes` | `APIEndpoint -> DataEntity/UserAction/RankingSignal` | An API endpoint exposes graph facts from its defining or calling file. |
| `suggests` | `File -> AlgorithmOpportunity` | A file has enough graph evidence to suggest an algorithmic task. |
| `supports` | `DataEntity/UserAction/RankingSignal -> AlgorithmOpportunity` | A graph fact supports a specific algorithm opportunity. |

## Generated Graph Artifacts

| File | Meaning |
|---|---|
| `.project-memory/graph/code_graph.json` | Full node/edge graph. |
| `.project-memory/algorithm_signals.json` | Extracted algorithm graph facts before graph materialization. |
| `.project-memory/graph_metrics.json` | Node/edge counts, fan-out nodes, risk-adjacent nodes, and route risk density. |
| `.project-memory/traces/<target>-context-graph.json` | Bounded K-hop subgraph used by context packs, Block Profiles, and reports. |
| `.project-memory/context-packs/<target>.md` | Readable Markdown view over the bounded context graph. |

## Algorithm Fact Metadata

Algorithm fact nodes keep the older stable fields so existing consumers can continue to read them:

| Field | Meaning |
|---|---|
| `id` | Stable fact key such as `item`, `query`, `explicit_score`, or `recommendation`. |
| `label` | Reader-facing label. |
| `file` | Source file where the fact was detected or inferred. |
| `evidence` | Best available `{ line, text }` snippet for the fact. |

Newer facts may also include:

| Field | Meaning |
|---|---|
| `source` | Detector or inference source, for example `static:data_entity_detector` or `inference:algorithm_opportunity`. |
| `confidence` | Static evidence confidence from `0` to `1`; this is not a runtime metric or model probability. |

## Interpretation

- Use a 2-hop neighborhood for narrow files or leaf components.
- Use a 3-hop neighborhood for route-to-component tracing.
- Use a 4-hop neighborhood for route performance reports that should include API client calls.
- Treat `PerformanceRisk` nodes as supporting leads. Confirm important runtime claims with code reading or measurement.
- Treat algorithm nodes as opportunity evidence, not a mandate to implement an algorithm. They describe why an algorithm route may be worth evaluating, not that it must be shipped.
- Prefer graph neighborhoods over full-repo context so the analysis remains focused.

## Extension Checklist

1. Add the detector to `scripts/index_project.mjs`.
2. Emit a stable `rule` string and a clear `evidence` object with `line` and `text` when possible.
3. Add the rule to the matching reference file.
4. Keep graph metrics and context pack output compatible with existing node and edge fields.
5. Ensure `perf_report.mjs` can turn the rule into a fix ticket with rule-specific acceptance criteria.
