# Context Pack: /activity/:id

## Target

- Query: /activity/:id
- Hops: 4
- Start nodes: 1
- Included nodes: 13
- Included edges: 16

## Start Nodes

- Route: GET /activity/:id (Route:GET:/activity/:id)

## Graph Neighborhood

| Score | Distance | Type | Node | Why Included |
|---:|---:|---|---|---|
| 15 | 0 | Route | GET /activity/:id | target match |
| 10 | 1 | ReactComponent | ActivityDetailPage | renders from Route:GET:/activity/:id |
| 8 | 2 | File | src/pages/ActivityDetailPage.tsx | imports from File:src/App.tsx |
| 6 | 1 | File | src/App.tsx | routesTo from Route:GET:/activity/:id |
| 6 | 2 | PerformanceRisk | P1 large_list_render | mayCause from ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx |
| 6 | 2 | PerformanceRisk | P2 duplicated_request | mayCause from ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx |
| 6 | 2 | PerformanceRisk | P2 image_without_lazy | mayCause from ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx |
| 5 | 4 | APIEndpoint | GET /api/activities/:param/works | requests from File:src/api/activity.ts |
| 5 | 5 | File | backend/main.py | defines backend contract for APIEndpoint:GET:/api/activities/:param/works |
| 4 | 3 | File | src/api/activity.ts | imports from File:src/pages/ActivityDetailPage.tsx |
| 3 | 6 | PerformanceRisk | P1 missing_pagination | mayCause from File:backend/main.py |
| 3 | 6 | PerformanceRisk | P1 n_plus_one_query | mayCause from File:backend/main.py |
| 3 | 6 | PerformanceRisk | P2 large_response_payload | mayCause from File:backend/main.py |

## Evidence Edges

| Source | Edge | Target | Evidence |
|---|---|---|---|
| backend/main.py | defines | GET /api/activities/:param/works | line 6 |
| backend/main.py | mayCause | P2 large_response_payload | line 9: return [ |
| backend/main.py | mayCause | P1 missing_pagination | line 6: @app.get("/api/activities/{activity_id}/works") |
| backend/main.py | mayCause | P1 n_plus_one_query | line 13: "authorName": load_author(work["author_id"])["name"], |
| src/api/activity.ts | requests | GET /api/activities/:param/works | line 2 |
| src/App.tsx | imports | src/pages/ActivityDetailPage.tsx | line 1 |
| src/pages/ActivityDetailPage.tsx | exports | ActivityDetailPage | line 4 |
| src/pages/ActivityDetailPage.tsx | imports | src/api/activity.ts | line 2 |
| src/pages/ActivityDetailPage.tsx | mayCause | P2 duplicated_request | line 7: getActivityWorks("123").then(setWorks); |
| src/pages/ActivityDetailPage.tsx | mayCause | P2 image_without_lazy | line 9: return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; |
| src/pages/ActivityDetailPage.tsx | mayCause | P1 large_list_render | line 9: return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; |
| ActivityDetailPage | mayCause | P2 duplicated_request | line 7: getActivityWorks("123").then(setWorks); |
| ActivityDetailPage | mayCause | P2 image_without_lazy | line 9: return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; |
| ActivityDetailPage | mayCause | P1 large_list_render | line 9: return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; |
| GET /activity/:id | renders | ActivityDetailPage | line 4 |
| GET /activity/:id | routesTo | src/App.tsx | line 4 |

## Performance Risks

| Score | Priority | Rule | Evidence | Recommended Fix |
|---:|---|---|---|---|
| 14 | P1 | large_list_render | src/pages/ActivityDetailPage.tsx:9 - return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; | Add pagination, virtualization, or server-side slicing. |
| 11 | P2 | duplicated_request | src/pages/ActivityDetailPage.tsx:7 - getActivityWorks("123").then(setWorks); | Share cached query state or merge parent/sidebar data needs. |
| 11 | P2 | image_without_lazy | src/pages/ActivityDetailPage.tsx:9 - return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; | Use lazy loading, thumbnails, and stable dimensions. |
| 10 | P1 | missing_pagination | backend/main.py:6 - @app.get("/api/activities/{activity_id}/works") | Require limit/cursor/page parameters and return bounded payloads. |
| 10 | P1 | n_plus_one_query | backend/main.py:13 - "authorName": load_author(work["author_id"])["name"], | Batch related loads with joins, prefetch, or DataLoader-style caching. |
| 7 | P2 | large_response_payload | backend/main.py:9 - return [ | Trim list payload schemas, split detail fields, or paginate the response. |

## Recommended Context For AI

Use this pack as the bounded context for the target. Prefer cited graph evidence over repository-wide guesses.

### Files To Inspect

- backend/main.py
- src/App.tsx
- src/api/activity.ts
- src/pages/ActivityDetailPage.tsx

### Evidence Rules

- Every performance claim should cite a route, file, component, API endpoint, edge, or risk rule from this pack.
- Treat static risks as leads until profiling, network traces, or API measurements confirm runtime impact.
- Keep fixes within this graph neighborhood unless a direct dependency proves a wider change is necessary.

