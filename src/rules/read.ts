import type { StyleDoc } from '../types.js';
import { layers, object, rgb } from './utils.js';

/** A value this checker could read without feature data, a legend, or a framebuffer. */
export interface PaintRead {
  state: 'known' | 'unknown' | 'absent';
  colors: readonly string[];
  numbers: readonly number[];
  /** Step or interpolate breaks, in document order. Null when the value is not one of those. */
  stops: readonly number[] | null;
  /** Set when the stop list itself is illegal. 0 and negatives are not faults. */
  domain?: 'short' | 'duplicate' | 'unsorted';
  reason?: string;
  /** Present when a known color is the spec default rather than an authored literal. */
  note?: string;
}

const ABSENT: PaintRead = { state: 'absent', colors: [], numbers: [], stops: null };

function known(partial: Partial<PaintRead> & Pick<PaintRead, 'colors' | 'numbers'>): PaintRead {
  return { state: 'known', stops: null, ...partial };
}

function unknown(reason: string): PaintRead {
  return { state: 'unknown', colors: [], numbers: [], stops: null, reason };
}

function domainOf(stops: readonly number[], minimum: number): PaintRead['domain'] {
  if (stops.length < minimum) return 'short';
  for (let i = 1; i < stops.length; i++) {
    if (stops[i] === stops[i - 1]) return 'duplicate';
    if (!(stops[i]! > stops[i - 1]!)) return 'unsorted';
  }
  return undefined;
}

function merge(parts: PaintRead[]): PaintRead {
  if (parts.some(part => part.state !== 'known')) {
    return unknown(parts.find(part => part.state !== 'known')?.reason ?? 'unresolved output');
  }
  return known({
    colors: parts.flatMap(part => part.colors),
    numbers: parts.flatMap(part => part.numbers),
    domain: parts.find(part => part.domain)?.domain,
  });
}

function readExpr(expr: unknown[], depth: number): PaintRead {
  if (depth > 6) return unknown('expression is nested past the supported subset');
  const op = expr[0];
  if (op === 'interpolate' || op === 'interpolate-hcl' || op === 'interpolate-lab') {
    if (expr.length < 5 || (expr.length - 3) % 2 !== 0) return unknown('interpolate pairs are incomplete');
    const stops: number[] = [];
    const outputs: unknown[] = [];
    for (let i = 3; i < expr.length; i += 2) {
      const stop = expr[i];
      if (typeof stop !== 'number' || !Number.isFinite(stop)) return unknown('interpolate stop is not a finite number');
      stops.push(stop);
      outputs.push(expr[i + 1]);
    }
    const merged = merge(outputs.map(output => readPaint(output, depth + 1)));
    const domain = domainOf(stops, 2) ?? merged.domain;
    if (merged.state !== 'known') return { ...merged, stops, domain };
    return { ...merged, stops, domain };
  }
  if (op === 'step') {
    if (expr.length < 3 || (expr.length - 3) % 2 !== 0) return unknown('step pairs are incomplete');
    const stops: number[] = [];
    const outputs: unknown[] = [expr[2]];
    for (let i = 3; i < expr.length; i += 2) {
      const stop = expr[i];
      if (typeof stop !== 'number' || !Number.isFinite(stop)) return unknown('step stop is not a finite number');
      stops.push(stop);
      outputs.push(expr[i + 1]);
    }
    const merged = merge(outputs.map(output => readPaint(output, depth + 1)));
    const domain = domainOf(stops, 0) ?? merged.domain;
    if (merged.state !== 'known') return { ...merged, stops, domain };
    return { ...merged, stops, domain };
  }
  if (op === 'match') {
    if (expr.length < 4 || (expr.length - 3) % 2 !== 0) return unknown('match pairs are incomplete');
    const outputs: unknown[] = [];
    for (let i = 2; i < expr.length - 1; i += 2) outputs.push(expr[i + 1]);
    outputs.push(expr[expr.length - 1]);
    return merge(outputs.map(output => readPaint(output, depth + 1)));
  }
  if (op === 'case') {
    if (expr.length < 4 || expr.length % 2 !== 0) return unknown('case pairs are incomplete');
    const outputs: unknown[] = [];
    for (let i = 1; i < expr.length - 1; i += 2) outputs.push(expr[i + 1]);
    outputs.push(expr[expr.length - 1]);
    return merge(outputs.map(output => readPaint(output, depth + 1)));
  }
  if (op === 'coalesce') {
    if (expr.length < 2) return unknown('coalesce has no branch');
    const branches = expr.slice(1).map(branch => readPaint(branch, depth + 1));
    if (branches.some(branch => branch.state !== 'known')) return unknown('coalesce branch is unresolved');
    return branches[0]!;
  }
  if (op === 'literal' && expr.length === 2) return readPaint(expr[1], depth + 1);
  return unknown(`expression ${String(op)} is not evaluated`);
}

/** Read one paint or layout value. Labels inside `match` are not colors. Stops of 0 stay 0. */
export function readPaint(value: unknown, depth = 0): PaintRead {
  if (value === undefined) return ABSENT;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return unknown('non-finite number');
    return known({ colors: [], numbers: [value] });
  }
  if (typeof value === 'string') {
    if (rgb(value)) return known({ colors: [value], numbers: [] });
    return unknown('color is outside #rgb, #rrggbb, #rrggbbaa, rgb(), and rgba()');
  }
  if (Array.isArray(value) && typeof value[0] === 'string') return readExpr(value, depth);
  return unknown('value is not a color, number, or supported expression');
}

/** Ground color of a painted background layer. A hidden layer is not the ground. */
export function backgroundColor(style: StyleDoc): PaintRead {
  const layer = layers(style).find(item => item.type === 'background' && object(item.layout).visibility !== 'none');
  if (!layer) return ABSENT;
  const color = object(layer.paint)['background-color'];
  if (color === undefined) return known({ colors: ['#000000'], numbers: [], note: 'omitted background-color; MapLibre default #000000' });
  return readPaint(color);
}
