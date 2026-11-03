import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers } from './utils.js';

export const lineCount: Rule = { id: 'MT012', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.maxLineLayers;
  const count = layers(style).filter(layer => layer.type === 'line').length;
  if (count <= cap) return [];
  return [{ id: 'MT012', severity: 'warn', path: 'layers', message: `${taste.id} allows ${cap} line layers; this style has ${count}. A street atlas is not this plate.` }];
} };
