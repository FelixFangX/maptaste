import type { Finding, Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { readPaint } from './read.js';
import { layers, luminance, object, saturation, shown } from './utils.js';

function oneDirection(values: number[]): boolean {
  let sign = 0;
  for (let i = 1; i < values.length; i++) {
    const delta = values[i]! - values[i - 1]!;
    if (Math.abs(delta) < 0.008) continue;
    const next = Math.sign(delta);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return true;
}

export const fillDiscipline: Rule = { id: 'MT006', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const c = taste.composition;
  const findings: Finding[] = [];
  layers(style).forEach((layer, index) => {
    if (layer.type !== 'fill') return;
    const read = readPaint(object(layer.paint)['fill-color']);
    if (read.state !== 'known' || read.colors.length === 0) return;
    const path = `layers[${index}].paint.fill-color`;
    const peak = read.colors.reduce((max, color) => Math.max(max, saturation(color) ?? 0), 0);
    if (peak > c.maxFillSaturation) {
      findings.push({
        id: 'MT006', severity: 'warn', path,
        message: `${taste.id} keeps fills quiet; a fill here is past saturation ${c.maxFillSaturation}.`,
        evidence: `saturation ${shown(peak)} > ${c.maxFillSaturation}`,
      });
    }
    const count = new Set(read.colors.map(color => color.toLowerCase())).size;
    const lights = read.colors.map(luminance).filter((value): value is number => value !== undefined);
    const tooMany = count > c.maxFillStops;
    const reversed = c.monotonicLightness && lights.length >= 3 && !oneDirection(lights);
    if (!tooMany && !reversed) return;
    const stops = read.stops ? ` stops ${read.stops.map(shown).join(' ')}` : '';
    findings.push({
      id: 'MT007', severity: 'warn', path,
      message: tooMany
        ? `${taste.id} allows ${c.maxFillStops} classes; this fill has ${count} colors.`
        : `${taste.id} uses a sequential scale; fill lightness should move in one direction.`,
      evidence: tooMany ? `${count} color outputs${stops}` : `lightness ${lights.map(shown).join(' ')}`,
    });
  });
  return findings;
} };
