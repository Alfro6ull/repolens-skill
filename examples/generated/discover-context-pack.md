# Context Pack: /discover

## Target

- Query: /discover
- Hops: 4
- Start nodes: 6
- Included nodes: 31
- Included edges: 86
- Source graph: .project-memory/traces/discover-context-graph.json

## Start Nodes

- File: src/api/discovery.ts (File:src/api/discovery.ts)
- File: src/pages/DiscoverPage.tsx (File:src/pages/DiscoverPage.tsx)
- ReactComponent: DiscoverPage (ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx)
- Route: GET /api/discover/works (Route:GET:/api/discover/works)
- Route: GET /discover (Route:GET:/discover)
- APIEndpoint: GET /api/discover/works (APIEndpoint:GET:/api/discover/works)

## Graph Neighborhood

| Score | Distance | Type | Node | Why Included |
|---:|---:|---|---|---|
| 15 | 0 | APIEndpoint | GET /api/discover/works | target match |
| 15 | 0 | Route | GET /api/discover/works | target match |
| 15 | 0 | Route | GET /discover | target match |
| 14 | 0 | ReactComponent | DiscoverPage | target match |
| 13 | 0 | File | src/api/discovery.ts | target match |
| 13 | 0 | File | src/pages/DiscoverPage.tsx | target match |
| 9 | 1 | AlgorithmOpportunity | ranking | suggests from File:src/pages/DiscoverPage.tsx |
| 9 | 1 | AlgorithmOpportunity | recommendation | suggests from File:src/api/discovery.ts |
| 9 | 1 | AlgorithmOpportunity | recommendation | suggests from File:src/pages/DiscoverPage.tsx |
| 9 | 1 | AlgorithmOpportunity | search | suggests from File:src/api/discovery.ts |
| 8 | 1 | DataEntity | content metadata | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | DataEntity | content metadata | mentions from File:src/pages/DiscoverPage.tsx |
| 8 | 1 | DataEntity | item | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | DataEntity | item | mentions from File:src/api/discovery.ts |
| 8 | 1 | DataEntity | item | mentions from File:src/pages/DiscoverPage.tsx |
| 8 | 1 | DataEntity | query | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | DataEntity | query | mentions from File:src/api/discovery.ts |
| 8 | 1 | DataEntity | tag | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | DataEntity | tag | mentions from File:src/api/discovery.ts |
| 8 | 1 | DataEntity | tag | mentions from File:src/pages/DiscoverPage.tsx |
| 8 | 1 | RankingSignal | explicit score | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | RankingSignal | explicit score | usesSignal from File:src/pages/DiscoverPage.tsx |
| 8 | 1 | RankingSignal | text similarity | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | RankingSignal | text similarity | usesSignal from File:src/pages/DiscoverPage.tsx |
| 8 | 1 | UserAction | search | exposes from APIEndpoint:GET:/api/discover/works |
| 8 | 1 | UserAction | search | captures from File:src/api/discovery.ts |
| 8 | 2 | AlgorithmOpportunity | ranking | suggests from File:backend/main.py |
| 8 | 2 | AlgorithmOpportunity | recommendation | suggests from File:backend/main.py |
| 8 | 2 | AlgorithmOpportunity | search | suggests from File:backend/main.py |
| 7 | 1 | File | backend/main.py | routesTo from Route:GET:/api/discover/works |
| 6 | 1 | File | src/App.tsx | imports to File:src/pages/DiscoverPage.tsx |

## Evidence Edges

Showing 47 of 68 deduplicated edge(s). The full machine-readable graph is in the JSON context graph.

