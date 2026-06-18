# Collaborative Filtering

Use when the product already records enough user-item behavior to infer similarity from actions instead of only item metadata.

## Good For

- Personalization
- Similar item discovery
- Offline recommendation batches
- Behavior-driven ranking

## Data Required

- user_id
- item_id
- action_type
- timestamp
- implicit feedback such as view, like, vote, collect, comment, or submit

## First Version

Build ItemCF from implicit feedback and blend it with popularity fallback for cold-start users or items.

## Avoid When

- Behavior logs are missing
- Data is tiny
- Cold start dominates the product surface
