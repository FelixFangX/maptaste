import { packAlias, tastes } from '../tastes.js';

export type PackName = 'global' | 'cn';

/** Legacy pack view. `global` is the ink-paper taste. `cn` is cn-metro. Tokens are no longer shared. */
export const packs = {
  global: {
    taste: packAlias.global,
    tokens: {
      paper: tastes['ink-paper'].tokens.paper,
      void: tastes['ink-paper'].tokens.void,
      accent: { light: tastes['ink-paper'].tokens.ink, dark: tastes['ink-paper'].tokens.sequential[2] },
    },
  },
  cn: {
    taste: packAlias.cn,
    tokens: {
      paper: tastes['cn-metro'].tokens.paper,
      void: tastes['cn-metro'].tokens.void,
      accent: { light: tastes['cn-metro'].tokens.accent, dark: tastes['cn-metro'].tokens.sequential[3] },
    },
  },
} as const;
