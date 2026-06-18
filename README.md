# RepoLens Skill

RepoLens is a lightweight Codex Skill that turns a codebase into inspectable project memory, builds a code knowledge graph, and uses that graph for bounded AI context, evidence-backed performance reports, and algorithm opportunity matching.

Instead of asking an AI assistant to guess from the whole repository, RepoLens builds a JSON code graph, performs K-hop traversal around a route/file/component/API target, prunes context, and maps module evidence to either performance risks or algorithm optimization routes.

## Features

- Extracts files, imports, routes, React components, API references, and performance signals.
- Builds `.project-memory/` with a project profile, module summaries, graph JSON, graph metrics, reports, and context packs.
- Uses K-hop graph traversal to retrieve target-specific context.
- Generates context packs that can be handed to an AI coding agent.
- Generates performance reports with evidence lines, risk levels, rule-specific acceptance criteria, fix tickets, and focused coding prompts.
- Generates Block Profiles and matches modules to local algorithm cards for recommendation, ranking, and search opportunities.
- Includes frontend/backend performance rules and a public baseline evaluation.

## Runtime

- Node.js >= 18
- No npm dependencies for the analysis scripts
- No database, vector store, or external AI API required during indexing
- Demo frontend dependencies are only needed if you want to run the sample app UI

## Repository Layout

```text
repolens-perf/
  SKILL.md
  agents/openai.yaml
  scripts/
    index_project.mjs
    trace_module.mjs
    build_context_pack.mjs
    perf_report.mjs
  references/
    perfgraph_algorithm.md
    frontend_perf_rules.md
    backend_perf_rules.md
    graph_schema.md
    report_format.md
  tests/
    perfgraph.test.mjs
    fixtures/

repolens-algo/
  SKILL.md
  scripts/
    build_block_profiles.mjs
    retrieve_algorithms.mjs
    generate_algo_report.mjs
  knowledge/
    algorithm_index.json
    algorithm_cards/

examples/generated/
  activity-id-context-pack.md
  activity-id-perf-report.md
  activity-id-block-profile.json
  activity-id-algorithm-matches.json
  activity-id-algo-report.md

repolens-perf/tests/fixtures/phase-one/
  src/
  backend/
  .project-memory/     # generated after running npm run demo

eval/
  baseline_vs_repolens.md
```

## Quick Start

Run the included demo:

```bash
npm run demo
```

Or run each step directly:

```bash
node repolens-perf/scripts/index_project.mjs repolens-perf/tests/fixtures/phase-one
node repolens-perf/scripts/trace_module.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-perf/scripts/build_context_pack.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-perf/scripts/perf_report.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-algo/scripts/build_block_profiles.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-algo/scripts/retrieve_algorithms.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
node repolens-algo/scripts/generate_algo_report.mjs repolens-perf/tests/fixtures/phase-one "/activity/:id"
```

Verify the scripts:

```bash
npm test
npm run check
```

Pre-generated sample outputs are available in the repository:

```text
examples/generated/activity-id-context-pack.md
examples/generated/activity-id-perf-report.md
examples/generated/activity-id-block-profile.json
examples/generated/activity-id-algorithm-matches.json
examples/generated/activity-id-algo-report.md
```

After running `npm run demo`, open the regenerated artifacts:

```text
repolens-perf/tests/fixtures/phase-one/.project-memory/graph_metrics.json
repolens-perf/tests/fixtures/phase-one/.project-memory/context-packs/activity-id.md
repolens-perf/tests/fixtures/phase-one/.project-memory/reports/activity-id-perf-report.md
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/block_profiles.json
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/algorithm_matches.json
repolens-perf/tests/fixtures/phase-one/.project-memory/algo/reports/activity-id-algo-report.md
```

## Use On Your Own Repository

```bash
node repolens-perf/scripts/index_project.mjs /path/to/your/repo
node repolens-perf/scripts/build_context_pack.mjs /path/to/your/repo "<route-or-module>"
node repolens-perf/scripts/perf_report.mjs /path/to/your/repo "<route-or-module>"
node repolens-algo/scripts/build_block_profiles.mjs /path/to/your/repo "<route-or-module>"
node repolens-algo/scripts/retrieve_algorithms.mjs /path/to/your/repo "<route-or-module>"
node repolens-algo/scripts/generate_algo_report.mjs /path/to/your/repo "<route-or-module>"
```

Examples:

```bash
node repolens-perf/scripts/build_context_pack.mjs ~/work/app "/dashboard"
node repolens-perf/scripts/perf_report.mjs ~/work/app "RichTextRenderer"
node repolens-perf/scripts/perf_report.mjs ~/work/app "/api/posts"
```

## Generated Memory

The indexer writes:

```text
.project-memory/
  PROJECT_PROFILE.md
  files.json
  imports.json
  routes.json
  components.json
  apis.json
  performance_signals.json
  graph_metrics.json
  MODULE_SUMMARIES/
  graph/code_graph.json
  context-packs/
  reports/
  algo/
    block_profiles.json
    algorithm_matches.json
    reports/
```

## PerfGraph Workflow

1. Extract deterministic code facts.
2. Build a lightweight JSON code graph.
3. Match a target route, file, component, API, or keyword.
4. Retrieve the K-hop graph neighborhood.
5. Rank context and adjacent risks.
6. Generate a context pack for AI analysis.
7. Produce an evidence-backed performance report and focused coding prompt.

See `repolens-perf/references/perfgraph_algorithm.md` for details.

## AlgoGraph Workflow

1. Read `.project-memory/graph/code_graph.json` from the PerfGraph index.
2. Build a Block Profile for the target module.
3. Extract entities, actions, data shapes, current logic, task signals, and constraints.
4. Match the profile against local algorithm cards.
5. Score matches using task, data, objective, and constraint evidence.
6. Generate an Algorithm Opportunity Report with recommended phases, missing data, and algorithms to avoid now.

## Why This Is Algorithmic

RepoLens uses deterministic code fact extraction, API canonicalization, K-hop graph retrieval, context scoring, risk scoring, Block Profiles, and local algorithm-card matching. The goal is to make AI code analysis less open-ended than a normal repository prompt by giving the model a bounded, inspectable context pack and a constrained algorithm knowledge base.

## Skill Usage

The reusable Skills live in `repolens-perf/` and `repolens-algo/`. To install them for Codex discovery, copy or symlink those folders into your Codex skills directory.

```bash
mkdir -p ~/.codex/skills
cp -R repolens-perf ~/.codex/skills/
cp -R repolens-algo ~/.codex/skills/
```

Then invoke it in Codex with:

```text
Use $repolens-perf to index this repository and analyze /activity/:id performance.
Use $repolens-algo to identify algorithm opportunities for /activity/:id.
```

## Notes

- Static signals are leads, not proof of runtime slowness.
- Confirm high-impact findings with profiling, network traces, API latency measurements, or large fixtures.
- The first version intentionally avoids external databases; the graph is plain JSON for portability.
- Context packs use a narrower handoff scope for AI agents; performance reports may use a wider analysis scope to include adjacent risk evidence.

## Roadmap

- Add more algorithm cards for risk scoring, anomaly detection, time series forecasting, and edge inference.
- Shared core helpers for target matching, graph traversal, and report validation.
