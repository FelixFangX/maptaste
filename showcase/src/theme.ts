import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import { mixHex } from '../../src/rules/utils.js';
import { mapRamp, rainbowScale } from '../../src/specimens.js';
import { tastes } from '../../src/tastes.js';
import type { TasteName } from '../../src/types.js';

export type PaintBag = Record<string, unknown>;
export interface LayerTheme { id: string; paint: PaintBag; layout: PaintBag }
export interface CityTheme {
  layers: LayerTheme[];
  sky: NonNullable<StyleSpecification['sky']>;
  light: NonNullable<StyleSpecification['light']>;
}
export interface ThemeInput {
  taste: TasteName;
  dark: boolean;
  before: boolean;
  classes: number;
  lineWidth: number;
  labelSize: number;
  labelRanks: number;
}

interface Tone {
  night: boolean;
  paper: string;
  ground: string;
  water: string;
  ink: string;
  park: string;
  wood: string;
  grass: string;
  sand: string;
  ice: string;
  wetland: string;
  residential: string;
  hospital: string;
  school: string;
  cemetery: string;
  pitch: string;
  track: string;
  roadMajor: string;
  roadMedium: string;
  roadService: string;
  roadMinor: string;
  casingMajor: string;
  casingMinor: string;
  boundary: string;
  waterway: string;
  parkOutline: string;
  shoreline: string;
  building: readonly string[];
  routeRoads: boolean;
}

const ranks = [
  ['label_country_1', 'label_country_2', 'label_country_3', 'label_city_capital'],
  ['label_city', 'label_state'],
  ['label_town'],
  ['label_village', 'label_other'],
  ['highway-name-major'],
  ['highway-name-minor', 'highway-name-path', 'waterway_line_label', 'water_name_point_label', 'water_name_line_label'],
];

function land(paper: string, tint: string, night: boolean): Pick<Tone, 'park' | 'wood' | 'grass' | 'sand' | 'ice' | 'wetland' | 'residential' | 'hospital' | 'school' | 'cemetery' | 'pitch' | 'track'> {
  const dye = (color: string, amount: number) => mixHex(paper, color, night ? amount * 0.72 : amount);
  return {
    park: dye(tint, 0.46),
    wood: dye(tint, 0.62),
    grass: dye(tint, 0.38),
    sand: dye('#c2b48a', 0.42),
    ice: dye('#b7c6ce', 0.28),
    wetland: dye(tint, 0.5),
    residential: mixHex(paper, night ? '#000000' : '#8d928a', night ? 0.22 : 0.08),
    hospital: dye('#c4a8ae', 0.35),
    school: dye('#c2b98a', 0.28),
    cemetery: dye(tint, 0.33),
    pitch: dye(tint, 0.55),
    track: dye('#b6a898', 0.3),
  };
}

function enemyTone(): Tone {
  const paper = '#f7f8f6';
  return {
    night: false, paper, ground: '#e9ede9', water: '#b9ced9', ink: '#61737c',
    ...land(paper, '#8eae9a', false),
    roadMajor: '#f0e9d6', roadMedium: '#f5f4eb', roadService: '#d9dfdb', roadMinor: '#fafbf8',
    casingMajor: '#bdbbac', casingMinor: '#d0d6d1', boundary: '#c3ccc9', waterway: '#91b5c6',
    parkOutline: '#b9ccb5', shoreline: '#839fa9', building: rainbowScale, routeRoads: false,
  };
}

