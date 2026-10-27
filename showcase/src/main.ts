import maplibregl, { type ExpressionSpecification, type StyleSpecification } from 'maplibre-gl';
import liberty from './liberty.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

// Public OpenFreeMap Liberty snapshot. Keep its sources, attribution, roads and labels.
// Only the palette and building presentation belong to this showcase.
function buildStyle(dark: boolean, before: boolean): StyleSpecification {
  const style = structuredClone(liberty) as StyleSpecification;
  const paper = dark ? '#0b0b0b' : '#f7f8f6';
  const ground = dark ? '#161d22' : '#e9ede9';
  const water = dark ? '#233b4b' : '#b9ced9';
  const height: ExpressionSpecification = ['max', 6, ['to-number', ['get', 'render_height'], 12]];
  const colors = before
    ? ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628']
    : dark
      ? ['#304b60', '#41617a', '#557b96', '#7095ad', '#8aafc4', '#b1cedc']
      : ['#dce7eb', '#c4d7e0', '#a4c0d0', '#7fa3bb', '#5b829f', '#365b7a'];
  const buildingColor: ExpressionSpecification = ['step', height, colors[0],
    10, colors[1], 18, colors[2], 30, colors[3], 55, colors[4], 100, colors[5]];

  style.metadata = { ...(style.metadata as Record<string, unknown>), 'maptaste:themes': ['light', 'dark'] };
  // Before keeps Liberty's stock light basemap and a clear, low-haze sky.
  style.sky = before ? {
    'sky-color': dark ? '#222e3c' : '#dcecf7',
    'horizon-color': dark ? '#303d49' : '#f0f5f8',
    'fog-color': dark ? '#303d49' : '#f0f5f8',
    'sky-horizon-blend': 0.3,
    'horizon-fog-blend': 0.1,
    'fog-ground-blend': 0,
    'atmosphere-blend': 0,
  } : {
    'sky-color': paper,
    'horizon-color': paper,
    'fog-color': dark ? '#26333c' : '#e5ecec',
    'sky-horizon-blend': 0.8,
    'horizon-fog-blend': 0.65,
    'fog-ground-blend': 0.35,
    'atmosphere-blend': 0,
  };
  style.light = { anchor: 'viewport', color: '#fff9ee', intensity: before ? 0.5 : 0.3, position: [1.5, 210, 35] };
  style.layers = style.layers.map(layer => {
    const id = layer.id;
    if (!before || dark) {
      if (layer.type === 'background') layer.paint = { ...layer.paint, 'background-color': paper };
      if (layer.type === 'raster') layer.layout = { ...layer.layout, visibility: 'none' };
      if (layer.type === 'fill') {
        const color = /water/.test(id) ? water : /park|wood|grass|cemetery/.test(id)
          ? dark ? '#243331' : '#dce5da' : ground;
        layer.paint = { ...layer.paint, 'fill-color': color, 'fill-outline-color': color };
        if (layer['source-layer'] === 'building') {
          layer.paint = { ...layer.paint, 'fill-color': buildingColor };
        }
      }
      if (layer.type === 'line') {
        const color = /water/.test(id) ? water : /boundary/.test(id)
          ? dark ? '#47535a' : '#c3ccc9' : /casing/.test(id)
            ? ground : dark ? '#354149' : '#fafbf8';
        layer.paint = { ...layer.paint, 'line-color': color };
      }
      if (layer.type === 'symbol') {
        // Let streets and neighborhoods carry the scene; omit POI icon clutter.
        if (!before && /poi|housenumber/.test(id)) layer.layout = { ...layer.layout, visibility: 'none' };
        layer.paint = { ...layer.paint, 'text-color': dark ? '#b2c1c8' : '#61737c',
          'text-halo-color': dark ? '#161d22' : '#f7f8f6', 'text-halo-width': 1 };
      }
    }
    if (before && layer.type === 'fill' && layer['source-layer'] === 'building') {
      layer.paint = { ...layer.paint, 'fill-color': buildingColor };
    }
    if (layer.type === 'fill-extrusion' && layer['source-layer'] === 'building') {
      layer.paint = {
        ...layer.paint,
        'fill-extrusion-color': buildingColor,
        'fill-extrusion-height': height,
        'fill-extrusion-base': ['max', 0, ['to-number', ['get', 'render_min_height'], 0]],
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
      };
    }
    return layer;
  });
  return style;
}

let dark = false;
let before = false;
const map = new maplibregl.Map({
  container: 'map', style: buildStyle(dark, before),
  center: [-122.4024, 37.7947], zoom: 15.4, pitch: 57, bearing: -32,
  maxPitch: 70, canvasContextAttributes: { antialias: true },
  attributionControl: { compact: true },
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

function updateStyle() {
  const camera = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
  map.once('style.load', () => map.jumpTo(camera));
  map.setStyle(buildStyle(dark, before));
}
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
theme.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.textContent = dark ? 'Light' : 'Dark';
  theme.setAttribute('aria-pressed', String(dark));
  updateStyle();
});
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
const modeCaption = document.querySelector<HTMLElement>('#map-mode')!;
modeButtons.forEach(button => button.addEventListener('click', () => {
  const nextBefore = button.dataset.mode === 'before';
  if (before === nextBefore) return;
  before = nextBefore;
  modeButtons.forEach(control => {
    control.setAttribute('aria-pressed', String((control.dataset.mode === 'before') === before));
  });
  modeCaption.textContent = before ? 'Before' : 'After';
  updateStyle();
}));
const status = document.querySelector<HTMLElement>('#map-status')!;
map.on('error', () => {
  status.hidden = false;
  status.textContent = 'Map could not load. Check your connection and WebGL support.';
});
map.on('idle', () => { status.hidden = true; });
