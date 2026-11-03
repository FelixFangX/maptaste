import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object } from './utils.js';

export const lineWeight: Rule = { id: 'MT009', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.maxLineWidth;
  const hit = layers(style).findIndex(layer => layer.type === 'line' && typeof object(layer.paint)['line-width'] === 'number' && Number(object(layer.paint)['line-width']) > cap);
  if (hit < 0) return [];
  return [{ id: 'MT009', severity: 'warn', path: `layers[${hit}].paint.line-width`, message: `${taste.id} caps strokes at ${cap}; this line is heavier.` }];
} };