function tasteTone(id: TasteName, dark: boolean, classes: number): Tone {
  const taste = tastes[id];
  const night = id === 'night-ops' || dark;
  const paper = night ? taste.tokens.void : taste.tokens.paper;
  const ink = night ? (id === 'night-ops' ? taste.tokens.ink : mixHex('#e7eef2', taste.tokens.void, 0.18)) : taste.tokens.ink;
  const tint = id === 'terrain-quiet' ? '#7f8f72' : id === 'editorial' ? '#b7a48c' : id === 'civic' ? '#8eabc4' : id === 'cn-metro' ? '#c4a090' : '#7ea38a';
  const water = night ? mixHex(paper, '#35586c', 0.7) : mixHex(paper, id === 'terrain-quiet' ? '#8ea3ab' : id === 'editorial' ? '#9eb0b4' : '#6f9aaf', 0.58);
  const building = mapRamp(id, Math.max(2, classes));
  const ramp = night && id !== 'night-ops' ? building.map((color, index) => mixHex(color, '#d7e6ee', 0.45 + index * 0.06)) : building;
  return {
    night, paper, ground: night ? mixHex(paper, ink, 0.16) : mixHex(paper, taste.tokens.accent, 0.05),
    water, ink, ...land(paper, tint, night),
    roadMajor: night ? mixHex(paper, ink, 0.55) : mixHex(paper, '#f4f1ea', 0.35),
    roadMedium: night ? mixHex(paper, ink, 0.38) : mixHex(paper, '#ffffff', 0.45),
    roadService: night ? mixHex(paper, ink, 0.22) : mixHex(paper, taste.tokens.ink, 0.08),
    roadMinor: night ? mixHex(paper, ink, 0.28) : mixHex(paper, '#ffffff', 0.62),
    casingMajor: night ? mixHex(paper, '#000000', 0.2) : mixHex(paper, taste.tokens.ink, 0.18),
    casingMinor: night ? mixHex(paper, '#000000', 0.35) : mixHex(paper, taste.tokens.ink, 0.1),
    boundary: night ? mixHex(paper, ink, 0.25) : mixHex(paper, taste.tokens.ink, 0.16),
    waterway: night ? mixHex(water, ink, 0.25) : mixHex(water, paper, 0.2),
    parkOutline: night ? mixHex(paper, tint, 0.4) : mixHex(paper, tint, 0.35),
    shoreline: night ? mixHex(water, ink, 0.4) : mixHex(water, taste.tokens.ink, 0.35),
    building: ramp,
    routeRoads: id === 'cn-metro',
  };
}

function buildingColor(colors: readonly string[]): ExpressionSpecification {
  const expr: unknown[] = ['interpolate', ['linear'], ['max', 6, ['to-number', ['get', 'render_height'], 12]]];
  colors.forEach((color, index) => {
    const at = colors.length === 1 ? 8 : 8 + (152 * index) / (colors.length - 1);
    expr.push(Math.round(at), color);
  });
  return expr as ExpressionSpecification;
}

function lineColor(id: string, tone: Tone): string {
  if (tone.routeRoads && !/casing/.test(id)) {
    if (/transit|rail/.test(id) && !/hatch/.test(id)) return '#1f8a4c';
    if (/motorway|trunk|primary/.test(id)) return '#d23a3a';
    if (/secondary|tertiary/.test(id)) return '#2a6fdb';
  }
  const major = /motorway|trunk|primary/.test(id);
  const medium = /secondary|tertiary/.test(id);
  const service = /service|track|path|rail|transit/.test(id);
  if (/waterway/.test(id)) return tone.waterway;
  if (/boundary/.test(id)) return tone.boundary;
  if (id === 'park_outline') return tone.parkOutline;
  if (/casing/.test(id)) return major ? tone.casingMajor : tone.casingMinor;
  if (major) return tone.roadMajor;
  if (medium) return tone.roadMedium;
  if (service) return tone.roadService;
  return tone.roadMinor;
}

