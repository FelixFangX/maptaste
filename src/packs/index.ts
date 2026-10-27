export type PackName = 'global' | 'cn';
const tokens = { paper: '#ebe7df', void: '#0b0b0b', accent: { light: '#1a2a4a', dark: '#9eb6d4' } };
export const packs = { global: { tokens }, cn: { tokens } } as const;
