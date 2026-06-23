---
name: repolens-perf
description: Index repos into a code knowledge graph. Use for route/module/API tracing, context packs, graph facts, performance signals, or AlgoGraph preparation.
---

# RepoLens Perf

RepoLens Perf is the indexing and tracing layer for RepoLens. It turns a repository into a small, inspectable code knowledge graph before asking the model to reason. Prefer generated graph facts and graph neighborhoods over broad guesses.

## Workflow

1. Run the indexer from the target repository:

```bash
node repolens-perf/scripts/index_project.mjs /path/to/repo
```

This creates `.project-memory/` with project profile, route map, component map, API map, performance signals, algorithm signals, module summaries, and `graph/code_graph.json`.

2. Trace a target route, file, component, API, or keyword:

```bash
node repolens-perf/scripts/trace_module.mjs /path/to/repo "/discover" --hops 3
```

3. Build a context pack for the target graph neighborhood:

```bash
node repolens-perf/scripts/build_context_pack.mjs /path/to/repo "/discover"
```

4. Optionally generate a supporting performance report:

```bash
node repolens-perf/scripts/perf_report.mjs /path/to/repo "/discover"
```

5. Read only the reference material needed for the task:

- Use `references/frontend_perf_rules.md` for React and browser UI risks.
- Use `references/backend_perf_rules.md` for API/database/server risks.
- Use `references/perfgraph_algorithm.md` when explaining graph extraction, K-hop retrieval, context ranking, risk scoring, or AI evidence constraints.
- Use `references/graph_schema.md` when extending graph nodes, edges, or scanners.
- Use `references/report_format.md` when writing optional performance reports or coding-agent prompts.

## Analysis Rules

- Start with `.project-memory/PROJECT_PROFILE.md` and the trace/report output.
- Treat scanner output as evidence, not as a final answer. If a risk depends on runtime behavior, mark it as "needs measurement".
- Keep the scope to the traced graph neighborhood unless the user asks for a full-repo audit.
- For every algorithm or performance claim, include at least one of: route, file, component, API endpoint, data entity, user action, ranking signal, import edge, render edge, request edge, or signal rule.
- Separate deterministic findings from model inference.
- Turn each meaningful risk into an executable fix ticket with touched files, acceptance criteria, and verification steps.

## Common Requests

### Build Project Memory

Run `index_project.mjs`. If the project is large, ask the user before indexing generated folders or vendored code. The default excludes `node_modules`, build outputs, lock files, `.git`, and `.project-memory`.

### Analyze A Route Or Module

Run `trace_module.mjs` with a specific target. Use `--hops 3` for route-to-component tracing. Build a context pack with `build_context_pack.mjs` when the user needs a compact graph handoff artifact for another AI agent. Use `perf_report.mjs` only when supporting performance signals matter for the requested module.

### Produce A Coding-Agent Prompt

Use the "Focused Coding Prompt" section from `perf_report.mjs`. Tighten it to the current repository conventions and include exact file paths.

### Extend The Skill

Add new rule detectors to `scripts/index_project.mjs`, document the rule in the matching reference file, and keep graph node/edge names aligned with `references/graph_schema.md`.
