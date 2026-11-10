import type { Rule } from '../types.js';
import { backgroundColor } from './read.js';
import { object, luminance } from './utils.js';

export const darkMode: Rule = { id: 'MT003', severity: 'info', packs: ['global', 'cn'], check(style) {
  const meta = object(style.metadata);
  const declared = Object.entries(meta).some(([key, value]) => /dark|theme|styles/i.test(key) && value !== false && value != null && value !== '');
  const bg = backgroundColor(style);
  if (bg.state === 'unknown') return [];
  const dark = bg.state === 'known' && bg.colors.some(color => (luminance(color) ?? 1) < 0.15);
  return declared || dark ? [] : [{ id: 'MT003', severity: 'info', message: 'Missing dark-mode consideration; provide a dark background or declare theme variants in metadata.', path: 'metadata' }];
} };
