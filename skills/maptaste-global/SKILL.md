---
name: maptaste-global
description: Build restrained MapLibre styles for the global audience and check map taste.
---

1. Pick the `global` pack (`--pack global`).
2. Read tokens: paper `#ebe7df`, void `#0b0b0b`, light accent navy `#1a2a4a`, dark accent pale blue `#9eb6d4`. Avoid red brand accents.
3. Build MapLibre style JSON. Use sequential color for ordered data, clear label hierarchy, and light/dark variants declared in metadata.
4. Run `npx maptaste check style.json --pack global`. Review findings and inspect the map at multiple zoom levels.

Rules: MT001 rainbow choropleth (error), MT002 label contrast (warn), MT003 dark-mode consideration (info), MT004 label density (warn).

Prioritize place names by zoom; avoid competing labels and oversized default text.

Layout explains itself. Avoid helper-label spam. These checks are heuristics, not full schema validation or a substitute for visual review.
