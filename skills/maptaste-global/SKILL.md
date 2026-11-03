---
name: maptaste-global
description: Build an ink-paper MapLibre style. --pack global is the alias for the ink-paper taste.
---

This skill selects the `ink-paper` taste. `--pack global` is the alias. For the full catalog, follow `maptaste` and run `npx maptaste tastes`.

1. Read `npx maptaste tokens --taste ink-paper`.
2. Paper ground, hairline strokes, a short sequential ramp, at most eight text layers, at most two line hues. Lightness moves one way. Do not use a night ground or a route-colored subway diagram here.
3. Build MapLibre style JSON. Declare light and dark variants in metadata.
4. Run `npx maptaste check style.json --taste ink-paper`. `--pack global` checks the same taste.

Rules include MT001 rainbow choropleth (error) plus the ink-paper caps from `maptaste tokens`. Prioritize place names by zoom. Leave helper labels out. These checks are heuristics, not schema validation or a substitute for looking at the map.
