---
name: repolens-algo
description: Build Block Profiles from a code knowledge graph and match local algorithm cards. Use for recommendation, ranking, search, retrieval, or personalization opportunities.
---

# RepoLens AlgoGraph Skill

Use this skill when the user wants to identify algorithm opportunities inside a code module, such as recommendation, ranking, search, retrieval, or personalization improvements. Do not treat every module as algorithmic; use the graph evidence as the boundary.

## Workflow

1. Ensure the repository has been indexed by `repolens-perf/scripts/index_project.mjs`.
2. Build a Block Profile for a route, API, component, file, or keyword.
3. Retrieve algorithm matches from the local algorithm cards.
4. Generate an Algorithm Opportunity Report.

## Commands

```bash
node repolens-algo/scripts/build_block_profiles.mjs <repo-root> "<target>"
node repolens-algo/scripts/retrieve_algorithms.mjs <repo-root> "<target>"
node repolens-algo/scripts/generate_algo_report.mjs <repo-root> "<target>"
```

## Guardrails

- Do not recommend algorithms outside `knowledge/algorithm_index.json`.
- Prefer simple baselines before heavier models.
- Always state missing data and algorithms that should not be used yet.
- Keep recommendations tied to code evidence from `.project-memory` and source files.
