import type { Rule } from '../types.js';
import { readPaint } from './read.js';
import { layers, object, saturatedHues } from './utils.js';

export const rainbowChoropleth: Rule = { id: 'MT001', severity: 'error', packs: ['global', 'cn'], check(style) {
  return layers(style).flatMap((layer, index) => {
    if (layer.type !== 'fill') return [];
    const read = readPaint(object(layer.paint)['fill-color']);
    if (read.state !== 'known') return [];
    const sectors = new Set(read.colors.flatMap(color => saturatedHues(color)).map(hue => Math.floor(hue / 60)));
    if (sectors.size < 4) return [];
    return [{
      id: 'MT001', severity: 'error' as const, path: `layers[${index}].paint.fill-color`,
      message: 'Rainbow choropleth obscures ordering; use a restrained sequential or diverging scale.',
      evidence: `${sectors.size} hue sectors from ${read.colors.join(' ')}`,
    }];
  });
} };
