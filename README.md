# Agents ship the same default MapLibre look everywhere.

Pick one named taste, check a MapLibre style against that school, and use its tokens. Not one shared palette.

```sh
npx maptaste check style.json --taste ink-paper
```

[![npm](https://img.shields.io/npm/v/maptaste)](https://www.npmjs.com/package/maptaste)
[![demo](https://img.shields.io/badge/demo-maptaste.ledring.dev-555555)](https://maptaste.ledring.dev)

## Tastes

| Taste | School | What the check enforces |
| --- | --- | --- |
| `ink-paper` | Print cartography | Paper ground, hairline strokes, sequential lightness, ≤ 8 text layers, ≤ 2 line hues. `--pack global` |
| `night-ops` | Dark operations | Near-black ground, label contrast ≥ 7, diverging fills allowed, heavier strokes |
| `civic` | Open-data choropleth | Neutral paper, ≤ 7 classes, lightness that only moves one way |
| `editorial` | Magazine story map | ≤ 3 text layers, one headline, a real size step, one line hue |
| `cn-metro` | Chinese city and transit | ≤ 6 text layers, route-colored lines, sequential data fills. `--pack cn` |
| `terrain-quiet` | Hillshade | Muted ground, low saturation, translucent fills, hairline strokes |

```sh
npx maptaste tastes
npx maptaste tokens --taste editorial
npx maptaste example --taste night-ops
```

`tastes` lists the catalog. `tokens --taste` prints that school's colors and the rules sentence the checker uses. `example --taste` prints a style that scores 100 under that taste. Each taste is tokens plus composition — ground, label cap, contrast, class count, stroke width, line hues — not a color swap of the same map.

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

`ink-paper` allows 8 text layers. `cn-metro` allows 6. `editorial` allows 3 and requires one headline. A style can pass one taste and fail another with the same colors, because the caps are different.

## Showcase

[maptaste.ledring.dev](https://maptaste.ledring.dev)

The first screen is the catalog: six tastes, each with a before ramp and that taste's after ramp. Choosing one opens the city study. Before is the rainbow enemy. After uses that taste's ground, ramp, labels, and — for `cn-metro` — route-colored roads. Classes, label size, label count, and stroke are knobs. Past the taste's cap, the score on the specimen drops.

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
