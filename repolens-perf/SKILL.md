---
name: repolens-perf
description: Distill a software repository into lightweight project memory, a JSON code graph, route/component/API maps, and evidence-backed module performance reports. Use when the user asks Codex to understand a codebase, build project memory, trace a route/file/component/API, analyze frontend or backend performance risks, generate fix tickets, or produce a focused prompt for another coding agent.
---

# RepoLens Perf

RepoLens Perf turns a repository into a small, inspectable code memory before asking the model to reason. Prefer evidence from generated indexes and graph neighborhoods over broad guesses.

## Workflow

1. Run the indexer from the target repository:

```bash
node repolens-perf/scripts/index_project.mjs /path/to/repo
```

This creates `.project-memory/` with project profile, route map, component map, API map, performance signals, module summaries, and `graph/code_graph.json`.

2. Trace a target route, file, component, API, or keyword:

```bash
node repolens-perf/scripts/trace_module.mjs /path/to/repo "/activity/:id" --hops 3
```

3. Build a context pack for the target graph neighborhood:

```bash
node repolens-perf/scripts/build_context_pack.mjs /path/to/repo "/activity/:id"
```

4. Generate an evidence-backed performance report:

```bash
node repolens-perf/scripts/perf_report.mjs /path/to/repo "/activity/:id"
```

5. Read only the reference material needed for the task:

- Use `references/frontend_perf_rules.md` for React/Vue/Svelte/browser UI risks.
- Use `references/backend_perf_rules.md` for API/database/server risks.
- Use `references/perfgraph_algorithm.md` when explaining context ranking, K-hop retrieval, risk scoring, or AI evidence constraints.
- Use `references/graph_schema.md` when extending graph nodes, edges, or scanners.
- Use `references/report_format.md` when writing final reports, fix tickets, or coding-agent prompts.

## Analysis Rules

- Start with `.project-memory/PROJECT_PROFILE.md` and the trace/report output.
- Treat scanner output as evidence, not as a final answer. If a risk depends on runtime behavior, mark it as "needs measurement".
- Keep the scope to the traced graph neighborhood unless the user asks for a full-repo audit.
- For every performance claim, include at least one of: route, file, component, API endpoint, import edge, render edge, request edge, or signal rule.
- Separate deterministic findings from model inference.
- Turn each meaningful risk into an executable fix ticket with touched files, acceptance criteria, and verification steps.

## Common Requests

### Build Project Memory

Run `index_project.mjs`. If the project is large, ask the user before indexing generated folders or vendored code. The default excludes `node_modules`, build outputs, lock files, `.git`, and `.project-memory`.

### Analyze A Route Or Module

Run `trace_module.mjs` with a specific target. Use `--hops 3` for route-to-component tracing, and rely on `perf_report.mjs` default depth for route performance reports. Build a context pack with `build_context_pack.mjs` when the user needs a compact handoff artifact for another AI agent. Use the report as the first draft and improve it with code reading when needed.

### Produce A Coding-Agent Prompt

Use the "Focused Coding Prompt" section from `perf_report.mjs`. Tighten it to the current repository conventions and include exact file paths.

### Extend The Skill

Add new rule detectors to `scripts/index_project.mjs`, document the rule in the matching reference file, and keep graph node/edge names aligned with `references/graph_schema.md`.
