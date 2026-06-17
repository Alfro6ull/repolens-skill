# Report Format

Use this structure for final user-facing reports.

## Required Sections

1. **Executive Summary**: one paragraph naming the target, traced scope, and highest priority risk.
2. **Evidence Map**: route, files, components, APIs, and graph edges that justify the analysis.
3. **Risk Table**: priority, rule, evidence, recommended fix.
4. **Fix Tickets**: small executable tasks with acceptance criteria.
5. **Focused Coding Prompt**: a prompt another coding agent can use without re-opening the whole repository.
6. **Verification Plan**: tests, manual checks, and runtime measurements.

## Priority Guide

- `P1`: likely to affect user-visible latency, payload size, or route scalability.
- `P2`: likely to cause repeated work, medium bundle/render cost, or correctness risk under real content.
- `P3`: maintainability or future scalability risk.

## Contest Demo Script

For a short demo, show this sequence:

1. Run `index_project.mjs` on the demo repository.
2. Open `.project-memory/PROJECT_PROFILE.md`.
3. Run `trace_module.mjs` for `/activity/:id`.
4. Run `perf_report.mjs` for `/activity/:id`.
5. Show one generated fix ticket and the focused coding prompt.

The story: "Before asking AI to fix performance, RepoLens gives AI a project memory and a graph boundary."
