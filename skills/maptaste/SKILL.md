---
name: maptaste
description: Choose one named MapLibre taste and check the style against that school. Tastes are ink-paper, night-ops, civic, editorial, cn-metro, and terrain-quiet.
---

Do not ship the default MapLibre look. Pick one taste, then build and check against that school.

1. List tastes with `npx maptaste tastes`. Read tokens and rules with `npx maptaste tokens --taste <name>`.
2. Choose one:
   - Print, atlas, or a general basemap → `ink-paper` (`--pack global` is this alias).
   - Dark operations or a night UI → `night-ops`.
   - Government or open-data choropleth → `civic`.
   - A magazine or story map → `editorial`.
   - A Chinese city or transit map → `cn-metro` (`--pack cn` is this alias).
   - Hillshade or quiet terrain → `terrain-quiet`.
3. Install that plate with `npx maptaste apply --taste <name>`. It writes tokens and a style that already passes. Replace the empty GeoJSON with the real data. Keep the plate: which roads exist, roman / bold / one italic headline, flat or extruded, and the caps.
4. Or print the style with `npx maptaste example --taste <name>`.
5. Run `npx maptaste check style.json --taste <name>`. Fix errors before shipping. Warnings are still findings.

A taste is a plate plus tokens. The plate is road grammar, type, label count, line-layer count, extrusion, and ground. Swapping a color array onto the same street atlas is not the taste. Stripping the colors should still leave a different map.

The checker reads the style document only. It does not see features, a legend, or a rendered image. `hsl()` and data-driven colors are reported as unresolved (MT014), not as a pass. Stops of `0` and negative stops are real. Omitted opacity is the MapLibre default, not zero. Read the `Coverage:` line. No blocking taste errors is not a MapLibre validation, and unresolved values are outside the score.

Rainbow fills are an error in every taste (MT001). Layout should explain itself. These checks are heuristics, not schema validation or a substitute for looking at the map.
