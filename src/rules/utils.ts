import type { StyleDoc } from '../types.js';
export const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const layers = (s: StyleDoc) => Array.isArray(s.layers) ? s.layers.map(object) : [];
export function rgb(v: unknown): number[] | undefined {
 if (typeof v !== 'string') return;
 const names: Record<string,string> = { white:'#ffffff', black:'#000000', red:'#ff0000', orange:'#ffa500', yellow:'#ffff00', green:'#008000', blue:'#0000ff', purple:'#800080', cyan:'#00ffff' };
 const hex = (names[v.toLowerCase()] ?? v).match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
 if (hex) return (hex.length === 3 ? [...hex].map(c=>c+c).join('') : hex).match(/../g)!.map(c=>parseInt(c,16)/255);
 const m = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
 if (m) return m.slice(1).map(Number).map(n=>Math.min(255,n)/255);
}
export function luminance(v: unknown): number | undefined { const c=rgb(v); return c?.map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((s,n,i)=>s+n*[0.2126,0.7152,0.0722][i],0); }
export function contrast(a: unknown,b: unknown): number | undefined { const x=luminance(a),y=luminance(b); return x===undefined||y===undefined?undefined:(Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
export function background(s: StyleDoc): unknown { return object(layers(s).find(l=>l.type==='background')?.paint)['background-color'] ?? '#ffffff'; }
