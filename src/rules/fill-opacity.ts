import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, object, shown } from './utils.js';

export const fillOpacity: Rule = { id: 'MT010', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.fillOpacityMax;
  if (cap == null) return [];
  const hit = layers(style).findIndex(layer => {
    if (layer.type !== 'fill') return false;
    const read = readPaint(object(layer.paint)['fill-opacity']);
    if (read.state === 'unknown') return false;
    if (read.state === 'known' && (read.numbers.length === 0 || read.numbers.some(value => value < 0 || value > 1) || read.colors.length > 0)) return false;
    const opacity = read.state === 'absent' ? 1 : Math.max(...read.numbers);
    return opacity > cap;
  });
  if (hit < 0) return [];
  const read = readPaint(object(layers(style)[hit]?.paint)['fill-opacity']);
  const opacity = read.state === 'absent' ? 1 : Math.max(...read.numbers);
  const evidence = read.state === 'absent' ? `omitted; MapLibre default is 1, above ${cap}` : `${shown(opacity)} > ${cap}`;
  return [{ id: 'MT010', severity: 'warn', path: `layers[${hit}].paint.fill-opacity`, message: `${taste.id} keeps fills translucent (opacity ≤ ${cap}) so terrain can read through.`, evidence }];
} };
