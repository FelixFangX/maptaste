import type { StyleDoc } from '../types.js';
export const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const layers = (s: StyleDoc) => Array.isArray(s.layers) ? s.layers.map(object) : [];
/** Literal `visibility: "none"` is not painted. An expression stays in scope. */
export function painted(layer: Record<string, unknown>): boolean {
  return object(layer.layout).visibility !== 'none';
}
/** Stable, non-locale number for findings. Integers stay integers. 0 stays 0. */
export function shown(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

const NUM = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)';
const ANGLE = `(${NUM})(deg|rad|grad|turn)?`;
const PCT = `(${NUM})%`;
const PCT_OR_NUM = `(${NUM})%?`;
const ALPHA = `(${NUM})(%?)`;
const HSL_COMMA = new RegExp(`^hsla?\\(\\s*${ANGLE}\\s*,\\s*${PCT}\\s*,\\s*${PCT}\\s*(?:,\\s*${ALPHA}\\s*)?\\)$`, 'i');
const HSL_SPACE = new RegExp(`^hsla?\\(\\s*${ANGLE}\\s+${PCT_OR_NUM}\\s+${PCT_OR_NUM}\\s*(?:/\\s*${ALPHA}\\s*)?\\)$`, 'i');

function parseHsl(raw: string): number[] | undefined {
 const m = raw.match(HSL_COMMA) ?? raw.match(HSL_SPACE);
 if (!m) return;
 const hRaw = Number(m[1]);
 const unit = m[2]?.toLowerCase();
 const sPct = Number(m[3]);
 const lPct = Number(m[4]);
 if (!Number.isFinite(hRaw) || !Number.isFinite(sPct) || !Number.isFinite(lPct)) return;
 if (sPct < 0 || sPct > 100 || lPct < 0 || lPct > 100) return;
 if (m[5] !== undefined) {
  const alpha = m[6] === '%' ? Number(m[5]) / 100 : Number(m[5]);
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return;
 }
 const deg = unit === 'turn' ? hRaw * 360 : unit === 'grad' ? hRaw * 0.9 : unit === 'rad' ? hRaw * (180 / Math.PI) : hRaw;
 const h = ((deg % 360) + 360) % 360;
 const s = sPct / 100;
 const l = lPct / 100;
 const c = (1 - Math.abs(2 * l - 1)) * s;
 const hp = h / 60;
 const x = c * (1 - Math.abs((hp % 2) - 1));
 const offset = l - c / 2;
 let r = 0, g = 0, b = 0;
 if (hp < 1) { r = c; g = x; }
 else if (hp < 2) { r = x; g = c; }
 else if (hp < 3) { g = c; b = x; }
 else if (hp < 4) { g = x; b = c; }
 else if (hp < 5) { r = x; b = c; }
 else { r = c; b = x; }
 return [r + offset, g + offset, b + offset];
}

export function rgb(v: unknown): number[] | undefined {
 if (typeof v !== 'string') return;
 const names: Record<string,string> = { white:'#ffffff', black:'#000000', red:'#ff0000', orange:'#ffa500', yellow:'#ffff00', green:'#008000', blue:'#0000ff', purple:'#800080', cyan:'#00ffff' };
 const raw = names[v.toLowerCase()] ?? v;
 const hex = raw.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
 if (hex) {
  const full = hex.length <= 4 ? [...hex].map(c => c + c).join('') : hex;
  return full.slice(0, 6).match(/../g)!.map(c => parseInt(c, 16) / 255);
 }
 const m = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i);
 if (m) {
  const channels = [m[1], m[2], m[3]].map(Number);
  if (channels.some(n => n > 255)) return;
  if (m[4] !== undefined) {
   const alpha = Number(m[4]);
   if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return;
  }
  return channels.map(n => n / 255);
 }
 return parseHsl(raw);
}
export function luminance(v: unknown): number | undefined { const c=rgb(v); return c?.map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[0.2126,0.7152,0.0722][i],0); }
export function contrast(a: unknown,b: unknown): number | undefined { const x=luminance(a),y=luminance(b); return x===undefined||y===undefined?undefined:(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
/** Background paint. No layer → undefined. Omitted color → MapLibre's `#000000`, not white. An expression is returned as written. */
export function background(s: StyleDoc): unknown {
  const layer = layers(s).find(l => l.type === 'background');
  if (!layer) return undefined;
  const color = object(layer.paint)['background-color'];
  return color === undefined ? '#000000' : color;
}

/** HSL saturation in 0–1. Missing or non-colors are skipped. */
export function saturation(v: unknown): number | undefined {
  const c = rgb(v);
  if (!c) return;
  const max = Math.max(...c), min = Math.min(...c), d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  return d / (1 - Math.abs(2 * l - 1));
}

/** Same gray skip the rainbow rule uses, so near-neutral paper and ink do not count as hues. */
export function saturatedHues(value: unknown): number[] {
  if (Array.isArray(value)) return value.flatMap(saturatedHues);
  const c = rgb(value);
  if (!c) return [];
  const [r, g, b] = c;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.15 || max === 0 || d / max < 0.35) return [];
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60];
}

export function colorLiterals(value: unknown): unknown[] {
  if (typeof value === 'string' && rgb(value)) return [value];
  if (Array.isArray(value)) return value.flatMap(colorLiterals);
  return [];
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = rgb(a), pb = rgb(b);
  if (!pa || !pb) return a;
  const channel = (i: number) => Math.round(Math.min(1, Math.max(0, pa[i]! + (pb[i]! - pa[i]!) * t)) * 255);
  return '#' + [0, 1, 2].map(i => channel(i).toString(16).padStart(2, '0')).join('');
}
