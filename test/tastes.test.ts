import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { check } from '../src/index.js';
import { tasteSpecimen } from '../src/specimens.js';
import { packAlias, tasteNames, tasteRules, tastes } from '../src/tastes.js';
import type { TasteName } from '../src/types.js';

const acceptable = (style: ReturnType<typeof tasteSpecimen>, taste: TasteName) => {
  const result = check(style, { taste });
  expect(result.taste, taste).toBe(taste);
  expect(result.findings.filter(finding => finding.severity === 'error'), `${taste} ${result.summary}`).toEqual([]);
  expect(result.score, taste).toBeGreaterThanOrEqual(90);
  return result;
};

describe('named tastes', () => {
  it('ships six schools and maps the old packs onto two of them', () => {
    expect(tasteNames).toEqual(['ink-paper', 'night-ops', 'civic', 'editorial', 'cn-metro', 'terrain-quiet']);
    expect(packAlias).toEqual({ global: 'ink-paper', cn: 'cn-metro' });
    expect(tastes['ink-paper'].packAlias).toBe('global');
    expect(tastes['cn-metro'].packAlias).toBe('cn');
    for (const id of tasteNames) expect(tasteRules(tastes[id]).length).toBeGreaterThan(40);
  });

  it('fails the rainbow fixture under every taste', () => {
    const rainbow = tasteSpecimen('rainbow');
    for (const taste of tasteNames) {
      const result = check(rainbow, { taste });
      expect(result.findings.some(finding => finding.id === 'MT001' && finding.severity === 'error'), taste).toBe(true);
      expect(result.score, taste).toBeLessThan(90);
    }
  });

  it('accepts each taste fixture under that taste', () => {
    for (const taste of tasteNames) {
      const result = acceptable(tasteSpecimen(taste), taste);
      expect(result.score, taste).toBe(100);
      expect(result.findings, taste).toEqual([]);
    }
  });

  it('accepts the committed fixture files', () => {
    for (const taste of tasteNames) {
      const style = JSON.parse(readFileSync(new URL(`./fixtures/tastes/${taste}.json`, import.meta.url), 'utf8'));
      expect(style).toEqual(tasteSpecimen(taste));
      acceptable(style, taste);
    }
    const rainbow = JSON.parse(readFileSync(new URL('./fixtures/tastes/rainbow.json', import.meta.url), 'utf8'));
    expect(check(rainbow, { taste: 'ink-paper' }).findings.some(finding => finding.id === 'MT001')).toBe(true);
  });

  it('keeps --pack as an alias and still passes the original good style', () => {
    const good = JSON.parse(readFileSync(new URL('./fixtures/good-style.json', import.meta.url), 'utf8'));
    expect(check(good).taste).toBe('ink-paper');
    expect(check(good, { pack: 'global' }).findings).toEqual([]);
    expect(check(good, { pack: 'cn' }).taste).toBe('cn-metro');
    expect(check(good, { pack: 'cn' }).findings).toEqual([]);
    expect(check(good, { taste: 'ink-paper', pack: 'global' }).findings).toEqual([]);
    expect(() => check(good, { taste: 'night-ops', pack: 'global' })).toThrow(/aliases/);
    expect(() => check(good, { taste: 'nope' as TasteName })).toThrow(/Unknown taste/);
  });

  it('rejects a night ground under ink-paper and a paper ground under night-ops', () => {
    const night = tasteSpecimen('night-ops');
    expect(check(night, { taste: 'ink-paper' }).findings.some(finding => finding.id === 'MT005')).toBe(true);
    expect(check(tasteSpecimen('ink-paper'), { taste: 'night-ops' }).findings.some(finding => finding.id === 'MT005' && finding.severity === 'error')).toBe(true);
  });

  it('treats label count as a rule, not a color swap', () => {
    const crowded = tasteSpecimen('editorial', { labels: 5 });
    expect(check(crowded, { taste: 'editorial' }).findings.some(finding => finding.id === 'MT004')).toBe(true);
    expect(check(crowded, { taste: 'civic' }).findings.filter(finding => finding.id === 'MT004')).toEqual([]);
  });

  it('caps hairlines on ink-paper and allows the same stroke on cn-metro', () => {
    const heavy = tasteSpecimen('ink-paper', { lineWidth: 2 });
    expect(check(heavy, { taste: 'ink-paper' }).findings.some(finding => finding.id === 'MT009')).toBe(true);
    expect(check(heavy, { taste: 'cn-metro' }).findings.some(finding => finding.id === 'MT009')).toBe(false);
  });

  it('asks terrain for translucent muted fills and lets civic be more chromatic', () => {
    const civic = tasteSpecimen('civic');
    const terrain = check(civic, { taste: 'terrain-quiet' });
    expect(terrain.findings.some(finding => finding.id === 'MT006' || finding.id === 'MT010' || finding.id === 'MT005')).toBe(true);
    expect(check(tasteSpecimen('terrain-quiet'), { taste: 'terrain-quiet' }).findings).toEqual([]);
    expect(check(tasteSpecimen('cn-metro'), { taste: 'ink-paper' }).findings.some(finding => finding.id === 'MT011')).toBe(true);
  });
});
