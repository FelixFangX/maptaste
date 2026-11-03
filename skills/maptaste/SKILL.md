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
3. Copy a passing style with `npx maptaste example --taste <name>` and replace the empty GeoJSON with the real data. Keep that taste's ground, stroke cap, label cap, and ramp.
4. Run `npx maptaste check style.json --taste <name>`. Fix errors before shipping. Warnings are still findings.

A taste is tokens plus composition: ground luminance, how many text layers, contrast, class count, whether lightness may reverse, stroke width, how many line hues, and (for terrain-quiet) fill opacity. Swapping a color array without those rules is not the taste.

Rainbow fills are an error in every taste (MT001). Layout should explain itself. These checks are heuristics, not schema validation or a substitute for looking at the map.
