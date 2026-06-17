# Frontend Performance Rules

Use these rules for React, Vue, Svelte, and browser-heavy modules. RepoLens currently detects the most portable subset statically; add runtime profiling for high-risk changes.

## Rule Catalog

| Rule | Static Signal | Why It Matters | Typical Fix |
|---|---|---|---|
| `large_list_render` | UI file contains list rendering such as `.map()` | Long lists can block render, inflate DOM nodes, and slow interactions. | Add pagination, virtualization, infinite loading, or server-side slicing. |
| `image_without_lazy` | `<img>` appears without `loading=` | Image grids can compete with critical content and waste bandwidth. | Add `loading="lazy"`, thumbnails, stable width/height, and responsive sizes. |
| `rich_text_reparse` | `dangerouslySetInnerHTML`, markdown parsers, `remark`, or `rehype` | Rich text may be reparsed on every render and can contain heavy media. | Memoize parsed HTML, sanitize once, cache server output, and test complex blocks. |
| `expensive_render_compute` | `.sort()` or `.filter()` appears in a component-like file | Sorting/filtering during render can repeat on every state change. | Use `useMemo`, precompute in selectors, or move work to the API. |
| `duplicated_request` | `useEffect` plus request-like calls | Parent/sidebar/detail components can fetch the same record separately. | Share query state, use cache keys, or merge data requirements. |
| `heavy_dependency_import` | Heavy packages imported directly | Large bundles hurt first load and route transitions. | Use subpath imports, dynamic import, or lighter alternatives. |

## Review Heuristics

- For route pages, check list rendering, media loading, rich text, charts, editors, and table density first.
- For cards and feeds, inspect image dimensions and loading strategy.
- For search, inspect debounce, cancellation, cache keys, empty states, and backend boundary.
- For dashboards, inspect chart library import style and whether hidden tabs still render expensive panels.
- For dark-mode or themed apps, confirm rich text and third-party content inherit tokens correctly.

## Evidence Wording

Use direct wording:

- "Detected `large_list_render` in `src/components/WorkCardList.tsx` because the component maps every work item into DOM nodes."
- "This is a static risk, not proof of slowness. Confirm with a large fixture or browser profiling."

Avoid vague wording such as "React is slow" or "use memo everywhere".
