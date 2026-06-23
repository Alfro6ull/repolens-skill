# Baseline vs RepoLens Evaluation

This evaluation compares a direct AI prompt with the RepoLens knowledge-graph workflow on the same algorithm opportunity task.

## Task

Identify the first safe algorithm route for the demo module:

```text
/discover
```

## Method

- **Baseline**: ask an AI assistant to suggest algorithms from a short natural-language description and manually selected files.
- **RepoLens**: run `index_project.mjs`, build a code knowledge graph, create a Block Profile for `/discover`, then match it against local algorithm cards.

## Result Summary

| Metric | Direct AI Prompt | RepoLens AlgoGraph |
|---|---:|---:|
| Route/component/API coverage | Manual | Graph-derived |
| Data entities identified | Inferred from prompt | item, tag, query, content |
| Ranking signals identified | Ad hoc | explicit_score, text_similarity |
| Missing data called out | Often generic | behavior_log_missing, exposure logs, click feedback |
| Algorithm source boundary | Open-ended | local `algorithm_index.json` only |
| Not-recommended algorithms | Usually omitted | LTR/CF/bandit blocked by missing logs |
| Repeatable context boundary | No | Yes |

## Evidence From Demo Output

RepoLens generated:

- `.project-memory/algorithm_signals.json`
- `.project-memory/graph/code_graph.json`
- `.project-memory/algo/block_profiles.json`
- `.project-memory/algo/algorithm_matches.json`
- `.project-memory/algo/reports/discover-algo-report.md`

The `/discover` report identifies item metadata, query/search behavior, ranking signals, missing feedback logs, and a bounded first route through Content-Based Recommendation plus Hybrid Search.

## Interpretation

Direct prompting can brainstorm algorithms, but it often jumps to heavy recommendations without proving that the code has the right entities, actions, or logs. RepoLens improves repeatability by first building a code knowledge graph, then constraining recommendations to local algorithm cards and explicit graph evidence.

This does not prove product impact. It proves that algorithm planning starts from a narrower, inspectable evidence boundary.
