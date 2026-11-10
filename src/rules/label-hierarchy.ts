import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, object } from './utils.js';

export const labelHierarchy: Rule = { id: 'MT008', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const hierarchy = taste.composition.hierarchy;
  if (!hierarchy) return [];
  const labels = layers(style).filter(layer => layer.type === 'symbol' && object(layer.layout)['text-field']);
  const sizes = labels.map(layer => {
    const read = readPaint(object(layer.layout)['text-size']);
    if (read.state === 'absent') return 16;
    if (read.state !== 'known' || read.numbers.length === 0 || read.numbers.some(value => value < 0)) return undefined;
    return Math.max(...read.numbers);
  });
  const proven = sizes.filter((size): size is number => typeof size === 'number');
  if (proven.length !== labels.length || proven.length === 0) return [];
  const headlines = proven.filter(size => size >= hierarchy.headlineSize);
  const spread = Math.max(...proven) - Math.min(...proven);
  const crowded = headlines.length > hierarchy.maxHeadlines;
  const flat = proven.length >= 2 && spread < hierarchy.minSpread;
  if (!crowded && !flat) return [];
  const message = crowded
    ? `${taste.id} uses one headline; ${headlines.length} labels are sized ${hierarchy.headlineSize} or above.`
    : `${taste.id} needs a size step of at least ${hierarchy.minSpread} between labels.`;
  return [{ id: 'MT008', severity: 'warn', message, path: 'layers' }];
} };
