---
name: maptaste-cn
description: Build a cn-metro MapLibre style for a Chinese city or transit map. --pack cn is the alias for the cn-metro taste.
---

This skill selects the `cn-metro` taste. `--pack cn` is the alias. For the full catalog, follow `maptaste` and run `npx maptaste tastes`.

1. Read `npx maptaste tokens --taste cn-metro`.
2. Paper ground, at most six text layers, sequential fills for data, and route lines that may use several hues. Strokes may be heavier than ink-paper. Prioritize administrative labels (行政区) by zoom and rank. Keep choropleth fills out of the route palette.
3. Build MapLibre style JSON. Declare light and dark variants in metadata.
4. Run `npx maptaste check style.json --taste cn-metro`. `--pack cn` checks the same taste.

The cn-metro cap is six text layers, stricter than ink-paper's eight. These checks are heuristics, not schema validation or a substitute for looking at the map.
