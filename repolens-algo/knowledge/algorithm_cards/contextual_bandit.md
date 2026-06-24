# Contextual Bandit Exploration

Use when a ranked surface already has reliable exposure logging and the product needs controlled exploration across ranking policies or candidate groups.

## Good For

- Exploration versus exploitation
- Personalized ranking experiments
- Surfaces with frequent feedback
- Guardrailed optimization after baselines are stable

## Data Required

- exposure_id
- user_id or context id
- candidate item id
- position
- action or reward signal
- policy id

## Required Signals

- `exposure` user action in the code knowledge graph
- `click` or `feedback` user action in the code knowledge graph

## First Version

Start with epsilon-greedy exploration over a few transparent policies, log policy assignment, and keep a conservative fallback ranking.

## Avoid When

- Exposure or click logs are missing
- Traffic is too small for stable learning
- Ranking changes cannot be rolled back safely
