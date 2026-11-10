import type { Finding, Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { backgroundColor, readPaint } from './read.js';
import { contrast, layers, object, painted, shown } from './utils.js';

function worst(text: readonly string[], partners: readonly string[]): number | undefined {
  let low: number | undefined;
  for (const ink of text) {
    for (const ground of partners) {
      const ratio = contrast(ink, ground);
      if (ratio === undefined) return undefined;
      if (low === undefined || ratio < low) low = ratio;
    }
  }
  return low;
}

export const labelContrast: Rule = { id: 'MT002', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const minimum = taste.composition.contrastMin;
  const bg = backgroundColor(style);
  return layers(style).flatMap((layer, index): Finding[] => {
    if (!painted(layer) || layer.type !== 'symbol' || !object(layer.layout)['text-field']) return [];
    const paint = object(layer.paint);
    const text = readPaint(paint['text-color'] === undefined ? '#000000' : paint['text-color']);
    const width = readPaint(paint['text-halo-width']);
    const halo = readPaint(paint['text-halo-color']);
    if (text.state !== 'known' || text.colors.length === 0) return [];
    if (width.state === 'unknown') return [];
    const widths = width.state === 'absent' ? [0] : width.numbers;
    if (widths.length === 0 || widths.some(value => value < 0)) return [];
    const haloOn = widths.some(value => value > 0);
    const haloOff = widths.some(value => value <= 0);
    if (haloOn && haloOff) {
      return [{
        id: 'MT014', severity: 'info' as const, path: `layers[${index}].paint.text-halo-width`,
        message: 'Halo width is both 0 and positive, so one contrast ratio does not describe this layer.',
        evidence: `text-halo-width outputs ${widths.map(shown).join(' ')} include both 0 and a positive width`,
        remedy: 'Use one halo width. 0 means no halo; omitting it also means 0.',
      }];
    }
    let partners: readonly string[] | undefined;
    if (haloOn) {
      if (halo.state === 'unknown') return [];
      if (halo.state !== 'known' || halo.colors.length === 0) {
        if (bg.state !== 'known') return [];
        partners = bg.colors;
      } else partners = halo.colors;
    } else if (bg.state === 'known') partners = bg.colors;
    if (!partners) return [];
    const ratio = worst(text.colors, partners);
    if (ratio === undefined || ratio >= minimum) return [];
    const message = minimum > 4.5
      ? `${taste.id} labels need contrast of at least ${minimum} against the halo or ground.`
      : haloOn ? 'Label and halo have low contrast.' : 'Low-contrast labels need a contrasting halo or stronger text color.';
    return [{ id: 'MT002', severity: 'warn' as const, path: `layers[${index}].paint`, message, evidence: `${shown(ratio)} < ${minimum}` }];
  });
} };
