# Explainable Scoring

Use when a module has hand-written score, priority, weight, risk, or rank logic that affects user-visible ordering or routing.

## Good For

- Making hard-coded scoring formulas visible
- Auditing priority, risk, quality, or relevance decisions
- Preparing a baseline before learning-to-rank
- Letting business owners tune weights without reading code

## Data Required

- Score inputs
- Weights or rule contributions
- Final score
- Explanation fields
- Tie-break behavior

## First Version

Move the current formula into a named scoring function or config with explicit feature weights, return both score and explanation, and log enough examples to compare future changes.

## Avoid When

- The score is purely presentational
- Inputs are unavailable at decision time
- The team cannot define what a better score means
