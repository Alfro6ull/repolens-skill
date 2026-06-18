# Content-Based Recommendation

Use when a module exposes item metadata such as title, description, tags, category, author, or score, especially when behavior logs are still limited.

## Good For

- Cold start item discovery
- Small datasets
- Explainable recommendation reasons
- Tag, title, or category similarity

## Data Required

- Item id
- Title or description
- Tags or category
- Optional popularity or quality score

## First Version

Rank candidates by metadata similarity, then use popularity or score as a fallback. Keep explanations visible, such as "same tag" or "similar activity".

## Avoid When

- Items have no useful metadata
- The target requires deep user personalization from day one
