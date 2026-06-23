# Semantic Retrieval

Use when keyword search misses relevant content because the query and item text use different wording, and the module already exposes useful titles, descriptions, tags, or document chunks.

## Good For

- Semantic search and retrieval
- Content discovery across messy wording
- Blending keyword and vector candidates
- Offline indexes with bounded online latency

## Data Required

- Item id or document id
- Title, description, body, or chunk text
- Query text
- Optional relevance or click feedback

## First Version

Build an offline embedding index for text fields, retrieve a bounded candidate set, then blend semantic score with keyword and metadata scores.

## Avoid When

- Text fields are thin or missing
- There is no indexing path
- The route cannot tolerate retrieval latency
