import type { Rule } from '../types.js';
import { layers, object, rgb } from './utils.js';
function hues(value: unknown): number[] {
 if (Array.isArray(value)) return value.flatMap(hues);
 const c=rgb(value); if(!c) return [];
 const [r,g,b]=c, max=Math.max(...c), min=Math.min(...c), d=max-min;
 if(d<0.15 || max===0 || d/max<0.35) return [];
 const h=max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 return [h*60];
}
export const rainbowChoropleth: Rule = { id:'MT001', severity:'error', packs:['global','cn'], check(style) {
 return layers(style).flatMap((l,i)=>{
 if(l.type!=='fill') return [];
 const sectors=new Set(hues(object(l.paint)['fill-color']).map(h=>Math.floor(h/60)));
 return sectors.size>=4 ? [{id:'MT001',severity:'error' as const,message:'Rainbow choropleth obscures ordering; use a restrained sequential or diverging scale.',path:`layers[${i}].paint.fill-color`}] : [];
 });
} };
