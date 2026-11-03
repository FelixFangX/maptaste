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

type LineKind = 'major' | 'medium' | 'minor' | 'casing' | 'boundary' | 'water' | 'rail' | 'other';

function lineKind(id: string): LineKind {
  if (/boundary/.test(id)) return 'boundary';
  if (/waterway|shoreline/.test(id)) return 'water';
  if (/rail|transit/.test(id)) return 'rail';
  if (/casing/.test(id)) return 'casing';
  if (/motorway/.test(id)) return 'major';
  if (/trunk|primary|secondary|tertiary/.test(id)) return 'medium';
  if (/service|track|path|minor|link|street|pedestrian/.test(id)) return 'minor';
  return 'other';
}

/** Null hides the stroke. Before keeps the noisy atlas so the taste can remove it. */
function lineScale(roads: (typeof tastes)[TasteName]['stage']['roads'], kind: LineKind, before: boolean): number | null {
  if (before) return kind === 'casing' ? 0.7 : 1.15;
  switch (roads) {
    case 'hairline':
      if (kind === 'casing' || kind === 'rail' || kind === 'minor') return null;
      if (kind === 'major') return 0.5;
      if (kind === 'medium') return 0.32;
      return 0.4;
    case 'atlas':
      if (kind === 'minor') return null;
      if (kind === 'major') return 1.25;
      if (kind === 'casing') return 1.05;
      return 0.75;
    case 'routes':
      if (kind === 'minor' || kind === 'medium' || kind === 'casing') return null;
      if (kind === 'major' || kind === 'rail') return 1.7;
      return 0.45;
    case 'plan':
      if (kind === 'minor' || kind === 'casing' || kind === 'rail') return null;
      if (kind === 'boundary') return 2.6;
      if (kind === 'major') return 1.6;
      if (kind === 'medium') return 1.15;
      return 0.55;
    case 'quiet':
      if (kind === 'boundary' || kind === 'water') return 0.4;
      return null;
  }
}

function strokeWidth(stroke: number, scale: number, zoom: number): ExpressionSpecification {
  const at = Math.max(0.45, stroke * scale);
  const low = Math.max(0.3, at * 0.72);
  return ['interpolate', ['linear'], ['zoom'], Math.max(3, zoom - 2), low, zoom + 2, at];
}

function textFont(type: (typeof tastes)[TasteName]['stage']['type'], rank: number): string[] {
  if (type === 'bold') return ['Noto Sans Bold'];
  if (type === 'italic-headline' && rank <= 1) return ['Noto Sans Italic'];
  return ['Noto Sans Regular'];
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
  const stage = tastes[input.taste].stage;
  const stroke = input.before ? 2.4 : input.lineWidth;
  const buildings = buildingColor(input.before ? rainbowScale : tone.building);
  const extruded = input.before || stage.extrusion;
  const showBuildings = input.before || stage.buildings;
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
      if (layer.type === 'raster') {
        const hill = !input.before && stage.hillshade;
        layout.visibility = hill ? 'visible' : 'none';
        paint['raster-opacity'] = hill ? 0.82 : 0;
      }
      if (layer.type === 'fill' || layer.type === 'fill-extrusion') {
        const color = id === 'water' ? tone.water : landColor[id] ?? tone.ground;
        if (layer.type === 'fill') {
          paint['fill-color'] = color;
          paint['fill-outline-color'] = color;
          if ('fill-pattern' in paint) paint['fill-pattern'] = undefined;
          const quiet = !input.before && input.taste === 'terrain-quiet';
          paint['fill-opacity'] = quiet ? 0.62 : (id === 'landcover_wood' || id === 'landcover_grass' ? 0.7 : 1);
          if (id.startsWith('landuse_')) layout.visibility = !input.before && stage.roads === 'quiet' && !stage.hillshade ? 'none' : 'visible';
        }
      }
      if (layer.type === 'line') {
        const scale = lineScale(stage.roads, lineKind(id), input.before);
        paint['line-color'] = id === 'maptaste-shoreline' ? tone.shoreline : lineColor(id, tone);
        if (!input.before && stage.roads === 'plan') {
          const kind = lineKind(id);
          if (kind === 'boundary' || kind === 'major') paint['line-color'] = tone.ink;
          else if (kind === 'medium') paint['line-color'] = mixHex(tone.paper, tone.ink, 0.62);
        }
        layout.visibility = scale == null ? 'none' : 'visible';
        if (scale != null) {
          paint['line-width'] = strokeWidth(stroke, scale, input.before ? 15.4 : stage.zoom);
          paint['line-opacity'] = id === 'maptaste-shoreline' ? 0.75 : 1;
        }
      }
      if (layer.type === 'symbol') {
        const rank = ranks.findIndex(group => group.includes(id));
        const poi = /^poi/.test(id);
        if (input.before) layout.visibility = /housenumber|shield|one_way/.test(id) ? 'none' : 'visible';
        else if (id === 'poi_transit' && stage.roads === 'routes') layout.visibility = 'visible';
        else if (poi || /housenumber|shield|airport|one_way/.test(id)) layout.visibility = 'none';
        else if (rank >= 0) layout.visibility = rank < input.labelRanks ? 'visible' : 'none';
        else layout.visibility = 'none';
        paint['text-color'] = tone.ink;
        paint['text-halo-color'] = tone.paper;
        paint['text-halo-width'] = input.before ? 0.4 : stage.type === 'bold' ? 0.9 : 1.35;
        layout['text-font'] = input.before ? ['Noto Sans Regular'] : textFont(stage.type, rank < 0 ? 9 : rank);
        layout['text-letter-spacing'] = !input.before && stage.roads === 'hairline' && stage.type === 'roman' ? 0.12 : 0;
        if (/^label_/.test(id)) {
          const body = !input.before && stage.type === 'italic-headline' && rank > 1;
          layout['text-size'] = input.before ? null : (body ? 12 : input.labelSize);
        }
      }
      if (layer.id === 'building') layout.visibility = showBuildings && !extruded ? 'visible' : 'none';
      if (layer.id === 'building-3d') layout.visibility = showBuildings && extruded ? 'visible' : 'none';
      if ((layer.type === 'fill' || layer.type === 'fill-extrusion') && layer['source-layer'] === 'building') {
        const key = layer.type === 'fill' ? 'fill-color' : 'fill-extrusion-color';
        paint[key] = buildings;
        if (!input.before && stage.hillshade && layer.type === 'fill-extrusion') paint['fill-extrusion-opacity'] = 0.55;
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
