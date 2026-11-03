import type { Rule } from '../types.js';
import { layers, object, saturatedHues } from './utils.js';
export const rainbowChoropleth: Rule = { id:'MT001', severity:'error', packs:['global','cn'], check(style) {
 return layers(style).flatMap((l,i)=>{
 if(l.type!=='fill') return [];
 const sectors=new Set(saturatedHues(object(l.paint)['fill-color']).map(h=>Math.floor(h/60)));
 return sectors.size>=4 ? [{id:'MT001',severity:'error' as const,message:'Rainbow choropleth obscures ordering; use a restrained sequential or diverging scale.',path:`layers[${i}].paint.fill-color`}] : [];
 });
} };
