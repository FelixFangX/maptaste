import { describe, expect, it } from 'vitest';
import { check } from '../src/index.js';
import { contrast, luminance, rgb, saturation } from '../src/rules/utils.js';
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

  it('parses legacy comma and CSS Color 4 space hsl()/hsla() colors accurately', () => {
    const expectRgbClose = (color: string, expected: [number, number, number]) => {
      const actual = rgb(color);
      expect(actual, color).toBeDefined();
      expected.forEach((channel, i) => expect(actual![i]).toBeCloseTo(channel, 4));
    };
    expectRgbClose('hsl(0, 100%, 50%)', [1, 0, 0]);
    expectRgbClose('hsl(120, 100%, 50%)', [0, 1, 0]);
    expectRgbClose('hsl(240, 100%, 50%)', [0, 0, 1]);
    expectRgbClose('hsl(210, 50%, 40%)', [0.2, 0.4, 0.6]);
    expectRgbClose('hsla(210, 50%, 40%, 0.5)', [0.2, 0.4, 0.6]);
    expectRgbClose('hsla(0,3%,85%,0.84)', [0.8545, 0.8455, 0.8455]);
    expectRgbClose('hsl(210 50% 40%)', [0.2, 0.4, 0.6]);
    expectRgbClose('hsl(210 50% 40% / 0.5)', [0.2, 0.4, 0.6]);
    expectRgbClose('hsla(210 50% 40% / 50%)', [0.2, 0.4, 0.6]);
    expectRgbClose('hsl(360, 100%, 50%)', [1, 0, 0]);
    expectRgbClose('hsl(-120deg 100% 50%)', [0, 0, 1]);
    expectRgbClose('hsl(0.5turn 100% 50%)', [0, 1, 1]);
    expectRgbClose('hsl(200grad, 100%, 50%)', [0, 1, 1]);
    expectRgbClose('hsl(3.14159265rad 100% 50%)', [0, 1, 1]);
    expectRgbClose('hsl(0, 0%, 100%)', [1, 1, 1]);
    expectRgbClose('hsl(0, 0%, 0%)', [0, 0, 0]);

    expect(luminance('hsl(0, 0%, 100%)')).toBeCloseTo(1, 5);
    expect(luminance('hsl(0, 0%, 0%)')).toBeCloseTo(0, 5);
    expect(saturation('hsl(210, 50%, 40%)')).toBeCloseTo(0.5, 5);
    expect(contrast('hsl(0 0% 0%)', 'hsl(0 0% 100%)')).toBeCloseTo(21, 3);

    // Invalid hsl/hsla strings are rejected
    for (const bad of [
      'hsl(210, 50% 40%)',
      'hsl(210, 50%, 40% / 0.5)',
      'hsl(210, 50, 40)',
      'hsl(0, 120%, 50%)',
      'hsl(0, -10%, 50%)',
      'hsl(0, 50%, 105%)',
      'hsla(0, 50%, 50%, 1.5)',
      'hsl(0 50% 50% / -0.1)',
      'hsl(0 50% 50% / 120%)',
    ]) {
      expect(rgb(bad), bad).toBeUndefined();
    }
  });

  it('checks hsl()/hsla() styles for rainbow, saturation, ground, and contrast without MT014', () => {
    const rainbowComma = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['step', ['get', 'value'], 'hsl(0, 100%, 50%)', 1, 'hsl(60, 100%, 50%)', 2, 'hsl(120, 100%, 50%)', 3, 'hsl(180, 100%, 50%)'] } }]);
    const rainbowSpace = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['step', ['get', 'value'], 'hsl(0 100% 50% / 0.9)', 1, 'hsl(60 100% 50% / 0.9)', 2, 'hsl(120 100% 50% / 0.9)', 3, 'hsl(180 100% 50% / 0.9)'] } }]);
    const quietHsl = style([
      { id: 'background', type: 'background', paint: { 'background-color': 'hsl(40, 22%, 90%)' } },
      { id: 'land', type: 'fill', paint: { 'fill-color': 'hsla(35, 8%, 85%, 0.84)' } },
      { id: 'label', type: 'symbol', layout: { 'text-field': 'Place' }, paint: { 'text-color': 'hsl(215 24% 16%)' } },
    ]);
    const saturated = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': 'hsl(0, 100%, 50%)' } }]);

    expect(rainbowComma.findings.some(finding => finding.id === 'MT001')).toBe(true);
    expect(rainbowComma.findings.some(finding => finding.id === 'MT014')).toBe(false);
    expect(rainbowSpace.findings.some(finding => finding.id === 'MT001')).toBe(true);
    expect(rainbowSpace.findings.some(finding => finding.id === 'MT014')).toBe(false);
    expect(quietHsl.findings).toEqual([]);
    expect(quietHsl.score).toBe(100);
    expect(saturated.findings.some(finding => finding.id === 'MT014')).toBe(false);
    expect(saturated.findings.some(finding => finding.id === 'MT006')).toBe(true);
  });

  it('reports unsupported color formats and feature colors as unknown instead of a pass', () => {
    const oklch = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': 'oklch(62.8% 0.258 29.2)' } }]);
    const lab = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': 'lab(50% 40 59.5)' } }]);
    const feature = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['get', 'color'] } }]);
    const coalesced = style([paper, { id: 'values', type: 'fill', paint: { 'fill-color': ['coalesce', ['get', 'color'], '#ff0000'] } }]);
    for (const result of [oklch, lab, feature, coalesced]) {
      expect(result.findings.some(finding => finding.id === 'MT001')).toBe(false);
      expect(result.findings.some(finding => finding.id === 'MT014')).toBe(true);
      expect(result.score).toBeLessThan(100);
    }
    expect(oklch.findings.find(finding => finding.id === 'MT014')?.evidence).toContain('color is outside');
    expect(oklch.coverage.blockingErrors).toBe(0);
    expect(oklch.coverage.unresolved).toBeGreaterThan(0);
    expect(oklch.coverage.statement).toContain('No blocking taste errors.');
    expect(oklch.coverage.statement).toContain('The score does not cover them.');
    expect(oklch.coverage.statement).toContain('Not a MapLibre style validation.');
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

  it('skips a hidden layer and reads a painted extrusion color', () => {
    const ramp = ['interpolate', ['linear'], ['get', 'height'], 8, '#d53e4f', 30, '#fc8d59', 50, '#fee08b', 80, '#abdda4', 110, '#66c2a5', 140, '#3288bd'];
    const hidden = style([paper, { id: 'values', type: 'fill', layout: { visibility: 'none' }, paint: { 'fill-color': ramp } }]);
    const extruded = style([paper, { id: 'buildings', type: 'fill-extrusion', paint: { 'fill-extrusion-color': ramp } }]);
    const concealed = style([{ id: 'ground', type: 'background', layout: { visibility: 'none' }, paint: { 'background-color': '#ffffff' } }], 'night-ops');
    expect(hidden.findings.some(finding => finding.id === 'MT001')).toBe(false);
    expect(extruded.findings.find(finding => finding.id === 'MT001')?.path).toBe('layers[1].paint.fill-extrusion-color');
    expect(extruded.findings.find(finding => finding.id === 'MT001')?.evidence).toContain('#d53e4f');
    expect(concealed.findings.some(finding => finding.id === 'MT005')).toBe(false);
    expect(concealed.findings.find(finding => finding.id === 'MT014')?.evidence).toBe('visibility is none');
  });

  it('does not mutate the style', () => {
    const doc: StyleDoc = { version: 8, layers: [{ id: 'values', type: 'fill', paint: { 'fill-color': ['interpolate', ['linear'], ['get', 'v'], 10, '#fff', 0, '#000'] } }] };
    const before = structuredClone(doc);
    check(doc);
    expect(doc).toEqual(before);
  });
});
