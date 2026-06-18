# RepoLens Trace: /activity/:id

- Start nodes: 1
- Related nodes: 9
- Related edges: 13

## Start Nodes
- Route: GET /activity/:id (Route:GET:/activity/:id)

## Related Nodes

### File
- d3 src/api/activity.ts - src/api/activity.ts
- d1 src/App.tsx - src/App.tsx
- d2 src/pages/ActivityDetailPage.tsx - src/pages/ActivityDetailPage.tsx

### PerformanceRisk
- d2 P1 large_list_render - src/pages/ActivityDetailPage.tsx
- d2 P2 duplicated_request - src/pages/ActivityDetailPage.tsx
- d2 P2 image_without_lazy - src/pages/ActivityDetailPage.tsx

### ReactComponent
- d1 ActivityDetailPage - src/pages/ActivityDetailPage.tsx
- d2 App - src/App.tsx

### Route
- d0 GET /activity/:id - src/App.tsx

## Evidence Edges
- File:src/App.tsx --exports line 3--> ReactComponent:App:src/App.tsx
- File:src/App.tsx --imports line 1--> File:src/pages/ActivityDetailPage.tsx
- File:src/pages/ActivityDetailPage.tsx --exports line 4--> ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx
- File:src/pages/ActivityDetailPage.tsx --imports line 2--> File:src/api/activity.ts
- File:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:duplicated_request:src/pages/ActivityDetailPage.tsx
- File:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:image_without_lazy:src/pages/ActivityDetailPage.tsx
- File:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:large_list_render:src/pages/ActivityDetailPage.tsx
- ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:duplicated_request:src/pages/ActivityDetailPage.tsx
- ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:image_without_lazy:src/pages/ActivityDetailPage.tsx
- ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx --mayCause--> PerformanceRisk:large_list_render:src/pages/ActivityDetailPage.tsx
- ReactComponent:App:src/App.tsx --renders--> ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx
- Route:GET:/activity/:id --renders line 4--> ReactComponent:ActivityDetailPage:src/pages/ActivityDetailPage.tsx
- Route:GET:/activity/:id --routesTo line 4--> File:src/App.tsx

