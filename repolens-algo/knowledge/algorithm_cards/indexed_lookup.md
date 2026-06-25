# Indexed Lookup

Use when code repeatedly scans arrays or lists to find records by id, membership, or a small set of keys.

## Good For

- Replacing repeated `find`, `includes`, or membership scans
- Id lookup on item lists
- Deduplication and existence checks
- Small refactors before changing storage systems

## Data Required

- Stable lookup key such as id, slug, or composite key
- Item list or candidate collection
- Expected access pattern

## First Version

Build a `Map` or `Set` at the same boundary where the list is loaded, then replace repeated scans with direct lookup. Keep the original list order when rendering or ranking still depends on sequence.

## Avoid When

- The list is tiny and scanned only once
- Ordering is the main operation and no repeated lookup exists
- The source of truth already provides an indexed query
