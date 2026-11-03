import type { Finding, Rule } from '../types.js';
import { resolveTaste, tastes } from '../tastes.js';
import { background, luminance } from './utils.js';

export const ground: Rule = { id: 'MT005', severity: 'warn', packs: ['global', 'cn'], check(style, settings) {
  const taste = tastes[resolveTaste(settings)];
  const c = taste.composition;
  const y = luminance(background(style));
  const path = 'layers background-color';
  if (c.ground === 'dark') {
    if (y === undefined || y > c.groundMaxL) {
      const finding: Finding = { id: 'MT005', severity: 'error', path, message: `${taste.id} is a night ground; keep the background at luminance ${c.groundMaxL} or below.` };
      return [finding];
    }
    return [];
  }
  if (c.ground === 'muted') {
    if (y === undefined || y < c.groundMinL || y > c.groundMaxL) {
      return [{ id: 'MT005', severity: 'warn', path, message: `${taste.id} wants a muted ground (luminance ${c.groundMinL}–${c.groundMaxL}) so a hillshade can sit under the ink.` }];
    }
    return [];
  }
  if (y === undefined || y < c.groundMinL) {
    return [{ id: 'MT005', severity: 'warn', path, message: `${taste.id} expects a paper ground; this background is too dark for the print school.` }];
  }
  return [];
} };
