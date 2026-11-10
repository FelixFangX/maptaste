import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, object, saturatedHues } from './utils.js';

export const lineChroma: Rule = { id: 'MT011', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.maxLineHues;
  const sectors = new Set<number>();
  for (const layer of layers(style)) {
    if (layer.type !== 'line') continue;
    const read = readPaint(object(layer.paint)['line-color']);
    if (read.state !== 'known') continue;
    for (const hue of read.colors.flatMap(color => saturatedHues(color))) sectors.add(Math.floor(hue / 60));
  }
  if (sectors.size <= cap) return [];
  return [{
    id: 'MT011', severity: 'warn', path: 'layers line-color',
    message: `${taste.id} allows ${cap} line hues; this style has ${sectors.size}.`,
    evidence: `${sectors.size} hue sectors`,
  }];
} };
