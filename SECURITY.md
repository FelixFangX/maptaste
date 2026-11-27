# Security Policy

## Reporting a vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Report issues privately through one of these channels:

1. **GitHub Security Advisories** (preferred): [Report a vulnerability](https://github.com/FelixFangX/maptaste/security/advisories/new) on `FelixFangX/maptaste`.
2. **Email**: send details to `felix@ledring.dev` with reproduction steps and affected versions.

Include a minimal reproduction (style JSON, CLI arguments, MCP payload, or showcase/worker request) so the issue can be verified and patched quickly.

## Scope

In scope:

- The `maptaste` CLI and library (`src/`).
- The `maptaste-mcp` stdio server (`src/mcp/`).
- The showcase app and Cloudflare Worker (`showcase/`, `worker/`).

Out of scope:

- Third-party tile, glyph, sprite, or geocoding providers (e.g., OpenFreeMap, Nominatim).
