---
name: maptaste-cn
description: Build restrained MapLibre styles for the cn audience and check map taste.
---

1. Pick the `cn` pack (`--pack cn`).
2. Read tokens: paper `#ebe7df`, void `#0b0b0b`, light accent navy `#1a2a4a`, dark accent pale blue `#9eb6d4`. Avoid red brand accents.
3. Build MapLibre style JSON. Use sequential color for ordered data, clear label hierarchy, and light/dark variants declared in metadata.
4. Run `npx maptaste check style.json --pack cn`. Review findings and inspect the map at multiple zoom levels.

Rules: MT001 rainbow choropleth (error), MT002 label contrast (warn), MT003 dark-mode consideration (info), MT004 label density (warn).

For Chinese maps, prioritize administrative labels (行政区标注密度) by zoom and rank; keep 配色 restrained. The cn pack flags more than six text symbol layers.

Layout explains itself. Avoid helper-label spam. These checks are heuristics, not full schema validation or a substitute for visual review.
