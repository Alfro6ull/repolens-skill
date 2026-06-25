# Algorithm Opportunity Report: /discover

## Executive Summary
RepoLens built a Block Profile for /discover and matched it against local algorithm cards. The strongest current route is **Hybrid Search / Lightweight RAG** because it matches graph-visible entities, actions, and ranking signals while keeping the first version simple.

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

## Why This Algorithm Now

- Current route: Hybrid Search / Lightweight RAG (`hybrid_search_rag`, recommended_now).
- Graph evidence: data entities [content, item, query, tag], actions [search], ranking signals [explicit_score, text_similarity].
- matched task: search
- matched task: recommendation
- matched data: keyword query
- matched data: content metadata

## Code Evidence

| File | Line | Evidence |
|---|---:|---|
| backend/main.py | 6 | @app.get("/api/discover/works") |
| backend/main.py | 7 | def discover_works( |
| backend/main.py | 9 | tags: str = "", |
| backend/main.py | 10 | limit: int = Query(20, ge=1, le=50), |
| backend/main.py | 12 | selected_tags = {tag for tag in tags.split(",") if tag} |
| backend/main.py | 15 | work |

## Block Profile

- Entities:
  - content
  - item
  - keyword
  - query
  - score
  - tag
- Actions:
  - list
  - search
  - sort
  - view
- Data shapes:
  - bounded result set
  - content metadata
  - item list
  - keyword query
  - lookup key or membership set
  - ranked item list
- Current logic:
  - api_fetch
  - bounded_result_set
  - hardcoded_scoring
  - keyword_search
  - list_loading
  - membership_lookup
  - score_sorting
- Task signals:
  - bounded_top_k
  - explainable_scoring
  - indexed_lookup
  - ranking
  - recommendation
  - search
- Constraints:
  - behavior_log_missing
  - cold_start
  - needs_explainability

## Algorithm Matches

| Score | Status | Fit | Algorithm ID | Algorithm | Why Matched | Warnings |
|---:|---|---|---|---|---|---|
| 24 | recommended_now | strong | `hybrid_search_rag` | Hybrid Search / Lightweight RAG | matched task: search; matched task: recommendation; matched data: keyword query | none |
| 23 | recommended_now | strong | `content_based_recommendation` | Content-Based Recommendation | matched task: recommendation; matched task: ranking; matched data: content metadata | none |
| 21 | recommended_now | strong | `explainable_scoring` | Explainable Scoring | matched task: explainable_scoring; matched data: ranked item list; matched objective: e... | none |
| 21 | candidate_later | strong | `semantic_retrieval` | Semantic Retrieval | matched task: search; matched task: recommendation; matched data: content metadata | missing card signal: semantic retrieval signal |
| 20 | recommended_now | strong | `bounded_top_k` | Bounded Top-K | matched task: bounded_top_k; matched data: ranked item list; matched data: bounded resu... | none |
| 20 | recommended_now | strong | `indexed_lookup` | Indexed Lookup | matched task: indexed_lookup; matched data: item list; matched data: lookup key or memb... | none |
| 14 | candidate_later | medium | `learning_to_rank` | Learning to Rank | matched task: ranking; matched task: search; matched data: ranked item list | profile has constraint: behavior_log_missing; missing required data: exposure logs |
| 11 | blocked_now | medium | `batch_loading` | Batch Loading | matched data: item list; matched fit condition: api_fetch; matched fit condition: list_... | missing card signal: n_plus_one lookup |
| 6 | blocked_now | weak | `rule_table` | Rule Table | matched fit condition: needs_explainability | missing required data: rule inputs; missing required data: rule outcome |
| 4 | blocked_now | weak | `collaborative_filtering` | Collaborative Filtering | matched task: recommendation; matched task: ranking; matched objective: improve_discovery | profile has constraint: cold_start; profile has constraint: behavior_log_missing |
| 4 | blocked_now | weak | `contextual_bandit` | Contextual Bandit Exploration | matched task: ranking; matched task: recommendation; matched objective: optimize_ranking | profile has constraint: behavior_log_missing; profile has constraint: needs_explainability |

## What Data Blocks Heavier Algorithms

- candidate_later: Semantic Retrieval - missing card signal: semantic retrieval signal
- candidate_later: Learning to Rank needs exposure logs
- candidate_later: Learning to Rank needs click feedback
- candidate_later: Learning to Rank - profile has constraint: behavior_log_missing
- candidate_later: Learning to Rank - missing required data: exposure logs
- candidate_later: Learning to Rank - missing required data: click feedback
- candidate_later: Learning to Rank - missing card signal: exposure logs
- candidate_later: Learning to Rank - missing card signal: click or feedback logs
- blocked_now: Batch Loading - missing card signal: n_plus_one lookup
- blocked_now: Rule Table needs rule inputs

## Recommended Algorithm Roadmap

### Phase 1: Rule baseline plus bounded ranking
Keep the current score, tags, and keyword filters as the measurable baseline. Log enough events to compare later algorithms.

### Phase 2: Hybrid Search / Lightweight RAG
Combine keyword filters with tag/title similarity and bounded retrieval.

### Phase 3: Content-Based Recommendation
Rank works by tag/title similarity plus popularity fallback.

### Phase 4: Explainable Scoring
Move the current score formula into a named function or config that returns both score and explanation fields.

## Not Recommended Now

- Deep recommendation models: the current evidence points to small data and missing behavior logs.
- Reinforcement learning: there is no online feedback loop or reward definition in the code evidence.
- Real-time LLM reranking: cost and latency are not justified before a baseline ranking and query log exist.
- Semantic Retrieval: missing card signal: semantic retrieval signal.
- Learning to Rank: profile has constraint: behavior_log_missing.
- Learning to Rank: missing required data: exposure logs.
- Batch Loading: missing card signal: n_plus_one lookup.
- Rule Table: missing required data: rule inputs.
- Rule Table: missing required data: rule outcome.
- Collaborative Filtering: profile has constraint: cold_start.
- Collaborative Filtering: profile has constraint: behavior_log_missing.
- Contextual Bandit Exploration: profile has constraint: behavior_log_missing.
- Contextual Bandit Exploration: profile has constraint: needs_explainability.

## Data To Add Next

- exposure logs
- click feedback
- rule inputs
- rule outcome
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
Use the RepoLens Algorithm Opportunity Report for /discover. Implement a first-version algorithm route without adding external services. Start with a bounded rule baseline and Hybrid Search / Lightweight RAG. Use available module evidence such as bounded result set, content metadata, item list, keyword query, lookup key or membership set, ranked item list, content, item. Add a small telemetry contract for user_id, item_id, action_type, timestamp, exposure_id, position, and source_page. Do not implement deep recommendation models, reinforcement learning, or real-time LLM reranking in this phase. Keep the ranking explainable and add tests for deterministic ordering and missing-data fallback.
```

## Source Artifacts

- `.project-memory/algo/block_profiles.json`
- `.project-memory/algo/algorithm_matches.json`
- `repolens-algo/knowledge/algorithm_index.json`
