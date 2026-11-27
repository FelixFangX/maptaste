# Contributing

Keep changes small, concrete, and backed by tests. `maptaste` checks MapLibre style documents directly — no invented defaults, no silent passes on unreadable values.

## Setup and checks

Node 20 or newer and `pnpm` are required.

```sh
pnpm install
pnpm --dir showcase install
```

Run the same checks CI runs (`.github/workflows/check.yml`) before opening a pull request:

```sh
pnpm exec tsc --noEmit
pnpm exec tsc -p showcase --noEmit
pnpm test
pnpm build
pnpm --dir showcase build
```

## Proposing a rule

1. State the cartographic failure clearly and include a minimal MapLibre style JSON fixture that demonstrates it.
2. Keep findings honest: report what the document actually contained (`evidence`), and emit `MT014` when a value cannot be resolved statically instead of treating it as a pass.
3. Add focused unit tests in `test/` covering both the failing case and a restrained passing style, plus edge cases (e.g., `0`, negative stops, `visibility: "none"`, omitted spec defaults).

## Proposing a taste plate

A taste is a plate, not a palette swap. Stripping the colors should still leave a distinct map.

Before submitting a new taste, define:

- **Road grammar** (which road classes stay, casings on/off, stroke cap, line layer cap).
- **Typography** (roman, bold, or italic headline, label layer cap, minimum contrast).
- **Ground and extrusion** (paper, night, or muted ground luminance bounds; flat or extruded).
- **Specimen** in `src/specimens.ts` and `test/fixtures/tastes/` that scores 100 under its own taste.

Open an issue first if you are proposing a new taste or changing existing rule thresholds.
