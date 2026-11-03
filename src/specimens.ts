import type { StyleDoc } from './types.js';

/** Classic spectral ramp: enough hue sectors for MT001. */
export const rainbowScale = ['#d53e4f', '#fc8d59', '#fee08b', '#abdda4', '#66c2a5', '#3288bd'] as const;
/** Single-hue blues used by the showcase After study. */
export const sequentialScale = ['#dce7eb', '#c4d7e0', '#a4c0d0', '#7fa3bb', '#5b829f', '#365b7a'] as const;
export const sequentialScaleDark = ['#304b60', '#41617a', '#557b96', '#7095ad', '#8aafc4', '#b1cedc'] as const;

export type TasteKind = 'rainbow' | 'sequential';

function ramp(colors: readonly string[]): unknown[] {
  const expr: unknown[] = ['interpolate', ['linear'], ['get', 'value']];
  colors.forEach((color, index) => expr.push(index, color));
  return expr;
}

/** Compact MapLibre styles for the rainbow → sequential rule beat. */
export function tasteSpecimen(kind: TasteKind): StyleDoc {
  const rainbow = kind === 'rainbow';
  const paper = '#f7f8f6';
  return {
    version: 8,
    name: rainbow ? 'Rainbow choropleth' : 'Sequential choropleth',
    metadata: {
      'maptaste:specimen': rainbow ? 'rainbow' : 'sequential',
      'maptaste:themes': ['light', 'dark'],
    },
    sources: {
      areas: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': paper } },
      {
        id: 'values',
        type: 'fill',
        source: 'areas',
        paint: { 'fill-color': ramp(rainbow ? rainbowScale : sequentialScale) },
      },
      {
        id: 'places',
        type: 'symbol',
        source: 'areas',
        layout: { 'text-field': '{name}', 'text-size': 14 },
        paint: { 'text-color': '#1a2a4a', 'text-halo-color': paper, 'text-halo-width': 1.25 },
      },
    ],
  };
}
