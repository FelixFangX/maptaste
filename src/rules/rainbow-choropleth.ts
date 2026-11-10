import type { Rule } from '../types.js';
import { readPaint } from './read.js';
import { layers, object, painted, saturatedHues } from './utils.js';

function fillColor(layer: Record<string, unknown>): { key: string; value: unknown } | undefined {
  if (!painted(layer)) return;
  if (layer.type === 'fill') return { key: 'fill-color', value: object(layer.paint)['fill-color'] };
  if (layer.type === 'fill-extrusion') return { key: 'fill-extrusion-color', value: object(layer.paint)['fill-extrusion-color'] };
}

export const rainbowChoropleth: Rule = { id: 'MT001', severity: 'error', packs: ['global', 'cn'], check(style) {
  return layers(style).flatMap((layer, index) => {
    const color = fillColor(layer);
    if (!color) return [];
    const read = readPaint(color.value);
    if (read.state !== 'known') return [];
    const sectors = new Set(read.colors.flatMap(item => saturatedHues(item)).map(hue => Math.floor(hue / 60)));
    if (sectors.size < 4) return [];
    return [{
      id: 'MT001', severity: 'error' as const, path: `layers[${index}].paint.${color.key}`,
      message: 'Rainbow choropleth obscures ordering; use a restrained sequential or diverging scale.',
      evidence: `${sectors.size} hue sectors from ${read.colors.join(' ')}`,
    }];
  });
} };