export function cityTheme(layers: StyleSpecification['layers'], input: ThemeInput): CityTheme {
  const tone = input.before ? enemyTone() : tasteTone(input.taste, input.dark, input.classes);
  const stroke = input.before ? 2.4 : input.lineWidth;
  const buildings = buildingColor(input.before ? rainbowScale : tone.building);
  const landColor: Record<string, string> = {
    park: tone.park, landcover_wood: tone.wood, landcover_grass: tone.grass, landcover_sand: tone.sand,
    landcover_ice: tone.ice, landcover_wetland: tone.wetland, landuse_residential: tone.residential,
    landuse_hospital: tone.hospital, landuse_school: tone.school, landuse_cemetery: tone.cemetery,
    landuse_pitch: tone.pitch, landuse_track: tone.track,
  };
  return {
    sky: {
      'sky-color': tone.paper, 'horizon-color': tone.paper, 'fog-color': tone.night ? '#26333c' : mixHex(tone.paper, tone.water, 0.35),
      'sky-horizon-blend': 0.8, 'horizon-fog-blend': 0.65, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0,
    },
    light: { anchor: 'viewport', color: '#fff9ee', intensity: tone.night ? 0.22 : 0.3, position: [1.5, 210, 35] },
    layers: layers.map(layer => {
      const id = layer.id;
      const paint: PaintBag = { ...layer.paint };
      const layout: PaintBag = { ...layer.layout };
      if (layer.type === 'background') paint['background-color'] = tone.paper;
      if (layer.type === 'raster') layout.visibility = 'none';
      if (layer.type === 'fill' || layer.type === 'fill-extrusion') {
        const color = id === 'water' ? tone.water : landColor[id] ?? tone.ground;
        if (layer.type === 'fill') {
          paint['fill-color'] = color;
          paint['fill-outline-color'] = color;
          if ('fill-pattern' in paint) paint['fill-pattern'] = undefined;
          const quiet = !input.before && input.taste === 'terrain-quiet';
          paint['fill-opacity'] = quiet ? 0.62 : (id === 'landcover_wood' || id === 'landcover_grass' ? 0.7 : 1);
        }
      }
      if (layer.type === 'line') paint['line-color'] = lineColor(id, tone);
      if (id === 'maptaste-shoreline' || id === 'boundary_2' || id === 'boundary_3' || id === 'park_outline') {
        paint['line-width'] = ['interpolate', ['linear'], ['zoom'], 8, Math.max(0.15, stroke * 0.35), 15, stroke];
      }
      if (id === 'maptaste-shoreline') {
        paint['line-color'] = tone.shoreline;
        paint['line-opacity'] = 0.75;
      }
      if (layer.type === 'symbol') {
        const rank = ranks.findIndex(group => group.includes(id));
        if (id === 'poi_transit') layout.visibility = !input.before && tone.routeRoads ? 'visible' : 'none';
        else if (/housenumber|shield|airport|one_way|poi_r/.test(id) || /^poi/.test(id)) layout.visibility = 'none';
        else if (rank >= 0) layout.visibility = input.before || rank < input.labelRanks ? 'visible' : 'none';
        paint['text-color'] = tone.ink;
        paint['text-halo-color'] = tone.paper;
        paint['text-halo-width'] = input.before ? 0.6 : 1.2;
        if (/^label_/.test(id)) {
          const editorialBody = !input.before && input.taste === 'editorial' && rank > 0;
          layout['text-size'] = input.before ? null : (editorialBody ? 12 : input.labelSize);
        }
      }
      if ((layer.type === 'fill' || layer.type === 'fill-extrusion') && layer['source-layer'] === 'building') {
        const key = layer.type === 'fill' ? 'fill-color' : 'fill-extrusion-color';
        paint[key] = buildings;
        if (!input.before && input.taste === 'terrain-quiet' && layer.type === 'fill-extrusion') paint['fill-extrusion-opacity'] = 0.78;
      }
      return { id, paint, layout };
    }),
  };
}

export interface ThemeChange { id: string; kind: 'paint' | 'layout'; key: string; value: unknown }

export function themeDelta(from: CityTheme, to: CityTheme): ThemeChange[] {
  const delta: ThemeChange[] = [];
  to.layers.forEach((layer, index) => {
    for (const kind of ['paint', 'layout'] as const) {
      const keys = new Set([...Object.keys(layer[kind]), ...Object.keys(from.layers[index]?.[kind] ?? {})]);
      for (const key of keys) {
        const value = layer[kind][key] ?? null;
        if (JSON.stringify(value) !== JSON.stringify(from.layers[index]?.[kind][key] ?? null)) delta.push({ id: layer.id, kind, key, value });
      }
    }
  });
  return delta;
}
