import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object, contrast, background } from './utils.js';
export const labelContrast: Rule = { id:'MT002', severity:'warn', packs:['global','cn'], check(style, settings) {
 const taste = tastes[resolveTaste(settings)];
 const minimum = taste.composition.contrastMin;
 return layers(style).flatMap((l,i)=>{
 if(l.type!=='symbol'||!object(l.layout)['text-field']) return [];
 const p=object(l.paint), halo=p['text-halo-color'];
 const hasHalo=halo!==undefined && typeof p['text-halo-width']==='number' && p['text-halo-width']>0;
 const ratio=contrast(p['text-color']??'#000000',hasHalo?halo:background(style));
 if(ratio===undefined||ratio>=minimum) return [];
 const message = minimum > 4.5
  ? `${taste.id} labels need contrast of at least ${minimum} against the halo or ground.`
  : hasHalo ? 'Label and halo have low contrast.' : 'Low-contrast labels need a contrasting halo or stronger text color.';
 return [{id:'MT002',severity:'warn' as const,message,path:`layers[${i}].paint`}];
 });
} };
