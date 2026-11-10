import type { Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { layers, object, painted } from './utils.js';

function fontsOf(layer: ReturnType<typeof layers>[number]): string[] {
  const font = object(layer.layout)['text-font'];
  if (!Array.isArray(font)) return [];
  return font.filter((item): item is string => typeof item === 'string');
}

export const typeface: Rule = { id: 'MT013', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const faces = layers(style).filter(layer => painted(layer) && layer.type === 'symbol').map(fontsOf);
  if (faces.every(face => face.length === 0)) return [];
  const italic = faces.filter(face => face.some(name => /italic/i.test(name))).length;
  const bold = faces.some(face => face.some(name => /bold/i.test(name)));
  const face = taste.stage.type;
  if (face === 'roman' && (bold || italic > 0)) {
    return [{ id: 'MT013', severity: 'warn', path: 'layers', message: `${taste.id} is roman. Bold and italic are a different plate.` }];
  }
  if (face === 'bold' && !bold) {
    return [{ id: 'MT013', severity: 'warn', path: 'layers', message: `${taste.id} sets type in bold. This style declared a face and it is not bold.` }];
  }
  if (face === 'italic-headline' && (italic > 1 || (faces.length > 1 && italic === 0))) {
    return [{ id: 'MT013', severity: 'warn', path: 'layers', message: `${taste.id} uses one italic headline and roman text under it.` }];
  }
  return [];
} };
