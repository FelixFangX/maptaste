import type { Rule } from '../types.js';
import { layers, object, contrast, background } from './utils.js';
export const labelContrast: Rule = { id:'MT002',severity:'warn',packs:['global','cn'],check(style) {
 return layers(style).flatMap((l,i)=>{
 if(l.type!=='symbol'||!object(l.layout)['text-field']) return [];
 const p=object(l.paint), halo=p['text-halo-color'];
 const hasHalo=halo!==undefined && typeof p['text-halo-width']==='number' && p['text-halo-width']>0;
 const ratio=contrast(p['text-color']??'#000000',hasHalo?halo:background(style));
 return ratio!==undefined&&ratio<4.5?[{id:'MT002',severity:'warn' as const,message:hasHalo?'Label and halo have low contrast.':'Low-contrast labels need a contrasting halo or stronger text color.',path:`layers[${i}].paint`}]:[];
 });
} };