| Source | Edge | Target | Evidence |
|---|---|---|---|
| GET /api/discover/works | routesTo | backend/main.py | line 6 |
| GET /discover | renders | DiscoverPage | line 5 |
| GET /discover | routesTo | src/App.tsx | line 5 |
| backend/main.py | defines | GET /api/discover/works | line 6 |
| src/api/discovery.ts | requests | GET /api/discover/works | line 7 |
| src/pages/DiscoverPage.tsx | exports | DiscoverPage | line 4 |
| src/App.tsx | imports | src/pages/DiscoverPage.tsx | line 2 |
| src/pages/DiscoverPage.tsx | imports | src/api/discovery.ts | line 2 |
| GET /api/discover/works | exposes | content metadata | line 23: "title": work["title"], |
| GET /api/discover/works | exposes | explicit score | line 19: ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True) |
| GET /api/discover/works | exposes | item | line 6: @app.get("/api/discover/works") |
| GET /api/discover/works | exposes | item | line 7: const response = await fetch(`/api/discover/works?${params.toString()}`); |
| GET /api/discover/works | exposes | query | line 8: q: str = "", |
| GET /api/discover/works | exposes | query | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| GET /api/discover/works | exposes | search | line 8: q: str = "", |
| GET /api/discover/works | exposes | search | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| GET /api/discover/works | exposes | tag | line 9: tags: str = "", |
| GET /api/discover/works | exposes | tag | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| GET /api/discover/works | exposes | text similarity | line 19: ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True) |
| DiscoverPage | mentions | content metadata | line 19: <img src={featuredWork.coverUrl} alt="" loading="lazy" /> |
| DiscoverPage | mentions | item | line 6: const [works, setWorks] = useState([]); |
| DiscoverPage | mentions | tag | line 21: <p>{featuredWork.tags.join(", ")}</p> |
| DiscoverPage | usesSignal | explicit score | line 22: <strong>{featuredWork.score}</strong> |
| DiscoverPage | usesSignal | text similarity | line 20: <h2>{featuredWork.title}</h2> |
| src/api/discovery.ts | captures | search | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| src/api/discovery.ts | mentions | item | line 7: const response = await fetch(`/api/discover/works?${params.toString()}`); |
| src/api/discovery.ts | mentions | query | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| src/api/discovery.ts | mentions | tag | line 1: export async function searchWorks(query: string, tags: string[] = []) { |
| src/pages/DiscoverPage.tsx | mentions | content metadata | line 19: <img src={featuredWork.coverUrl} alt="" loading="lazy" /> |
| src/pages/DiscoverPage.tsx | mentions | item | line 6: const [works, setWorks] = useState([]); |
| src/pages/DiscoverPage.tsx | mentions | tag | line 21: <p>{featuredWork.tags.join(", ")}</p> |
| src/pages/DiscoverPage.tsx | usesSignal | explicit score | line 22: <strong>{featuredWork.score}</strong> |
| src/pages/DiscoverPage.tsx | usesSignal | text similarity | line 20: <h2>{featuredWork.title}</h2> |
| backend/main.py | captures | search | line 8: q: str = "", |
| backend/main.py | mentions | content metadata | line 23: "title": work["title"], |
| backend/main.py | mentions | item | line 6: @app.get("/api/discover/works") |
| backend/main.py | mentions | query | line 8: q: str = "", |
| backend/main.py | mentions | tag | line 9: tags: str = "", |
| backend/main.py | usesSignal | explicit score | line 19: ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True) |
| backend/main.py | usesSignal | text similarity | line 19: ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True) |
| src/api/discovery.ts | suggests | recommendation | line 7: const response = await fetch(`/api/discover/works?${params.toString()}`); |
| src/api/discovery.ts | suggests | search | line 7: const response = await fetch(`/api/discover/works?${params.toString()}`); |
| src/pages/DiscoverPage.tsx | suggests | ranking | line 6: const [works, setWorks] = useState([]); |
| src/pages/DiscoverPage.tsx | suggests | recommendation | line 6: const [works, setWorks] = useState([]); |
| backend/main.py | suggests | ranking | line 6: @app.get("/api/discover/works") |
| backend/main.py | suggests | recommendation | line 6: @app.get("/api/discover/works") |
| backend/main.py | suggests | search | line 6: @app.get("/api/discover/works") |

## Supporting Performance Signals

| Score | Priority | Rule | Evidence | Recommended Fix |
|---:|---|---|---|---|
| - | - | - | No risk node in context | Review runtime metrics |

## Recommended Context For AI

Use this pack as a readable view of the context graph. Prefer the JSON context graph for downstream analysis.

### Files To Inspect

- backend/main.py
- src/App.tsx
- src/api/discovery.ts
- src/pages/DiscoverPage.tsx

### Evidence Rules

- Every algorithm or performance claim should cite a route, file, component, API endpoint, graph fact, edge, or rule from this pack.
- Treat static risks as leads until profiling, network traces, or API measurements confirm runtime impact.
- Keep fixes within this graph neighborhood unless a direct dependency proves a wider change is necessary.

