# Backend Performance Rules

Use these rules for API and service modules. RepoLens detects generic FastAPI-like route decorators and Python hotspots, then the agent should verify the real framework and database layer.

## Rule Catalog

| Rule | Static Signal | Why It Matters | Typical Fix |
|---|---|---|---|
| `missing_pagination` | List-like route without `limit`, `page`, `cursor`, or `offset` | Unbounded payloads can slow backend, network, and UI rendering. | Require bounded pagination and return totals/cursors only when needed. |
| `n_plus_one_query` | Loop body contains query-like calls | Query count grows linearly with rows and can dominate latency. | Batch, join, prefetch, or use DataLoader-style request caching. |
| `large_response_payload` | Endpoint serializes broad records or nested lists | Frontend receives fields it does not render. | Trim response schemas, compress, paginate, and split detail from list views. |
| `sync_blocking_io` | Request handler performs blocking file/network/model calls | Worker threads can stall under concurrent traffic. | Move work to async APIs, background jobs, or cache. |
| `unbounded_search` | Search endpoint lacks limits or indexed constraints | Search can scan too much data and return too many results. | Add limit, index, rank strategy, timeout, and query normalization. |

## Review Heuristics

- Route handlers should have explicit bounds for list and search endpoints.
- Keep list endpoints narrow; put rich detail data behind detail endpoints.
- Look for repeated reads inside loops before optimizing frontend render.
- When frontend and backend both have risks, fix the contract first: smaller payloads usually beat client-side memoization.

## Evidence Wording

Call out whether the signal comes from static scan, source review, or runtime measurement. Example:

> Static scan found `missing_pagination` on `GET /api/activities/{id}/works`; confirm route behavior and add `limit`/`cursor` before optimizing the React list.
