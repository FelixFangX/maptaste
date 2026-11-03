import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object } from './utils.js';

export const fillOpacity: Rule = { id: 'MT010', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.fillOpacityMax;
  if (cap == null) return [];
  const hit = layers(style).findIndex(layer => {
    if (layer.type !== 'fill') return false;
    const opacity = object(layer.paint)['fill-opacity'];
    return (typeof opacity === 'number' ? opacity : 1) > cap;
  });
  if (hit < 0) return [];
  return [{ id: 'MT010', severity: 'warn', path: `layers[${hit}].paint.fill-opacity`, message: `${taste.id} keeps fills translucent (opacity ≤ ${cap}) so terrain can read through.` }];
} };
