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

## Generated Graph Artifacts

| File | Meaning |
|---|---|
| `.project-memory/graph/code_graph.json` | Full node/edge graph. |
| `.project-memory/graph_metrics.json` | Node/edge counts, fan-out nodes, risk-adjacent nodes, and route risk density. |
| `.project-memory/context-packs/<target>.md` | Bounded K-hop evidence pack for AI analysis. |

## Interpretation

- Use a 2-hop neighborhood for narrow files or leaf components.
- Use a 3-hop neighborhood for route-to-component tracing.
- Use a 4-hop neighborhood for route performance reports that should include API client calls.
- Treat `PerformanceRisk` nodes as leads. Confirm important claims with code reading or runtime measurement.
- Prefer graph neighborhoods over full-repo context so the analysis remains focused.

## Extension Checklist

1. Add the detector to `scripts/index_project.mjs`.
2. Emit a stable `rule` string and a clear `evidence` object with `line` and `text` when possible.
3. Add the rule to the matching reference file.
4. Keep graph metrics and context pack output compatible with existing node and edge fields.
5. Ensure `perf_report.mjs` can turn the rule into a fix ticket with rule-specific acceptance criteria.
