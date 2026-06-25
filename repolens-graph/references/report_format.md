# Report Format

Use this structure for user-facing RepoLens performance reports.

## Required Sections

1. **Executive Summary**: target, traced scope, context pack path, and highest priority risk.
2. **Related Modules**: routes, files, components, and APIs in the graph neighborhood.
3. **Risk Table**: priority, rule, evidence, and recommended fix.
4. **Fix Tickets**: small executable tasks with rule-specific acceptance criteria.
5. **Focused Coding Prompt**: a prompt another coding agent can use without re-opening the whole repository.
6. **Notes**: static-analysis caveats and runtime verification reminders.

## Priority Guide

- `P1`: likely to affect user-visible latency, payload size, or route scalability.
- `P2`: likely to cause repeated work, medium bundle/render cost, or correctness risk under real content.
- `P3`: maintainability or future scalability risk.

## Context Pack Relationship

A report should point to the matching context pack path:

```text
.project-memory/context-packs/<safe-target>.md
```

The context pack is the bounded graph evidence handoff. The report is the interpreted performance analysis and fix-ticket layer.

## Public Demo Workflow

For the included demo repository:

```bash
node repolens-graph/scripts/index_project.mjs repolens-graph/tests/fixtures/phase-one
node repolens-graph/scripts/build_context_pack.mjs repolens-graph/tests/fixtures/phase-one "/activity/:id"
node repolens-graph/scripts/perf_report.mjs repolens-graph/tests/fixtures/phase-one "/activity/:id"
```

Open:

```text
repolens-graph/tests/fixtures/phase-one/.project-memory/context-packs/activity-id.md
repolens-graph/tests/fixtures/phase-one/.project-memory/reports/activity-id-perf-report.md
```
