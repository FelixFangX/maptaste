# Agents ship the same default MapLibre look everywhere.

Pick one named taste, check a MapLibre style against that school, and use its tokens. Not one shared palette.

```sh
npx maptaste check style.json --taste ink-paper
```

[![npm](https://img.shields.io/npm/v/maptaste)](https://www.npmjs.com/package/maptaste)
[![demo](https://img.shields.io/badge/demo-maptaste.ledring.dev-555555)](https://maptaste.ledring.dev)

## Tastes

| Taste | School | What stays different with the colors removed |
| --- | --- | --- |
| `ink-paper` | Print cartography | Flat plate, hairline roads, no casings, roman labels. `--pack global` |
| `night-ops` | Dark operations | Extruded buildings, bold type, steep pitch, major roads, contrast ≥ 7 |
| `civic` | Open-data choropleth | North-up plan, boundaries heavier than streets, admin labels |
| `editorial` | Magazine story map | Street network removed, one italic headline, ≤ 3 text layers, ≤ 2 line layers |
| `cn-metro` | Chinese city and transit | Thick routes, minor streets hidden, bold admin labels. `--pack cn` |
| `terrain-quiet` | Hillshade | Relief frame, roads nearly gone, translucent fills, muted ground |

```sh
npx maptaste tastes
npx maptaste tokens --taste editorial
npx maptaste example --taste night-ops
npx maptaste apply --taste civic
```

`tastes` lists the catalog. `tokens --taste` prints that school's colors and the rules sentence the checker uses. `example --taste` prints a style that scores 100 under that taste. `apply --taste` writes `<taste>.tokens.json` and `<taste>.style.json` (default directory `maptaste/`). Each taste is a plate: which roads stay, roman or bold or one italic headline, flat or extruded, plus the color tokens. Swapping a color array onto the same street atlas is not the taste.

## Pack aliases

| `--pack` | Taste |
| --- | --- |
| `global` | `ink-paper` |
| `cn` | `cn-metro` |

`--pack` still works. `--taste` and `--pack` together are an error when they name different schools. With neither flag, the check is `ink-paper`.

## Check

```sh
npx maptaste check style.json --taste civic
npx maptaste check style.json --pack cn
npx maptaste check style.json --taste cn-metro --format json
```

Node 20 or newer. The rules are heuristics. Render the map before trusting a score.

From a checkout:

```sh
pnpm install
pnpm build
node dist/cli.js check test/fixtures/bad-style.json --taste ink-paper
```

That fixture prints:

```text
ERROR MT001 layers[1].paint.fill-color: Rainbow choropleth obscures ordering; use a restrained sequential or diverging scale.
WARN MT002 layers[2].paint: Low-contrast labels need a contrasting halo or stronger text color.
…
INFO MT003 metadata: Missing dark-mode consideration; provide a dark background or declare theme variants in metadata.
WARN MT004 layers: ink-paper allows 8 text layers; this style has 10. Prioritize places by zoom and reduce large default text sizes.
WARN MT006 layers[1].paint.fill-color: ink-paper keeps fills quiet; a fill here is past saturation 0.55.
WARN MT007 layers[1].paint.fill-color: ink-paper uses a sequential scale; fill lightness should move in one direction.
Taste: ink-paper
Score: 50/100 — 1 errors, 13 warnings, 1 info
```

The skipped lines are the same MT002 warning on `layers[3]` through `layers[11]`.

Exit 0 when no finding is an error, 1 when any finding is an error, 2 when the file or the flags are invalid. Warnings and info are printed and leave the exit code at 0. `--format json` prints `{ findings, score, summary, taste }`.

The score starts at 100. Each error subtracts 10, each warning 3, each info 1, with a floor of 0. Colors read: `#rgb`, `#rrggbb`, `rgb()`, and white, black, red, orange, yellow, green, blue, purple, cyan, including those literals inside an expression. `rgba()`, `hsl()`, zoom, and feature counts are ignored. Stroke width and text size are read only when they are plain numbers.

```ts
import { check } from 'maptaste';

const result = check({ version: 8, layers: [] }, { taste: 'civic' });
```

`{ pack: 'global' }` checks `ink-paper`. `{ pack: 'cn' }` checks `cn-metro`.

## Skills

```sh
npx skills add FelixFangX/maptaste --skill maptaste
```

`maptaste` is the selector: it lists the six tastes and tells the agent to check with `--taste`. `maptaste-global` is the `ink-paper` alias (`--pack global`). `maptaste-cn` is the `cn-metro` alias (`--pack cn`).

```sh
npx skills add FelixFangX/maptaste --skill maptaste-global
npx skills add FelixFangX/maptaste --skill maptaste-cn
```

Or copy `skills/maptaste` into the agent's skills directory and tell it to follow that skill.

## Rules

Caps below are the taste's own numbers (`npx maptaste tokens --taste <name>`). MT001 is an error in every taste.

| ID | Default | Name | Heuristic |
| --- | --- | --- | --- |
| MT001 | error | rainbow-choropleth | Fill colors span at least four saturated hue sectors |
| MT002 | warn | label-contrast | Static label contrast is below the taste minimum (4.5, or 7 for night-ops) |
| MT003 | info | dark-mode | No dark background or theme declaration in metadata |
| MT004 | warn | label-density | More text layers than the taste allows, or 3 or more numeric text sizes of 24 or higher |
| MT005 | warn, error on night-ops | ground | Background luminance disagrees with the taste (paper, night, or muted) |
| MT006 | warn | fill-saturation | A fill color is more saturated than the taste allows |
| MT007 | warn | class-discipline | Too many fill stops, or sequential lightness reverses |
| MT008 | warn | label-hierarchy | Editorial only: more than one headline, or labels without a size step |
| MT009 | warn | line-weight | A numeric line width is heavier than the taste's stroke cap |
| MT010 | warn | fill-opacity | terrain-quiet only: a fill is too opaque for a hillshade to read |
| MT011 | warn | line-chroma | Line colors span more hue sectors than the taste allows |
| MT012 | warn | line-count | More line layers than the plate allows |
| MT013 | warn | typeface | Declared `text-font` is bold or italic on a roman plate, or not the face that plate asks for |

`ink-paper` allows 8 text layers and 6 line layers, set in roman. `editorial` allows 3 text layers, 2 line layers, and one italic headline. `night-ops` is bold. A style can pass one taste and fail another with the same colors, because the plate is different. Missing `text-font` is not a finding. A face that is set and wrong is.

## Showcase

[maptaste.ledring.dev](https://maptaste.ledring.dev)

The first screen is the catalog: six tastes, each with a before ramp, that taste's after ramp, and a plate mark (stroke weight, label ranks). Choosing one opens the city study on that plate's camera. Before is the noisy rainbow atlas. After drops casings, minor streets, or the whole street network, changes the type, and — for night-ops — stands the buildings up. Terrain opens on the hillshade, not the towers. Classes, label size, label count, and stroke are knobs. Past the taste's cap, the score on the specimen drops.

![Before / After demo](docs/demo.gif)

Tiles, glyphs, and sprites come from OpenFreeMap with no API key. The page needs a network connection and WebGL. Attribution stays on the map.

Presets: San Francisco, Tokyo, 上海, 外滩, London, Paris. Other place names can be English, Chinese, or another local name. `lang` sets the caption language. Workers AI expands informal names, and names Nominatim misses or mismatches (2,000 per day, 40 per IP). Sessions are capped at 5,000 per day and 20 per IP.

- https://maptaste.ledring.dev/?taste=night-ops
- https://maptaste.ledring.dev/?place=Tokyo&taste=editorial
- https://maptaste.ledring.dev/?place=上海&taste=cn-metro
- https://maptaste.ledring.dev/?ll=139.7671,35.6812&place=Tokyo
- https://maptaste.ledring.dev/?place=Paris&lang=zh

Try check runs this same `check` against the selected taste, on the rainbow fixture, that taste's specimen, or style JSON you paste. Copy style copies the current city and camera as MapLibre style JSON.

```sh
cd showcase
pnpm install
pnpm dev
```

Deploy stays on Wrangler: `pnpm deploy` builds the showcase and runs `wrangler deploy`.

## MCP

Published as `maptaste@0.0.1`.

```sh
npx -y maptaste mcp
```

Cursor or Claude Desktop:

```json
{
  "mcpServers": {
    "maptaste": {
      "command": "npx",
      "args": ["-y", "maptaste", "mcp"]
    }
  }
}
```

`maptaste-mcp` is the same server (`npx -y --package maptaste maptaste-mcp`). From a checkout: `pnpm install && pnpm build`, then `node dist/cli.js mcp` or `node dist/mcp/server.js`.

- `list_tastes` returns the catalog: id, school, tokens, composition, and the rules sentence.
- `check_taste` takes `{ "style": {} }` or `{ "styleJson": "..." }`, plus optional `taste` and `pack`. The default taste is `ink-paper`.
- `validate_style` checks for an object with `version` and a `layers` array.
- `preview_place` takes `place` or `ll` (`lng,lat`), and optional `zoom`, `mode` (`before` or `after`), `theme` (`light` or `dark`), `taste`, and `lang`. It returns a `https://maptaste.ledring.dev/` URL. A name is resolved in the browser, so `center` is null until then.
- `preview_info` points at the local showcase: `cd showcase && pnpm install && pnpm dev`.

0.0.1. Thresholds can change in any 0.x release. Input is MapLibre style JSON.

## License

[MIT](LICENSE).
