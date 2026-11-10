import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, object, painted, shown } from './utils.js';

export const lineWeight: Rule = { id: 'MT009', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const cap = taste.composition.maxLineWidth;
  const hit = layers(style).findIndex(layer => {
    if (!painted(layer) || layer.type !== 'line') return false;
    const read = readPaint(object(layer.paint)['line-width']);
    if (read.state === 'unknown') return false;
    if (read.state === 'known' && (read.numbers.length === 0 || read.numbers.some(value => value < 0) || read.colors.length > 0)) return false;
    const width = read.state === 'absent' ? 1 : Math.max(...read.numbers);
    return width > cap;
  });
  if (hit < 0) return [];
  const read = readPaint(object(layers(style)[hit]?.paint)['line-width']);
  const width = read.state === 'absent' ? 1 : Math.max(...read.numbers);
  const evidence = read.state === 'absent' ? `omitted; MapLibre default is 1, above ${cap}` : `${shown(width)} > ${cap}`;
  return [{ id: 'MT009', severity: 'warn', path: `layers[${hit}].paint.line-width`, message: `${taste.id} caps strokes at ${cap}; this line is heavier.`, evidence }];
} };
