# Hybrid Search / Lightweight RAG

Use when a module has keyword queries and useful text metadata, and the goal is better retrieval rather than only code-level filtering.

## Good For

- Search relevance
- Content discovery
- Small to medium text collections
- Explainable retrieval with title, tag, or description evidence

## Data Required

- Keyword query
- Item title
- Description or summary
- Tags or category
- Optional click feedback

## First Version

Combine bounded keyword search, tag/title scoring, and simple reranking. Add embeddings or full RAG only after query logs show clear recall failures.

## Avoid When

- Text fields are missing
- The module is latency-sensitive and has no index
