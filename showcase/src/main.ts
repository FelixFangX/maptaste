import maplibregl, { type ExpressionSpecification, type StyleSpecification } from 'maplibre-gl';
import liberty from './liberty.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

// One style/source graph for the whole session. Theme changes never reload tiles.
const baseStyle = structuredClone(liberty) as StyleSpecification;
baseStyle.transition = { duration: 0, delay: 0 };
const height: ExpressionSpecification = ['max', 6, ['to-number', ['get', 'render_height'], 12]];
for (const layer of baseStyle.layers) {
  if (layer.type === 'fill' && layer['source-layer'] === 'building') layer.maxzoom = 14;
  if (layer.type === 'fill-extrusion' && layer['source-layer'] === 'building') {
    layer.minzoom = 14;
    layer.paint = { ...layer.paint,
      'fill-extrusion-height': height,
      'fill-extrusion-base': ['max', 0, ['to-number', ['get', 'render_min_height'], 0]],
      'fill-extrusion-opacity': 1,
      'fill-extrusion-vertical-gradient': true,
    };
  }
}
// Reuse water geometry; no extra source or raster overlay. Invisible in Before.
const waterLayer = baseStyle.layers.find(layer => layer.type === 'fill' && layer.id === 'water')!;
baseStyle.layers.splice(baseStyle.layers.indexOf(waterLayer) + 1, 0, {
  id: 'maptaste-shoreline', type: 'line', source: 'openmaptiles',
  'source-layer': 'water', filter: 'filter' in waterLayer ? waterLayer.filter : undefined, minzoom: 10,
  paint: { 'line-color': '#839fa9', 'line-opacity': 0,
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 16, 1.2] },
});

type Properties = Record<string, unknown>;
type LayerTheme = { id: string; paint: Properties; layout: Properties };
type Theme = { layers: LayerTheme[]; sky: NonNullable<StyleSpecification['sky']>; light: NonNullable<StyleSpecification['light']> };
function prepareTheme(dark: boolean, before: boolean): Theme {
  const paper = dark ? '#0b0b0b' : '#f7f8f6';
  const ground = dark ? '#161d22' : '#e9ede9';
  const water = dark ? '#233b4b' : '#b9ced9';
  const colors = before
    ? ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628']
    : dark
      ? ['#304b60', '#41617a', '#557b96', '#7095ad', '#8aafc4', '#b1cedc']
      : ['#dce7eb', '#c4d7e0', '#a4c0d0', '#7fa3bb', '#5b829f', '#365b7a'];
  const buildingColor: ExpressionSpecification = ['step', height, colors[0],
    10, colors[1], 18, colors[2], 30, colors[3], 55, colors[4], 100, colors[5]];
  const land: Record<string, string> = {
    park: dark ? '#293c35' : '#d1dfce',
    landcover_wood: dark ? '#294138' : '#aec7b0',
    landcover_grass: dark ? '#35483a' : '#c2d4b8',
    landcover_sand: dark ? '#494435' : '#e9dfc4',
    landcover_ice: dark ? '#384952' : '#e0eaeb',
    landcover_wetland: dark ? '#2c4542' : '#b9d2c8',
    landuse_residential: dark ? '#232a2c' : '#e1e3dc',
    landuse_hospital: dark ? '#3b3036' : '#e7d9db',
    landuse_school: dark ? '#3c3d30' : '#e3dfc8',
    landuse_cemetery: dark ? '#303d34' : '#cdd7c4',
    landuse_pitch: dark ? '#354b40' : '#bfceb8',
    landuse_track: dark ? '#494039' : '#d9cec0',
  };
  return {
    sky: before ? {
      'sky-color': '#dcecf7', 'horizon-color': '#f0f5f8', 'fog-color': '#f0f5f8',
      'sky-horizon-blend': 0.3, 'horizon-fog-blend': 0.1, 'fog-ground-blend': 0, 'atmosphere-blend': 0,
    } : {
      'sky-color': paper, 'horizon-color': paper, 'fog-color': dark ? '#26333c' : '#e5ecec',
      'sky-horizon-blend': 0.8, 'horizon-fog-blend': 0.65, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0,
    },
    light: { anchor: 'viewport', color: '#fff9ee', intensity: before ? 0.5 : 0.3, position: [1.5, 210, 35] },
    layers: baseStyle.layers.map(layer => {
      const id = layer.id;
      const paint: Properties = { ...layer.paint };
      const layout: Properties = { ...layer.layout };
      if (!before) {
        if (layer.type === 'background') paint['background-color'] = paper;
        if (layer.type === 'raster') layout.visibility = 'none';
        if (layer.type === 'fill') {
          const color = id === 'water' ? water : land[id] ?? ground;
          paint['fill-color'] = color;
          paint['fill-outline-color'] = color;
          // Suppress sprite patterns in the cinematic palette.
          if ('fill-pattern' in paint) paint['fill-pattern'] = undefined;
          if (id === 'landcover_wood' || id === 'landcover_grass') paint['fill-opacity'] = 0.7;
        }
        if (layer.type === 'line') {
          const major = /motorway|trunk|primary/.test(id);
          const medium = /secondary|tertiary/.test(id);
          const service = /service|track|path|rail|transit/.test(id);
          paint['line-color'] = /waterway/.test(id) ? (dark ? '#416274' : '#91b5c6')
            : /boundary/.test(id) ? (dark ? '#47535a' : '#c3ccc9')
            : id === 'park_outline' ? (dark ? '#3c5145' : '#b9ccb5')
            : /casing/.test(id) ? (major ? (dark ? '#626052' : '#bdbbac') : (dark ? '#29353b' : '#d0d6d1'))
            : major ? (dark ? '#77796e' : '#f0e9d6')
            : medium ? (dark ? '#566167' : '#f5f4eb')
            : service ? (dark ? '#303c42' : '#d9dfdb')
            : (dark ? '#414f57' : '#fafbf8');
        }
        if (layer.type === 'symbol') {
          if (/poi|housenumber/.test(id)) layout.visibility = 'none';
          paint['text-color'] = dark ? '#b2c1c8' : '#61737c';
          paint['text-halo-color'] = paper;
          paint['text-halo-width'] = 1;
        }
      }
      if (id === 'maptaste-shoreline') {
        paint['line-color'] = dark ? '#4c6c79' : '#839fa9';
        paint['line-opacity'] = before ? 0 : 0.75;
      }
      if (layer.type === 'fill' && layer['source-layer'] === 'building') paint['fill-color'] = buildingColor;
      if (layer.type === 'fill-extrusion' && layer['source-layer'] === 'building') paint['fill-extrusion-color'] = buildingColor;
      return { id, paint, layout };
    }),
  };
}

