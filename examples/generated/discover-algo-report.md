# Algorithm Opportunity Report: /discover

## Executive Summary
RepoLens built a Block Profile for /discover and matched it against local algorithm cards. The strongest current route is **Content-Based Recommendation** because it matches the module task signals and available code evidence while keeping the first version simple.

This is not a generic code review. The report translates code evidence into an algorithm opportunity boundary, then recommends only algorithms present in `repolens-algo/knowledge/algorithm_index.json`.

## Module Identification

- Block: discover
- Confidence: 0.95
- Routes:
  - GET /api/discover/works
  - GET /discover
- Components:
  - DiscoverPage
- APIs:
  - GET /api/discover/works

## Knowledge Graph Signals

- Data entities: content, item, query, tag
- User actions: search
- Ranking signals: explicit_score, text_similarity
- Algorithm opportunities: ranking, recommendation, search

## Code Evidence

| File | Line | Evidence |
|---|---:|---|
| backend/main.py | 6 | @app.get("/api/discover/works") |
| backend/main.py | 7 | def discover_works( |
| backend/main.py | 9 | tags: str = "", |
| backend/main.py | 12 | selected_tags = {tag for tag in tags.split(",") if tag} |
| backend/main.py | 15 | work |
| backend/main.py | 16 | for work in candidates |
| backend/main.py | 17 | if matches_text(q, work) or selected_tags.intersection(work["tags"]) |
| backend/main.py | 19 | ranked = sorted(filtered, key=lambda work: (tag_overlap(selected_tags, work), work["score"]), reverse=True) |
| backend/main.py | 20 | items = [ |
| backend/main.py | 22 | "id": work["id"], |

## Block Profile

- Entities:
  - content
  - item
  - keyword
  - query
  - score
  - tag
  - user
- Actions:
  - list
  - search
  - sort
  - view
- Data shapes:
  - content metadata
  - item list
  - keyword query
  - ranked item list
- Current logic:
  - api_fetch
  - keyword_search
  - list_loading
  - score_sorting
- Task signals:
  - personalization
  - ranking
  - recommendation
  - search
- Constraints:
  - behavior_log_missing
  - cold_start
  - needs_explainability

## Algorithm Matches

| Score | Fit | Algorithm | Why Matched | Warnings |
|---:|---|---|---|---|
| 29 | strong | Content-Based Recommendation | matched task: recommendation; matched task: ranking; matched task: personalization | none |
| 24 | strong | Hybrid Search / Lightweight RAG | matched task: search; matched task: recommendation; matched data: keyword query | none |
| 21 | strong | Semantic Retrieval | matched task: search; matched task: recommendation; matched data: content metadata | none |
| 18 | strong | Learning to Rank | matched task: ranking; matched task: search; matched task: personalization | profile has constraint: behavior_log_missing; missing required data: exposure logs |
| 10 | medium | Collaborative Filtering | matched task: recommendation; matched task: ranking; matched task: personalization | profile has constraint: cold_start; profile has constraint: behavior_log_missing |
| 10 | medium | Contextual Bandit Exploration | matched task: ranking; matched task: personalization; matched task: recommendation | profile has constraint: behavior_log_missing; profile has constraint: needs_explainability |

## Recommended Algorithm Roadmap

### Phase 1: Rule baseline plus bounded ranking
Use the current score, tags, and keyword filters as an explicit baseline. Add stable limits and log enough events to measure quality.

### Phase 2: Content-Based Recommendation
Rank works by tag/title similarity plus popularity fallback.

### Phase 3: Hybrid Search / Lightweight RAG
Combine keyword filters with tag/title similarity and bounded retrieval.

### Phase 4: Semantic Retrieval
Add an offline text embedding index for titles/descriptions and blend semantic candidates with keyword results.

## Not Recommended Now

- Deep recommendation models: the current evidence points to small data and missing behavior logs.
- Reinforcement learning: there is no online feedback loop or reward definition in the code evidence.
- Real-time LLM reranking: cost and latency are not justified before a baseline ranking and query log exist.
- Learning to Rank: profile has constraint: behavior_log_missing.
- Learning to Rank: missing required data: exposure logs.
- Collaborative Filtering: profile has constraint: cold_start.
- Collaborative Filtering: profile has constraint: behavior_log_missing.
- Contextual Bandit Exploration: profile has constraint: behavior_log_missing.
- Contextual Bandit Exploration: profile has constraint: needs_explainability.

## Data To Add Next

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
Use the RepoLens Algorithm Opportunity Report for /discover. Implement a first-version algorithm route without adding external services. Start with a bounded rule baseline and Content-Based Recommendation. Use available module evidence such as content metadata, item list, keyword query, ranked item list, content, item, keyword, query. Add a small telemetry contract for user_id, item_id, action_type, timestamp, exposure_id, position, and source_page. Do not implement deep recommendation models, reinforcement learning, or real-time LLM reranking in this phase. Keep the ranking explainable and add tests for deterministic ordering and missing-data fallback.
```

## Source Artifacts

- `.project-memory/algo/block_profiles.json`
- `.project-memory/algo/algorithm_matches.json`
- `repolens-algo/knowledge/algorithm_index.json`
