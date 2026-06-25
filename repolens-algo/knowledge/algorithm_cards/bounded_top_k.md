# Bounded Top-K

Use when code ranks or sorts more records than the user or downstream process needs.

## Good For

- Feeds, search results, recommendations, and priority queues
- Replacing full-list sorting with bounded candidate selection
- Keeping latency predictable on large candidate sets
- Pairing simple ranking with pagination or limits

## Data Required

- Candidate item list
- Ranking score or comparator
- Requested result limit
- Tie-break rule

## First Version

Apply filters first, keep only the requested top K candidates, and preserve a deterministic tie-break. For small in-memory lists this can still be simple slicing; for larger lists, move the bound to the query/index boundary.

## Avoid When

- The full sorted list is required for export or audit
- K is close to the full dataset size
- There is no stable score, comparator, or tie-break