// Before always means stock Liberty, regardless of the surrounding page theme.
const themes = { before: prepareTheme(false, true), light: prepareTheme(false, false), dark: prepareTheme(true, false) };
// Include absent properties in every map so returning to Before restores defaults.
for (const [index] of baseStyle.layers.entries()) {
  for (const kind of ['paint', 'layout'] as const) {
    const keys = new Set(Object.values(themes).flatMap(theme => Object.keys(theme.layers[index][kind])));
    for (const theme of Object.values(themes)) for (const key of keys) {
      theme.layers[index][kind][key] ??= null;
    }
  }
}
// Compute only changed properties once, including resets to Liberty defaults.
type Change = { id: string; kind: 'paint' | 'layout'; key: string; value: unknown };
const changes = new Map<Theme, Map<Theme, Change[]>>();
for (const from of Object.values(themes)) {
  const targets = new Map<Theme, Change[]>();
  for (const to of Object.values(themes)) {
    const delta: Change[] = [];
    to.layers.forEach((layer, index) => {
      for (const kind of ['paint', 'layout'] as const) {
        for (const [key, value] of Object.entries(layer[kind])) {
          if (JSON.stringify(value) !== JSON.stringify(from.layers[index][kind][key])) {
            delta.push({ id: layer.id, kind, key, value });
          }
        }
      }
    });
    targets.set(to, delta);
  }
  changes.set(from, targets);
}
const initial = themes.light;
baseStyle.sky = initial.sky;
baseStyle.light = initial.light;
for (const [index, layer] of baseStyle.layers.entries()) {
  // Null resets are for setters, not the initial style document.
  const properties = (values: Properties) => Object.fromEntries(Object.entries(values).filter(([, value]) => value != null));
  Object.assign(layer, { paint: properties(initial.layers[index].paint), layout: properties(initial.layers[index].layout) });
}
let dark = false;
let before = false;
let applied = initial;
let ready = false;
const map = new maplibregl.Map({
  container: 'map', style: baseStyle,
  center: [-122.4024, 37.7947], zoom: 15.4, pitch: 57, bearing: -32,
  fadeDuration: 0, renderWorldCopies: false, refreshExpiredTiles: false,
  pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  // Keep edge antialiasing; the DPR cap bounds its framebuffer cost.
  maxPitch: 70, canvasContextAttributes: { antialias: true },
  attributionControl: { compact: true },
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
function updateStyle() {
  if (!ready) return;
  const next = before ? themes.before : dark ? themes.dark : themes.light;
  if (next === applied) return;
  for (const change of changes.get(applied)!.get(next)!) {
    if (change.kind === 'paint') map.setPaintProperty(change.id, change.key, change.value);
    else map.setLayoutProperty(change.id, change.key, change.value);
  }
  map.setSky(next.sky);
  map.setLight(next.light);
  applied = next;
}
map.once('load', () => { ready = true; updateStyle(); });
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
theme.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.textContent = dark ? 'Light' : 'Dark';
  theme.setAttribute('aria-pressed', String(dark));
  updateStyle();
});
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
modeButtons.forEach(button => button.addEventListener('click', () => {
  const nextBefore = button.dataset.mode === 'before';
  if (before === nextBefore) return;
  before = nextBefore;
  modeButtons.forEach(control => {
    control.setAttribute('aria-pressed', String((control.dataset.mode === 'before') === before));
  });
  updateStyle();
}));
const status = document.querySelector<HTMLElement>('#map-status')!;
map.on('error', () => {
  status.hidden = false;
  status.textContent = 'Map could not load. Check your connection and WebGL support.';
});
map.on('idle', () => { status.hidden = true; });
