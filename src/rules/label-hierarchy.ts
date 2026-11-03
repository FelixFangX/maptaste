import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object } from './utils.js';

export const labelHierarchy: Rule = { id: 'MT008', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const hierarchy = taste.composition.hierarchy;
  if (!hierarchy) return [];
  const labels = layers(style).filter(layer => layer.type === 'symbol' && object(layer.layout)['text-field']);
  const sizes = labels.map(layer => object(layer.layout)['text-size']).filter((size): size is number => typeof size === 'number');
  if (sizes.length !== labels.length || sizes.length === 0) return [];
  const headlines = sizes.filter(size => size >= hierarchy.headlineSize);
  const spread = Math.max(...sizes) - Math.min(...sizes);
  const crowded = headlines.length > hierarchy.maxHeadlines;
  const flat = sizes.length >= 2 && spread < hierarchy.minSpread;
  if (!crowded && !flat) return [];
  const message = crowded
    ? `${taste.id} uses one headline; ${headlines.length} labels are sized ${hierarchy.headlineSize} or above.`
    : `${taste.id} needs a size step of at least ${hierarchy.minSpread} between labels.`;
  return [{ id: 'MT008', severity: 'warn', message, path: 'layers' }];
} };
