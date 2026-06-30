# RepoLens Trace: /discover

- Hops: 4
- Start nodes: 6
- Related nodes: 31
- Related edges: 86

## Start Nodes
- File: src/api/discovery.ts (File:src/api/discovery.ts)
- File: src/pages/DiscoverPage.tsx (File:src/pages/DiscoverPage.tsx)
- ReactComponent: DiscoverPage (ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx)
- Route: GET /api/discover/works (Route:GET:/api/discover/works)
- Route: GET /discover (Route:GET:/discover)
- APIEndpoint: GET /api/discover/works (APIEndpoint:GET:/api/discover/works)

## Related Nodes

### AlgorithmOpportunity
- d2 ranking - backend/main.py
- d1 ranking - src/pages/DiscoverPage.tsx
- d2 recommendation - backend/main.py
- d1 recommendation - src/api/discovery.ts
- d1 recommendation - src/pages/DiscoverPage.tsx
- d2 search - backend/main.py
- d1 search - src/api/discovery.ts

### APIEndpoint
- d0 GET /api/discover/works - backend/main.py

### DataEntity
- d1 content metadata - backend/main.py
- d1 content metadata - src/pages/DiscoverPage.tsx
- d1 item - backend/main.py
- d1 item - src/api/discovery.ts
- d1 item - src/pages/DiscoverPage.tsx
- d1 query - backend/main.py
- d1 query - src/api/discovery.ts
- d1 tag - backend/main.py
- d1 tag - src/api/discovery.ts
- d1 tag - src/pages/DiscoverPage.tsx

### File
- d1 backend/main.py - backend/main.py
- d0 src/api/discovery.ts - src/api/discovery.ts
- d1 src/App.tsx - src/App.tsx
- d0 src/pages/DiscoverPage.tsx - src/pages/DiscoverPage.tsx

### RankingSignal
- d1 explicit score - backend/main.py
- d1 explicit score - src/pages/DiscoverPage.tsx
- d1 text similarity - backend/main.py
- d1 text similarity - src/pages/DiscoverPage.tsx

### ReactComponent
- d0 DiscoverPage - src/pages/DiscoverPage.tsx

### Route
- d0 GET /api/discover/works - backend/main.py
- d0 GET /discover - src/App.tsx

### UserAction
- d1 search - backend/main.py
- d1 search - src/api/discovery.ts

