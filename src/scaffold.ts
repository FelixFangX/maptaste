import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tasteSpecimen } from './specimens.js';
import { tasteRules, tastes } from './tastes.js';
import type { TasteName } from './types.js';

/** Tokens plus a style that scores clean under that taste. */
export function scaffoldTaste(id: TasteName) {
  const taste = tastes[id];
  return {
    tokens: {
      id: taste.id,
      tokens: taste.tokens,
      composition: taste.composition,
      stage: taste.stage,
      rules: tasteRules(taste),
    },
    style: tasteSpecimen(id),
  };
}

export async function writeScaffold(id: TasteName, dir: string): Promise<string[]> {
  const { tokens, style } = scaffoldTaste(id);
  await mkdir(dir, { recursive: true });
  const tokenPath = join(dir, `${id}.tokens.json`);
  const stylePath = join(dir, `${id}.style.json`);
  await writeFile(tokenPath, `${JSON.stringify(tokens, null, 2)}\n`);
  await writeFile(stylePath, `${JSON.stringify(style, null, 2)}\n`);
  return [tokenPath, stylePath];
}
