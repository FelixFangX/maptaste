import type { StyleDoc, TasteName } from './types.js';
import { signatureRamp, tastes, type Taste } from './tastes.js';
import { mixHex } from './rules/utils.js';

/** Classic spectral ramp: enough hue sectors for MT001. */
export const rainbowScale = ['#d53e4f', '#fc8d59', '#fee08b', '#abdda4', '#66c2a5', '#3288bd'] as const;
/** Ink-paper sequential, the old showcase "after" blues. */
export const sequentialScale = tastes['ink-paper'].tokens.sequential;
export const sequentialScaleDark = tastes['night-ops'].tokens.sequential;

export interface TasteKnobs {
  classes: number;
  labelSize: number;
  labels: number;
  lineWidth: number;
}

export const defaultKnobs: Record<TasteName, TasteKnobs> = {
  'ink-paper': { classes: 3, labelSize: 14, labels: 4, lineWidth: 0.8 },
  'night-ops': { classes: 5, labelSize: 15, labels: 3, lineWidth: 1.6 },
  civic: { classes: 5, labelSize: 13, labels: 4, lineWidth: 1 },
  editorial: { classes: 3, labelSize: 22, labels: 2, lineWidth: 0.7 },
  'cn-metro': { classes: 4, labelSize: 15, labels: 5, lineWidth: 2.2 },
  'terrain-quiet': { classes: 5, labelSize: 13, labels: 3, lineWidth: 0.6 },
};

export type SpecimenKind = 'rainbow' | 'sequential' | TasteName;

export function knobsFor(id: TasteName, partial?: Partial<TasteKnobs>): TasteKnobs {
  return { ...defaultKnobs[id], ...partial };
}

function sampleRamp(colors: readonly string[], count: number): string[] {
  const n = Math.max(2, count);
  if (n <= colors.length) {
    return Array.from({ length: n }, (_, i) => colors[Math.round(i * (colors.length - 1) / (n - 1))]!);
  }
  return Array.from({ length: n }, (_, i) => mixHex(colors[0]!, colors[colors.length - 1]!, i / (n - 1)));
}

function fillStops(taste: Taste, classes: number): string[] {
  if (taste.id === 'night-ops' && taste.tokens.diverging) {
    const source = [...taste.tokens.diverging];
    if (classes <= source.length) return sampleRamp(source, classes);
    while (source.length < classes) source.push(taste.tokens.diverging[taste.tokens.diverging.length - 1]!);
    return source;
  }
  return sampleRamp(taste.tokens.sequential, classes);
}

function ramp(colors: readonly string[]): unknown[] {
  const expr: unknown[] = ['interpolate', ['linear'], ['get', 'value']];
  colors.forEach((color, index) => expr.push(index, color));
  return expr;
}

function specimen(taste: Taste, knobs: TasteKnobs): StyleDoc {
  const ground = taste.composition.ground === 'dark' ? taste.tokens.void : taste.tokens.paper;
  const colors = fillStops(taste, knobs.classes);
  const lineColor = taste.id === 'editorial' ? taste.tokens.accent : taste.tokens.ink;
  const lines = taste.id === 'cn-metro' && taste.tokens.categorical
    ? taste.tokens.categorical.map((color, index) => ({
      id: `route-${index}`, type: 'line', source: 'areas',
      paint: { 'line-color': color, 'line-width': knobs.lineWidth },
    }))
    : [{ id: 'strokes', type: 'line', source: 'areas', paint: { 'line-color': lineColor, 'line-width': knobs.lineWidth } }];
  const body = 12;
  const labels = Array.from({ length: Math.max(1, knobs.labels) }, (_, index) => ({
    id: index === 0 ? 'places' : `places-${index}`,
    type: 'symbol',
    source: 'areas',
    layout: {
      'text-field': '{name}',
      'text-size': taste.composition.hierarchy ? (index === 0 ? knobs.labelSize : body) : knobs.labelSize,
    },
    paint: { 'text-color': taste.tokens.ink, 'text-halo-color': taste.tokens.halo, 'text-halo-width': 1.25 },
  }));
  return {
    version: 8,
    name: taste.title,
    metadata: { 'maptaste:taste': taste.id, 'maptaste:themes': ['light', 'dark'] },
    sources: { areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': ground } },
      {
        id: 'values', type: 'fill', source: 'areas',
        paint: {
          'fill-color': ramp(colors),
          ...(taste.composition.fillOpacityMax != null ? { 'fill-opacity': 0.72 } : {}),
        },
      },
      ...lines,
      ...labels,
    ],
  };
}

/** Compact MapLibre styles: the rainbow enemy, or one named taste at its default knobs. */
export function tasteSpecimen(kind: SpecimenKind, partial?: Partial<TasteKnobs>): StyleDoc {
  if (kind === 'rainbow') {
    const paper = '#f7f8f6';
    return {
      version: 8,
      name: 'Rainbow choropleth',
      metadata: { 'maptaste:specimen': 'rainbow', 'maptaste:themes': ['light', 'dark'] },
      sources: { areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } } },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': paper } },
        { id: 'values', type: 'fill', source: 'areas', paint: { 'fill-color': ramp(rainbowScale) } },
        {
          id: 'places', type: 'symbol', source: 'areas',
          layout: { 'text-field': '{name}', 'text-size': 14 },
          paint: { 'text-color': '#1a2a4a', 'text-halo-color': paper, 'text-halo-width': 1.25 },
        },
      ],
    };
  }
  const id: TasteName = kind === 'sequential' ? 'ink-paper' : kind;
  return specimen(tastes[id], knobsFor(id, partial));
}

/** Ordered building / choropleth ramp for a taste. Night-ops stays sequential here; its diverging scale is the specimen. */
export function mapRamp(id: TasteName, classes: number): string[] {
  return sampleRamp(tastes[id].tokens.sequential, classes);
}

export function tasteRamp(kind: SpecimenKind): readonly string[] {
  if (kind === 'rainbow') return rainbowScale;
  if (kind === 'sequential') return sequentialScale;
  return signatureRamp(tastes[kind]);
}
