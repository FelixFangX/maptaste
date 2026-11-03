import type { Finding, Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { colorLiterals, layers, luminance, object, saturation } from './utils.js';

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
    const colors = colorLiterals(object(layer.paint)['fill-color']);
    const path = `layers[${index}].paint.fill-color`;
    if (colors.some(color => (saturation(color) ?? 0) > c.maxFillSaturation)) {
      findings.push({ id: 'MT006', severity: 'warn', path, message: `${taste.id} keeps fills quiet; a fill here is past saturation ${c.maxFillSaturation}.` });
    }
    const stops = colors.length;
    const lights = colors.map(luminance).filter((value): value is number => value !== undefined);
    const tooMany = stops > c.maxFillStops;
    const reversed = c.monotonicLightness && lights.length >= 3 && !oneDirection(lights);
    if (tooMany || reversed) {
      const message = tooMany
        ? `${taste.id} allows ${c.maxFillStops} classes; this fill has ${stops} color stops.`
        : `${taste.id} uses a sequential scale; fill lightness should move in one direction.`;
      findings.push({ id: 'MT007', severity: 'warn', path, message });
    }
  });
  return findings;
} };
