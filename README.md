# maptaste

MapLibre style taste checks for coding agents. M0: four heuristics, two skill packs, an MCP server, and a local map showcase.

## Problem

Agents ship ugly MapLibre styles: rainbow fills, faint labels, crowded names, and light-only palettes. Maptaste flags common mistakes before visual review. It is not a full MapLibre validator; expressions and real rendering still need inspection.

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

JSON returns `{ findings, score, summary }`. Exit codes: 0 without errors, 1 with errors, 2 for bad input. Warnings and info do not fail the command.

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

Separate Vite app with local GeoJSON, sequential blues, and light/dark themes. No map token or tile service required; WebGL is required. Google Fonts supplies the single serif headline, with a local serif fallback.

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

## Demo

Add docs/demo.gif after recording.

## License

MIT © 2026 Felix Fang.
