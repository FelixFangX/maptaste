import { describe, expect, it } from 'vitest';
import { check } from '../src/index.js';
import type { StyleDoc, TasteName } from '../src/types.js';

function style(layers: StyleDoc['layers'], taste?: TasteName) {
  const doc: StyleDoc = {
    version: 8,
    metadata: { 'maptaste:themes': ['light', 'dark'] },
    layers,
  };
  return check(doc, taste ? { taste } : {});
}

const paper = { id: 'background', type: 'background', paint: { 'background-color': '#ebe7df' } };
const muted = { id: 'background', type: 'background', paint: { 'background-color': '#e4e0d8' } };
const quiet = { id: 'values', type: 'fill', paint: { 'fill-color': '#c9cbb8' } };

describe('style evidence', () => {
  it('does not treat match labels as paint colors', () => {
    const result = style([
      paper,
      { id: 'values', type: 'fill', paint: { 'fill-color': ['match', ['get', 'kind'], 'red', '#1a2a4a', 'blue', '#1a2a4a', 'green', '#1a2a4a', 'yellow', '#1a2a4a', '#1a2a4a'] } },
    ]);
    expect(result.findings.map(finding => finding.id)).toEqual([]);
  });

  it('reads 8-digit hex and rgba ramps as colors', () => {
    const hex = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['step', ['get', 'value'], '#ff0000ff', 1, '#ffff00ff', 2, '#00ff00ff', 3, '#00ffffff'] } }]);
    const rgba = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['step', ['get', 'value'], 'rgba(255, 0, 0, 1)', 1, 'rgba(255, 255, 0, 1)', 2, 'rgba(0, 255, 0, 1)', 3, 'rgba(0, 255, 255, 1)'] } }]);
    const bare = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['#ff0000ff', '#ffff00ff', '#00ff00ff', '#00ffffff'] } }]);
    expect(hex.findings.some(finding => finding.id === 'MT001' && finding.evidence?.includes('#ff0000ff'))).toBe(true);
    expect(rgba.findings.some(finding => finding.id === 'MT001' && finding.evidence?.includes('rgba(255, 0, 0, 1)'))).toBe(true);
    expect(bare.findings.some(finding => finding.id === 'MT001')).toBe(false);
    expect(bare.findings.some(finding => finding.id === 'MT014')).toBe(true);
  });

  it('reports hsl and feature colors as unknown instead of a pass', () => {
    const hsl = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': 'hsl(0, 100%, 50%)' } }]);
    const feature = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['get', 'color'] } }]);
    const coalesced = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['coalesce', ['get', 'color'], '#ff0000'] } }]);
    for (const result of [hsl, feature, coalesced]) {
      expect(result.findings.some(finding => finding.id === 'MT001')).toBe(false);
      expect(result.findings.some(finding => finding.id === 'MT014')).toBe(true);
      expect(result.score).toBeLessThan(100);
    }
    expect(hsl.findings.find(finding => finding.id === 'MT014')?.evidence).toContain('color is outside');
    expect(coalesced.findings.some(finding => finding.id === 'MT001')).toBe(false);
  });

  it('keeps a zero stop and rejects a reversal or a duplicate zero', () => {
    const reversed = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], 10, '#dce6f2', 0, '#1a2a4a'] } }]);
    const duplicated = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], 0, '#dce6f2', 0, '#1a2a4a'] } }]);
    const signed = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], -5, '#dce6f2', 0, '#9eb6d4', 5, '#1a2a4a'] } }]);
    const stepped = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['step', ['get', 'value'], '#dce6f2', 0, '#9eb6d4', 5, '#1a2a4a'] } }]);
    expect(reversed.findings.find(finding => finding.id === 'MT015')?.evidence).toBe('stop 0 follows 10');
    expect(duplicated.findings.find(finding => finding.id === 'MT015')?.evidence).toBe('duplicate stop 0');
    expect(signed.findings.filter(finding => finding.id === 'MT015')).toEqual([]);
    expect(stepped.findings.filter(finding => finding.id === 'MT015')).toEqual([]);
  });

  it('distinguishes opacity 0, an omitted opacity, and a negative', () => {
    const clear = style([muted, { ...quiet, paint: { ...quiet.paint, 'fill-opacity': 0 } }], 'terrain-quiet');
    const omitted = style([muted, quiet], 'terrain-quiet');
    const expressed = style([muted, { ...quiet, paint: { ...quiet.paint, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.2, 10, 0.4] } }], 'terrain-quiet');
    const negative = style([muted, { ...quiet, paint: { ...quiet.paint, 'fill-opacity': -0.2 } }], 'terrain-quiet');
    expect(clear.findings.filter(finding => finding.id === 'MT010')).toEqual([]);
    expect(expressed.findings.filter(finding => finding.id === 'MT010')).toEqual([]);
    expect(omitted.findings.find(finding => finding.id === 'MT010')?.evidence).toContain('default is 1');
    expect(negative.findings.find(finding => finding.id === 'MT015')?.evidence).toBe('-0.2 is outside 0–1');
    expect(negative.findings.filter(finding => finding.id === 'MT010')).toEqual([]);
  });

  it('reads line-width outputs and does not treat 0 or a negative as a hairline pass', () => {
    const zero = style([paper, { id: 'strokes', type: 'line', paint: { 'line-color': '#1a2a4a', 'line-width': 0 } }]);
    const heavy = style([paper, { id: 'strokes', type: 'line', paint: { 'line-color': '#1a2a4a', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 16, 4] } }]);
    const negative = style([paper, { id: 'strokes', type: 'line', paint: { 'line-color': '#1a2a4a', 'line-width': -2 } }]);
    expect(zero.findings.filter(finding => finding.id === 'MT009' || finding.id === 'MT015')).toEqual([]);
    expect(heavy.findings.find(finding => finding.id === 'MT009')?.evidence).toBe('4 > 1.25');
    expect(negative.findings.find(finding => finding.id === 'MT015')?.evidence).toBe('-2 is below 0');
    expect(negative.findings.filter(finding => finding.id === 'MT009')).toEqual([]);
  });

  it('uses the black default when a background layer omits its color', () => {
    const omitted = { version: 8, metadata: { 'maptaste:themes': ['light'] }, layers: [{ id: 'background', type: 'background', paint: {} }] };
    const night = check(omitted, { taste: 'night-ops' });
    const ink = check(omitted, { taste: 'ink-paper' });
    expect(night.findings.filter(finding => finding.id === 'MT005')).toEqual([]);
    expect(ink.findings.find(finding => finding.id === 'MT005')?.path).toBe('layers[0].paint.background-color');
    expect(ink.findings.find(finding => finding.id === 'MT005')?.evidence).toContain('#000000');
  });

  it('does not invent a white ground when the style has no background layer', () => {
    const empty = check({ version: 8, layers: [] }, { taste: 'night-ops' });
    expect(empty.findings.some(finding => finding.id === 'MT005')).toBe(false);
    expect(empty.findings.some(finding => finding.id === 'MT014' && finding.evidence === 'no background layer')).toBe(true);
    expect(empty.score).toBeLessThan(100);
  });

  it('counts distinct fill colors, not match labels or repeated outputs', () => {
    const repeated = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['match', ['get', 'kind'], 'a', '#1a2a4a', 'b', '#1a2a4a', 'c', '#1a2a4a', 'd', '#1a2a4a', 'e', '#1a2a4a', 'f', '#1a2a4a', 'g', '#1a2a4a', '#1a2a4a'] } }]);
    const ramp = ['#f7f5f2', '#e4ddd4', '#d0c3b6', '#b7a89a', '#9a8b7c', '#7d6e60', '#5e5146'];
    const many = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], 0, ramp[0], 1, ramp[1], 2, ramp[2], 3, ramp[3], 4, ramp[4], 5, ramp[5], 6, ramp[6]] } }]);
    expect(repeated.findings.filter(finding => finding.id === 'MT007')).toEqual([]);
    const crowded = many.findings.find(finding => finding.id === 'MT007');
    expect(crowded?.evidence).toContain('7 color outputs');
    expect(crowded?.message).toContain('7 colors');
  });

  it('treats omitted text size as 16 and does not score a non-finite stop as clean', () => {
    const flat = style([
      paper,
      { id: 'city', type: 'symbol', layout: { 'text-field': 'City' } },
      { id: 'place', type: 'symbol', layout: { 'text-field': 'Place' } },
    ], 'editorial');
    const broken = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'value'], Number.NaN, '#1a2a4a', 1, '#dce6f2'] } }]);
    const mixed = style([paper, { id: 'labels', type: 'symbol', layout: { 'text-field': 'City' }, paint: { 'text-color': '#1a2a4a', 'text-halo-width': ['step', ['zoom'], 0, 12, 1.5], 'text-halo-color': '#ebe7df' } }]);
    expect(flat.findings.some(finding => finding.id === 'MT008')).toBe(true);
    expect(broken.findings.some(finding => finding.id === 'MT001')).toBe(false);
    expect(broken.findings.find(finding => finding.id === 'MT014')?.evidence).toContain('not a finite number');
    expect(broken.score).toBeLessThan(100);
    expect(mixed.findings.find(finding => finding.id === 'MT014')?.message).toContain('both 0 and positive');
    expect(mixed.findings.some(finding => finding.id === 'MT002')).toBe(false);
  });

  it('does not mutate the style', () => {
    const doc: StyleDoc = { version: 8, layers: [{ id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'v'], 10, '#fff', 0, '#000'] } }] };
    const before = structuredClone(doc);
    check(doc);
    expect(doc).toEqual(before);
  });
});
