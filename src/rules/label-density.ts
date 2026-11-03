import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object } from './utils.js';
export const labelDensity: Rule = { id:'MT004', severity:'warn', packs:['global','cn'], check(style, settings) {
 const taste = tastes[resolveTaste(settings)];
 const cap = taste.composition.maxLabelLayers;
 const labels=layers(style).filter(l=>l.type==='symbol'&&object(l.layout)['text-field']);
 const large=labels.filter(l=>typeof object(l.layout)['text-size']==='number' && Number(object(l.layout)['text-size'])>=24);
 if(labels.length<=cap && large.length<3) return [];
 const message = labels.length>cap
  ? `${taste.id} allows ${cap} text layers; this style has ${labels.length}. Prioritize places by zoom and reduce large default text sizes.`
  : `${taste.id} keeps large type rare; ${large.length} labels are sized 24 or above.`;
 return [{id:'MT004',severity:'warn',message,path:'layers'}];
} };
