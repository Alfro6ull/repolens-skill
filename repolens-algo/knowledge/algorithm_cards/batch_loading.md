# Batch Loading

Use when a module loads related records one by one inside a loop, route, resolver, or list rendering path.

## Good For

- N+1 query cleanup
- Joining authors, customers, tags, permissions, or metadata for a list
- Reducing network or database round trips
- Preserving current product behavior while improving scale

## Data Required

- Parent record ids
- Related entity ids
- Batch fetch or bulk query boundary
- Missing-key fallback behavior

## Required Signals

- `n_plus_one_lookup` current logic in the Block Profile

## First Version

Collect related ids from the parent list, fetch related records in one batch, build a map by id, then enrich each parent record from that map with a safe fallback for missing data.

## Avoid When

- The related record is already present in the parent payload
- The list is always bounded to a tiny size
- The data source cannot support a batch query yet
