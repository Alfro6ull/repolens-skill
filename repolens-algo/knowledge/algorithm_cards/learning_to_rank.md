# Learning to Rank

Use when a module already has stable ranking candidates, feature signals, exposure logs, and click or conversion feedback.

## Good For

- Multi-feature ranking
- Search result ordering
- Personalized feeds after logging is mature
- Optimizing NDCG, MRR, CTR, or conversion

## Data Required

- Query or context id
- Candidate item id
- Exposure id
- Position
- Click or conversion feedback
- Feature snapshots

## Required Signals

- `exposure` user action in the code knowledge graph
- `click` or `feedback` user action in the code knowledge graph

## First Version

Start with a transparent weighted score. Move to a learned ranking model only after exposure and click logs are reliable.

## Avoid When

- There are no exposure logs
- Feedback is sparse or noisy
- The team cannot inspect or roll back ranking changes
