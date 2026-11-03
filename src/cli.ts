#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { check } from './engine.js';
import { tasteSpecimen } from './specimens.js';
import { isTaste, packAlias, tasteCatalog, tasteNames, tastes, tasteRules, type Taste } from './tastes.js';
import type { TasteName } from './types.js';

const usage = [
  'Usage: maptaste tastes [--format json|text]',
  '       maptaste tokens [--taste <name>] [--format json|text]',
  '       maptaste example --taste <name>',
  '       maptaste check <file.json> [--format json|text] [--taste <name>] [--pack global|cn]',
  '       maptaste mcp',
  '',
  `Tastes: ${tasteNames.join(', ')}`,
  'Pack aliases: --pack global = ink-paper, --pack cn = cn-metro',
].join('\n');

function pairs(args: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!key?.startsWith('--') || value === undefined || value.startsWith('--')) throw new Error(`Invalid option: ${key ?? ''} ${value ?? ''}`.trim());
    if (key in out) throw new Error(`Invalid option: ${key}`);
    out[key] = value;
  }
  return out;
}

function formatOf(opts: Record<string, string>, allowed: string[]): 'json' | 'text' {
  const extra = Object.keys(opts).filter(key => !allowed.includes(key));
  if (extra.length) throw new Error(`Invalid option: ${extra[0]} ${opts[extra[0]!] ?? ''}`);
  const format = opts['--format'] ?? 'text';
  if (format !== 'json' && format !== 'text') throw new Error(`Invalid option: --format ${format}`);
  return format;
}

function requireTaste(opts: Record<string, string>): TasteName {
  const name = opts['--taste'];
  if (!name || !isTaste(name)) throw new Error(name ? `Unknown taste: ${name}` : 'Missing --taste');
  return name;
}

function printTastes(format: 'json' | 'text') {
  const catalog = tasteCatalog();
  if (format === 'json') return JSON.stringify(catalog, null, 2);
  return catalog.map(taste => `${taste.id.padEnd(16)}${taste.summary}${taste.packAlias ? `  (--pack ${taste.packAlias})` : ''}`).join('\n');
}

function printTokens(format: 'json' | 'text', taste?: Taste) {
  const rows = (taste ? [taste] : tasteNames.map(id => tastes[id])).map(item => ({
    id: item.id,
    title: item.title,
    school: item.school,
    packAlias: item.packAlias ?? null,
    tokens: item.tokens,
    rules: tasteRules(item),
  }));
  if (format === 'json') return JSON.stringify(taste ? rows[0] : rows, null, 2);
  return rows.map(item => [
    item.id,
    `  school: ${item.school}`,
    `  paper: ${item.tokens.paper}`,
    `  ink: ${item.tokens.ink}`,
    `  void: ${item.tokens.void}`,
    `  accent: ${item.tokens.accent}`,
    `  halo: ${item.tokens.halo}`,
    `  sequential: ${item.tokens.sequential.join(' ')}`,
    item.tokens.diverging ? `  diverging: ${item.tokens.diverging.join(' ')}` : '',
    item.tokens.categorical ? `  categorical: ${item.tokens.categorical.join(' ')}` : '',
    `  rules: ${item.rules}`,
  ].filter(Boolean).join('\n')).join('\n\n');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === '--help' || command === '-h') { console.log(usage); return; }
  if (command === 'mcp') {
    if (rest.length) throw new Error(usage);
    await import('./mcp/server.js');
    return;
  }
  if (command === 'tastes') {
    console.log(printTastes(formatOf(pairs(rest), ['--format'])));
    return;
  }
  if (command === 'tokens') {
    const opts = pairs(rest);
    const format = formatOf(opts, ['--format', '--taste']);
    const taste = opts['--taste'] ? requireTaste(opts) : undefined;
    console.log(printTokens(format, taste ? tastes[taste] : undefined));
    return;
  }
  if (command === 'example') {
    const opts = pairs(rest);
    formatOf(opts, ['--taste']);
    console.log(JSON.stringify(tasteSpecimen(requireTaste(opts)), null, 2));
    return;
  }
  if (command !== 'check' || !rest[0] || rest[0].startsWith('--')) throw new Error(usage);
  const opts = pairs(rest.slice(1));
  const format = formatOf(opts, ['--format', '--taste', '--pack']);
  const pack = opts['--pack'];
  const taste = opts['--taste'];
  if (pack !== undefined && pack !== 'global' && pack !== 'cn') throw new Error(`Invalid option: --pack ${pack}`);
  if (taste !== undefined && !isTaste(taste)) throw new Error(`Unknown taste: ${taste}`);
  if (taste && pack && packAlias[pack] !== taste) throw new Error(`Pack ${pack} aliases ${packAlias[pack]}, not ${taste}`);
  const result = check(JSON.parse(await readFile(rest[0], 'utf8')), {
    ...(pack ? { pack } : {}),
    ...(taste ? { taste } : {}),
  });
  console.log(format === 'json'
    ? JSON.stringify(result, null, 2)
    : [...result.findings.map(f => `${f.severity.toUpperCase()} ${f.id} ${f.path ?? ''}: ${f.message}`), `Taste: ${result.taste}`, `Score: ${result.score}/100 — ${result.summary}`].join('\n'));
  process.exitCode = result.findings.some(f => f.severity === 'error') ? 1 : 0;
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 2; });
