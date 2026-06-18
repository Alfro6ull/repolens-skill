# Algorithm Opportunity Report: /activity/:id

## Executive Summary
RepoLens built a Block Profile for /activity/:id and matched it against local algorithm cards. The strongest current route is **Content-Based Recommendation** because it matches the module task signals and available code evidence while keeping the first version simple.

This is not a generic code review. The report translates code evidence into an algorithm opportunity boundary, then recommends only algorithms present in `repolens-algo/knowledge/algorithm_index.json`.

## Module Identification

- Block: activity-id
- Confidence: 0.9
- Routes:
  - GET /activity/:id
- Components:
  - ActivityDetailPage
- APIs:
  - GET /api/activities/:param/works

## Code Evidence

| File | Line | Evidence |
|---|---:|---|
| backend/main.py | 6 | @app.get("/api/activities/{activity_id}/works") |
| backend/main.py | 7 | def get_activity_works(activity_id: str): |
| backend/main.py | 8 | works = load_all_works(activity_id) |
| backend/main.py | 11 | "id": work["id"], |
| backend/main.py | 12 | "title": work["title"], |
| backend/main.py | 13 | "authorName": load_author(work["author_id"])["name"], |
| backend/main.py | 14 | "coverUrl": work["cover_url"], |
| backend/main.py | 15 | "tags": work["tags"], |
| backend/main.py | 17 | for work in works |
| backend/main.py | 21 | @app.get("/api/search/works") |

## Block Profile

- Entities:
  - activity
  - keyword
  - tag
  - user
  - work
- Actions:
  - list
  - search
  - view
- Data shapes:
  - content metadata
  - item list
  - keyword query
- Current logic:
  - api_fetch
  - keyword_search
  - list_loading
- Task signals:
  - personalization
  - recommendation
  - search
- Constraints:
  - behavior_log_missing
  - cold_start
  - needs_explainability
  - small_data

## Algorithm Matches

| Score | Fit | Algorithm | Why Matched | Warnings |
|---:|---|---|---|---|
| 25 | strong | Content-Based Recommendation | matched task: recommendation; matched task: personalization; matched data: content meta... | none |
| 24 | strong | Hybrid Search / Lightweight RAG | matched task: search; matched task: recommendation; matched data: keyword query | none |
| 4 | weak | Learning to Rank | matched task: search; matched task: personalization; matched objective: improve_discovery | profile has constraint: behavior_log_missing; profile has constraint: small_data |
| 1 | weak | Collaborative Filtering | matched task: recommendation; matched task: personalization; matched objective: persona... | profile has constraint: cold_start; profile has constraint: behavior_log_missing |

## Recommended Algorithm Roadmap

### Phase 1: Rule baseline plus bounded ranking
Use the current score, tags, and keyword filters as an explicit baseline. Add stable limits and log enough events to measure quality.

### Phase 2: Content-Based Recommendation
Rank works by tag/title similarity plus popularity fallback.

### Phase 3: Hybrid Search / Lightweight RAG
Combine keyword filters with tag/title similarity and bounded retrieval.

### Phase 4: Learning to Rank
Start with weighted scoring features, then train a ranking model after exposure and click logs exist.

## Not Recommended Now

- Deep recommendation models: the current evidence points to small data and missing behavior logs.
- Reinforcement learning: there is no online feedback loop or reward definition in the code evidence.
- Real-time LLM reranking: cost and latency are not justified before a baseline ranking and query log exist.
- Learning to Rank: profile has constraint: behavior_log_missing.
- Learning to Rank: profile has constraint: small_data.
- Collaborative Filtering: profile has constraint: cold_start.
- Collaborative Filtering: profile has constraint: behavior_log_missing.

## Data To Add Next

- ranked item list
- exposure logs
- click feedback
- user-item interaction
- implicit feedback
- user_id
- item_id
- action_type
- timestamp
- exposure_id
- position
- source_page

## Coding Agent Prompt

```text
Use the RepoLens Algorithm Opportunity Report for /activity/:id. Implement a first-version algorithm route without adding external services. Start with a bounded rule baseline and Content-Based Recommendation. Use existing fields such as title, tags, score, activity id, and work id. Add a small telemetry contract for user_id, item_id, action_type, timestamp, exposure_id, position, and source_page. Do not implement deep recommendation models, reinforcement learning, or real-time LLM reranking in this phase. Keep the ranking explainable and add tests for deterministic ordering and missing-data fallback.
```

## Source Artifacts

- `.project-memory/algo/block_profiles.json`
- `.project-memory/algo/algorithm_matches.json`
- `repolens-algo/knowledge/algorithm_index.json`
