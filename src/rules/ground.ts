import type { Finding, Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { backgroundColor } from './read.js';
import { layers, luminance, shown } from './utils.js';

export const ground: Rule = { id: 'MT005', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const c = taste.composition;
  const bg = backgroundColor(style);
  if (bg.state !== 'known' || bg.colors.length === 0) return [];
  const index = layers(style).findIndex(item => item.type === 'background');
  const path = index >= 0 ? `layers[${index}].paint.background-color` : 'layers';
  const lights = bg.colors.map(color => ({ color, y: luminance(color) })).filter((item): item is { color: string; y: number } => item.y !== undefined);
  if (lights.length !== bg.colors.length) return [];
  const evidenceFor = (failing: { color: string; y: number }[]) => failing.map(item => `${bg.note ? `${bg.note}; ` : ''}${item.color} luminance ${shown(item.y)}`).join('; ');
  if (c.ground === 'dark') {
    const failing = lights.filter(item => item.y > c.groundMaxL);
    if (failing.length === 0) return [];
    const finding: Finding = { id: 'MT005', severity: 'error', path, message: `${taste.id} is a night ground; keep the background at luminance ${c.groundMaxL} or below.`, evidence: evidenceFor(failing) };
    return [finding];
  }
  if (c.ground === 'muted') {
    const failing = lights.filter(item => item.y < c.groundMinL || item.y > c.groundMaxL);
    if (failing.length === 0) return [];
    return [{ id: 'MT005', severity: 'warn', path, message: `${taste.id} wants a muted ground (luminance ${c.groundMinL}–${c.groundMaxL}) so a hillshade can sit under the ink.`, evidence: evidenceFor(failing) }];
  }
  const failing = lights.filter(item => item.y < c.groundMinL);
  if (failing.length === 0) return [];
  return [{ id: 'MT005', severity: 'warn', path, message: `${taste.id} expects a paper ground; this background is too dark for the print school.`, evidence: evidenceFor(failing) }];
} };
