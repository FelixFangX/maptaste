import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object, saturatedHues } from './utils.js';

export const lineChroma: Rule = { id: 'MT011', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.maxLineHues;
  const sectors = new Set<number>();
  for (const layer of layers(style)) {
    if (layer.type !== 'line') continue;
    for (const hue of saturatedHues(object(layer.paint)['line-color'])) sectors.add(Math.floor(hue / 60));
  }
  if (sectors.size <= cap) return [];
  return [{ id: 'MT011', severity: 'warn', path: 'layers line-color', message: `${taste.id} allows ${cap} line hues; this style has ${sectors.size}.` }];
} };
