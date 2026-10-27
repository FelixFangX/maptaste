# maptaste

MapLibre style taste checks for coding agents. Four heuristics, two skill packs, an MCP server, and a local map showcase.

## Problem

Agents ship ugly MapLibre styles: rainbow fills, faint labels, crowded names, and light-only palettes. Maptaste flags common mistakes before visual review. It is not a full MapLibre validator; expressions and real rendering still need inspection.

## Demo

![Maptaste demo](docs/demo.gif)

The showcase pairs a cinematic MapLibre basemap with real San Francisco building massing: sequential blues in Taste, rainbow colors in Harsh, and Light / Dark themes. The demo GIF and images below show the earlier cell-based version.

| Harsh (MT001) | Taste | Dark |
| --- | --- | --- |
| ![Harsh](docs/example-harsh.png) | ![Taste](docs/example-taste.png) | ![Dark](docs/example-dark.png) |

## Install

Node 20+ and pnpm.

```sh
pnpm add -g maptaste
# or run without installing
npx maptaste check style.json
```

## CLI

```sh
maptaste check style.json --pack global
maptaste check style.json --pack cn --format json
```

JSON output contains `{ findings, score, summary }`. Exit codes: 0 without errors, 1 with errors, 2 for bad input. Warnings and informational findings do not fail the command.

| Rule | Default | Heuristic |
| --- | --- | --- |
| MT001 | error | Fill colors span at least four saturated hue sectors |
| MT002 | warn | Static label color has contrast below 4.5 against a halo or background |
| MT003 | info | No dark background or theme declaration in metadata |
| MT004 | warn | More than 8 text symbol layers (6 for cn), or 3 large text defaults |

Score: `max(0, 100 - 10*errors - 3*warnings - info)`. Static colors support hex, rgb(), and common names. Dynamic colors, zoom visibility, and feature counts are not evaluated. Metadata keys containing `dark`, `theme`, or `styles` declare theme consideration.

```ts
import { check } from 'maptaste';
const result = check({ version: 8, layers: [] }, { pack: 'global' });
```

## MCP

Build with `pnpm install && pnpm build`. Add to Claude Desktop or Cursor's MCP configuration (replace the absolute path):

```json
{
  "mcpServers": {
    "maptaste": {
      "command": "node",
      "args": ["/absolute/path/maptaste/dist/mcp/server.js"]
    }
  }
}
```

The installed binary is `maptaste-mcp`. It uses the MCP SDK over stdio. Tools: `check_taste` accepts `{ "style": {} }` or `{ "styleJson": "..." }`; `validate_style` accepts `{ "style": {} }` and checks object/version/layers structure; `preview_info` locates the showcase. Validation is intentionally basic.

## Skills

Load `skills/maptaste-global/SKILL.md` or `skills/maptaste-cn/SKILL.md` in your agent's skill directory. Both use paper `#ebe7df`, void `#0b0b0b`, navy `#1a2a4a`, and pale blue `#9eb6d4`. The cn pack emphasizes administrative label hierarchy and uses a lower label-layer threshold.

## Showcase

A standalone Vite + MapLibre app with a cinematic San Francisco basemap, real building footprints and heights, a 57° pitched camera, and soft sky haze. Taste / Harsh switches sequential blues to a loud rainbow; Light / Dark changes the full map palette. Both preserve your camera.

A local snapshot of the public OpenFreeMap Liberty style is adapted in `showcase/src/main.ts`. OpenFreeMap supplies tiles, glyphs, and sprites without an API key; an internet connection and WebGL are required. Map attribution remains visible. Google Fonts supplies Instrument Serif, with a local serif fallback.

```sh
cd showcase
pnpm install
pnpm dev
# production check
pnpm build
```

## Development

```sh
pnpm install
pnpm build
pnpm test
```

## License

MIT © 2026 Felix Fang.