## Evidence Edges
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:content:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:item:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:item:src/api/discovery.ts
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:query:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:query:src/api/discovery.ts
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:tag:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> DataEntity:tag:src/api/discovery.ts
- APIEndpoint:GET:/api/discover/works --exposes--> RankingSignal:explicit_score:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> RankingSignal:text_similarity:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> UserAction:search:backend/main.py
- APIEndpoint:GET:/api/discover/works --exposes--> UserAction:search:src/api/discovery.ts
- DataEntity:content:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- DataEntity:content:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- DataEntity:content:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- DataEntity:content:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- DataEntity:content:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- DataEntity:item:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- DataEntity:item:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- DataEntity:item:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- DataEntity:item:src/api/discovery.ts --supports--> AlgorithmOpportunity:recommendation:src/api/discovery.ts
- DataEntity:item:src/api/discovery.ts --supports--> AlgorithmOpportunity:search:src/api/discovery.ts
- DataEntity:item:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- DataEntity:item:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- DataEntity:query:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- DataEntity:query:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- DataEntity:query:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- DataEntity:query:src/api/discovery.ts --supports--> AlgorithmOpportunity:recommendation:src/api/discovery.ts
- DataEntity:query:src/api/discovery.ts --supports--> AlgorithmOpportunity:search:src/api/discovery.ts
- DataEntity:tag:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- DataEntity:tag:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- DataEntity:tag:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- DataEntity:tag:src/api/discovery.ts --supports--> AlgorithmOpportunity:recommendation:src/api/discovery.ts
- DataEntity:tag:src/api/discovery.ts --supports--> AlgorithmOpportunity:search:src/api/discovery.ts
- DataEntity:tag:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- DataEntity:tag:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- File:backend/main.py --captures--> UserAction:search:backend/main.py
- File:backend/main.py --defines line 6--> APIEndpoint:GET:/api/discover/works
- File:backend/main.py --mentions--> DataEntity:content:backend/main.py
- File:backend/main.py --mentions--> DataEntity:item:backend/main.py
- File:backend/main.py --mentions--> DataEntity:query:backend/main.py
- File:backend/main.py --mentions--> DataEntity:tag:backend/main.py
- File:backend/main.py --suggests--> AlgorithmOpportunity:ranking:backend/main.py
- File:backend/main.py --suggests--> AlgorithmOpportunity:recommendation:backend/main.py
- File:backend/main.py --suggests--> AlgorithmOpportunity:search:backend/main.py
- File:backend/main.py --usesSignal--> RankingSignal:explicit_score:backend/main.py
- File:backend/main.py --usesSignal--> RankingSignal:text_similarity:backend/main.py
- File:src/App.tsx --imports line 2--> File:src/pages/DiscoverPage.tsx
- File:src/api/discovery.ts --captures--> UserAction:search:src/api/discovery.ts
- File:src/api/discovery.ts --mentions--> DataEntity:item:src/api/discovery.ts
- File:src/api/discovery.ts --mentions--> DataEntity:query:src/api/discovery.ts
- File:src/api/discovery.ts --mentions--> DataEntity:tag:src/api/discovery.ts
- File:src/api/discovery.ts --requests line 7--> APIEndpoint:GET:/api/discover/works
- File:src/api/discovery.ts --suggests--> AlgorithmOpportunity:recommendation:src/api/discovery.ts
- File:src/api/discovery.ts --suggests--> AlgorithmOpportunity:search:src/api/discovery.ts
- File:src/pages/DiscoverPage.tsx --exports line 4--> ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --imports line 2--> File:src/api/discovery.ts
- File:src/pages/DiscoverPage.tsx --mentions--> DataEntity:content:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --mentions--> DataEntity:item:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --mentions--> DataEntity:tag:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --suggests--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --suggests--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --usesSignal--> RankingSignal:explicit_score:src/pages/DiscoverPage.tsx
- File:src/pages/DiscoverPage.tsx --usesSignal--> RankingSignal:text_similarity:src/pages/DiscoverPage.tsx
- RankingSignal:explicit_score:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- RankingSignal:explicit_score:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- RankingSignal:explicit_score:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- RankingSignal:explicit_score:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- RankingSignal:explicit_score:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- RankingSignal:text_similarity:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- RankingSignal:text_similarity:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- RankingSignal:text_similarity:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- RankingSignal:text_similarity:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:ranking:src/pages/DiscoverPage.tsx
- RankingSignal:text_similarity:src/pages/DiscoverPage.tsx --supports--> AlgorithmOpportunity:recommendation:src/pages/DiscoverPage.tsx
- ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx --mentions--> DataEntity:content:src/pages/DiscoverPage.tsx
- ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx --mentions--> DataEntity:item:src/pages/DiscoverPage.tsx
- ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx --mentions--> DataEntity:tag:src/pages/DiscoverPage.tsx
- ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx --usesSignal--> RankingSignal:explicit_score:src/pages/DiscoverPage.tsx
- ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx --usesSignal--> RankingSignal:text_similarity:src/pages/DiscoverPage.tsx
- Route:GET:/api/discover/works --routesTo line 6--> File:backend/main.py
- Route:GET:/discover --renders line 5--> ReactComponent:DiscoverPage:src/pages/DiscoverPage.tsx
- Route:GET:/discover --routesTo line 5--> File:src/App.tsx
- UserAction:search:backend/main.py --supports--> AlgorithmOpportunity:ranking:backend/main.py
- UserAction:search:backend/main.py --supports--> AlgorithmOpportunity:recommendation:backend/main.py
- UserAction:search:backend/main.py --supports--> AlgorithmOpportunity:search:backend/main.py
- UserAction:search:src/api/discovery.ts --supports--> AlgorithmOpportunity:recommendation:src/api/discovery.ts
- UserAction:search:src/api/discovery.ts --supports--> AlgorithmOpportunity:search:src/api/discovery.ts

