# Performance Report: /activity/:id

## Executive Summary
RepoLens traced 1 start node(s), 15 related node(s), and 19 evidence edge(s).
Context Pack: .project-memory/context-packs/activity-id.md
Detected 6 deterministic performance signal(s), led by P1 large_list_render.

## Related Modules

### Routes
- GET /activity/:id (src/App.tsx)

### Components
- ActivityDetailPage (src/pages/ActivityDetailPage.tsx)

### APIs
- GET /api/activities/:param/works (backend/main.py)

### Files
- backend/main.py
- src/App.tsx
- src/api/activity.ts
- src/pages/ActivityDetailPage.tsx

## Risk Table

| Score | Priority | Rule | Evidence | Recommended Fix |
|---:|---|---|---|---|
| 102 | P1 | large_list_render | src/pages/ActivityDetailPage.tsx:9 - return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; | Add pagination, virtualization, or server-side slicing. |
| 92 | P1 | missing_pagination | backend/main.py:6 - @app.get("/api/activities/{activity_id}/works") | Require limit/cursor/page parameters and return bounded payloads. |
| 92 | P1 | n_plus_one_query | backend/main.py:13 - "authorName": load_author(work["author_id"])["name"], | Batch related loads with joins, prefetch, or DataLoader-style caching. |
| 72 | P2 | duplicated_request | src/pages/ActivityDetailPage.tsx:7 - getActivityWorks("123").then(setWorks); | Share cached query state or merge parent/sidebar data needs. |
| 72 | P2 | image_without_lazy | src/pages/ActivityDetailPage.tsx:9 - return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>; | Use lazy loading, thumbnails, and stable dimensions. |
| 62 | P2 | large_response_payload | backend/main.py:9 - return [ | Trim list payload schemas, split detail fields, or paginate the response. |

## Fix Tickets

### Ticket 1: Large list render risk

- Priority: P1
- Risk Score: 102
- Evidence: src/pages/ActivityDetailPage.tsx:9 return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>;
- Change: Add pagination, virtualization, or server-side slicing.
- Acceptance: The list render is bounded by pagination, virtualization, server-side slicing, or an explicit item cap under large fixtures.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.

### Ticket 2: Missing pagination risk

- Priority: P1
- Risk Score: 92
- Evidence: backend/main.py:6 @app.get("/api/activities/{activity_id}/works")
- Change: Require limit/cursor/page parameters and return bounded payloads.
- Acceptance: The list endpoint requires a bounded limit, cursor, page, or offset contract and rejects unbounded list reads.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.

### Ticket 3: N+1 query risk

- Priority: P1
- Risk Score: 92
- Evidence: backend/main.py:13 "authorName": load_author(work["author_id"])["name"],
- Change: Batch related loads with joins, prefetch, or DataLoader-style caching.
- Acceptance: Related records loaded inside a loop are batched, joined, prefetched, or cached at request scope.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.

### Ticket 4: Potential duplicated request risk

- Priority: P2
- Risk Score: 72
- Evidence: src/pages/ActivityDetailPage.tsx:7 getActivityWorks("123").then(setWorks);
- Change: Share cached query state or merge parent/sidebar data needs.
- Acceptance: Entering the same route does not issue duplicate requests for the same entity; shared data is cached, lifted, or merged.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.

### Ticket 5: Image loading risk

- Priority: P2
- Risk Score: 72
- Evidence: src/pages/ActivityDetailPage.tsx:9 return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>;
- Change: Use lazy loading, thumbnails, and stable dimensions.
- Acceptance: Non-critical list images use lazy loading and stable dimensions to avoid unnecessary bandwidth and layout shift.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.

### Ticket 6: Large response payload risk

- Priority: P2
- Risk Score: 62
- Evidence: backend/main.py:9 return [
- Change: Trim list payload schemas, split detail fields, or paginate the response.
- Acceptance: List responses return only fields required by the consumer, with detail-only fields moved behind detail endpoints or pagination.
- Verification: add or update a focused test, then run the relevant app checks and manually inspect the traced route.


## Focused Coding Prompt

```text
Use the RepoLens memory for target "/activity/:id". Focus only on this graph neighborhood unless a direct dependency forces a wider change. Relevant files: backend/main.py, src/App.tsx, src/api/activity.ts, src/pages/ActivityDetailPage.tsx. Prioritize these risks: large_list_render, missing_pagination, n_plus_one_query, duplicated_request, image_without_lazy, large_response_payload. Make the smallest safe code changes, preserve existing UI conventions, and add verification for the changed behavior. After editing, summarize evidence, touched files, tests run, and any runtime risks that still need measurement.
```

## Notes
- Scanner findings are static signals. Confirm high-impact changes with profiling, network traces, or route-level measurements.
- Keep unrelated refactors out of the first pass so the performance delta remains attributable.

