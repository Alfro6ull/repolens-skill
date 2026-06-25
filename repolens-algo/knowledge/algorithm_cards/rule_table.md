# Rule Table

Use when business behavior is encoded as long branching logic, repeated condition chains, or scattered priority rules.

## Good For

- Replacing long `if/else`, `switch`, or priority condition chains
- Making routing, assignment, eligibility, or policy logic auditable
- Separating business rules from control flow
- Keeping deterministic behavior before introducing learned models

## Data Required

- Rule inputs
- Rule outcome
- Priority or tie-break order
- Fallback behavior

## First Version

Move branches into a small ordered rule table with explicit conditions, outcomes, priority, and a default fallback. Add fixture cases that prove old behavior is preserved.

## Avoid When

- There are only one or two stable conditions
- The rule depends on complex side effects
- Product owners cannot name the intended policy
