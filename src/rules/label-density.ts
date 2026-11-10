import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, object } from './utils.js';

function labelSize(layer: ReturnType<typeof layers>[number]): number | undefined {
  const read = readPaint(object(layer.layout)['text-size']);
  if (read.state === 'absent') return 16;
  if (read.state !== 'known' || read.numbers.length === 0 || read.numbers.some(value => value < 0)) return undefined;
  return Math.max(...read.numbers);
}

export const labelDensity: Rule = { id:'MT004', severity:'warn', packs:['global','cn'], check(style, settings) {
 const taste = tastes[resolveTaste(settings)];
 const cap = taste.composition.maxLabelLayers;
 const labels=layers(style).filter(l=>l.type==='symbol'&&object(l.layout)['text-field']);
 const large=labels.filter(l=>{ const size = labelSize(l); return size !== undefined && size >= 24; });
 if(labels.length<=cap && large.length<3) return [];
 const message = labels.length>cap
  ? `${taste.id} allows ${cap} text layers; this style has ${labels.length}. Prioritize places by zoom and reduce large default text sizes.`
  : `${taste.id} keeps large type rare; ${large.length} labels are sized 24 or above.`;
 return [{id:'MT004',severity:'warn',message,path:'layers'}];
} };
