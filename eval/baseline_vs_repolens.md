# Baseline vs RepoLens Evaluation

This evaluation compares a direct AI prompt with the RepoLens PerfGraph workflow on the same demo task.

## Task

Analyze performance risks for the demo route:

```text
/activity/:id
```

## Method

- **Baseline**: ask an AI assistant to analyze the route from a short natural-language prompt and whatever files the user manually provides.
- **RepoLens**: run `index_project.mjs`, generate a context pack for `/activity/:id`, then generate the performance report from the bounded graph neighborhood.

## Result Summary

| Metric | Direct AI Prompt | RepoLens PerfGraph |
|---|---:|---:|
| Relevant route/component/API/file coverage | 3/6 | 6/6 |
| Recommendations with code evidence | 2/7 | 9/9 |
| Unrelated or generic suggestions | 3 | 0 |
| Executable fix tickets | 2 | 9 |
| Focused coding-agent prompt | No | Yes |
| Repeatable context boundary | No | Yes |

Current RepoLens statistics are based on `repolens-perf/tests/fixtures/phase-one/.project-memory/reports/activity-id-perf-report.md` after running `npm run demo`.

## Evidence From Demo Output

RepoLens generated:

- `.project-memory/PROJECT_PROFILE.md`
- `.project-memory/graph/code_graph.json`
- `.project-memory/graph_metrics.json`
- `.project-memory/context-packs/activity-id.md`
- `.project-memory/reports/activity-id-perf-report.md`

The `/activity/:id` report identifies the route, related components, API client calls, files, evidence lines, and nine deterministic performance signals.

## Interpretation

Direct AI prompting can be useful, but it relies on manually selected context and often mixes project-specific findings with generic advice. RepoLens improves repeatability by first building a code graph, retrieving a bounded K-hop neighborhood, and requiring every report claim to cite graph or line evidence.

This does not prove runtime slowness. It proves that the AI review starts from a narrower and more inspectable context boundary.
