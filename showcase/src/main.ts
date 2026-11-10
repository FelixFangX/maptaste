/// <reference types="vite/client" />
import maplibregl, { type ExpressionSpecification, type StyleSpecification } from 'maplibre-gl';
import liberty from './liberty.json';
import { check } from '../../src/engine.js';
import { defaultKnobs, tasteRamp, tasteSpecimen, type TasteKnobs } from '../../src/specimens.js';
import { isTaste, tastes } from '../../src/tastes.js';
import type { StyleDoc, TasteName } from '../../src/types.js';
import { markGallery, renderGallery } from './gallery.js';
import { cityTheme, themeDelta, type CityTheme } from './theme.js';
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

const params = new URLSearchParams(location.search);
let dark = params.get('theme') === 'dark';
let before = params.get('mode') === 'before';
const requested = params.get('taste');
let taste: TasteName = requested && isTaste(requested) ? requested : 'ink-paper';
let knobs: TasteKnobs = { ...defaultKnobs[taste] };
function activeTheme(): CityTheme {
  return cityTheme(baseStyle.layers, {
    taste, dark, before,
    classes: knobs.classes, lineWidth: knobs.lineWidth, labelSize: knobs.labelSize, labelRanks: knobs.labels,
  });
}
let applied = activeTheme();
baseStyle.sky = applied.sky;
baseStyle.light = applied.light;
for (const [index, layer] of baseStyle.layers.entries()) {
  const defined = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, value]) => value != null));
  Object.assign(layer, { paint: defined(applied.layers[index]!.paint), layout: defined(applied.layers[index]!.layout) });
  const extrudedOpen = before || tastes[taste].stage.extrusion;
  if (layer.id === 'building') layer.maxzoom = extrudedOpen ? 14 : 24;
  if (layer.id === 'building-3d') layer.minzoom = extrudedOpen ? 14 : 24;
}
let ready = false;
let map: maplibregl.Map;
const placeInput = document.querySelector<HTMLInputElement>('#place')!;
placeInput.value = params.get('place') || '';
let sessionGranted = false;
let resolution = 0;
type Place = { center: [number, number]; name: string; query: string | null };
let view = { center: [-122.4024, 37.7947] as [number, number], zoom: 15.4, pitch: 57, bearing: -32, name: 'San Francisco' };
let pendingPlace: Place | undefined;
let statusTimer: ReturnType<typeof setTimeout> | undefined;
let placeError = false;
function showPlaceError(error: unknown) {
  clearTimeout(statusTimer);
  placeError = true;
  status.hidden = false;
  status.textContent = error instanceof Error ? error.message : 'Could not resolve place.';
  statusTimer = setTimeout(() => { placeError = false; status.hidden = true; }, 4000);
}
function applyPlace(place: Place) {
  view = { ...view, center: place.center, name: place.name };
  document.querySelector('.place-title')!.textContent = place.name;
  document.querySelector('#place-coords')!.textContent = `${Math.abs(place.center[1]).toFixed(4)}° ${place.center[1] < 0 ? 'S' : 'N'} / ${Math.abs(place.center[0]).toFixed(4)}° ${place.center[0] < 0 ? 'W' : 'E'}`;
  document.querySelector<HTMLElement>('.place-caption')!.hidden = false;
  document.querySelector('.map-shell')!.setAttribute('aria-label', `Interactive ${place.name} building map`);
  placeInput.value = place.query || place.name;
}
function updateUrl() {
  const url = new URL(location.href);
  url.search = params.toString();
  history.replaceState(null, '', url);
}
async function resolvePlace(source: URLSearchParams = params, live = false) {
  const request = ++resolution;
  try {
    let center: [number, number] = [-122.4024, 37.7947];
    let name = source.get('place')?.trim() || 'San Francisco';
    if (source.has('ll')) {
      const parts = source.get('ll')!.split(',');
      const values = parts.map(Number);
      if (parts.length !== 2 || parts.some(part => !part.trim()) || !values.every(Number.isFinite) || Math.abs(values[0]) > 180 || Math.abs(values[1]) > 90) throw new Error('Invalid coordinates.');
      center = [values[0], values[1]];
      if (!source.get('place')?.trim()) name = 'Selected place';
    } else if (source.has('place')) {
      const query = source.get('place')!.trim();
      const geocode = new URLSearchParams({ q: query });
      // Only an explicit ?lang= overrides script detection; do not forward <html lang>.
      const lang = source.get('lang')?.trim();
      if (lang) geocode.set('lang', lang.split(',')[0]!);
      const response = await fetch(`/api/geocode?${geocode}`);
      if (!response.ok) throw new Error(response.status === 404 ? 'Place not found.' : 'Could not resolve place. Try again.');
      const result = await response.json().catch(() => { throw new Error('Could not resolve place. Try again.'); });
      if (result.ok !== true || !Number.isFinite(result.lng) || !Number.isFinite(result.lat) || Math.abs(result.lng) > 180 || Math.abs(result.lat) > 90 || typeof result.name !== 'string') throw new Error('Could not resolve place.');
      center = [result.lng, result.lat]; name = result.name;
    }
    const number = (key: string, fallback: number, min: number, max: number) => {
      if (!params.has(key)) return fallback;
      const value = Number(params.get(key));
      if (!params.get(key)?.trim() || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}.`);
      return value;
    };
    const stage = tastes[taste].stage;
    const camera = {
      center,
      zoom: number('z', before ? 15.4 : stage.zoom, 0, 24),
      pitch: number('pitch', before ? 57 : stage.pitch, 0, 70),
      bearing: number('bearing', before ? -32 : stage.bearing, -360, 360),
    };
    view = { ...camera, name };
    if (request !== resolution) return;
    const place = { center, name, query: source.get('place')?.trim() || null };
    clearTimeout(statusTimer);
    placeError = false;
    status.hidden = true;
    if (live) {
      params.set('place', place.query || name);
      params.delete('ll');
      updateUrl();
    }
    if (!map) {
      applyPlace(place);
      startMap(camera);
    } else if (ready) {
      applyPlace(place);
      map.jumpTo({ center });
    } else {
      pendingPlace = place;
    }
  } catch (error) {
    if (request === resolution) showPlaceError(error);
  }
}
function choosePlace(value: string) {
  const query = value.trim();
  if (!query) return;
  if (!sessionGranted) {
    params.set('place', query);
    params.delete('ll');
    updateUrl();
    return;
  }
  void resolvePlace(new URLSearchParams({ place: query }), true);
}
document.querySelector('#place-control')!.addEventListener('submit', event => {
  event.preventDefault();
  choosePlace(placeInput.value);
});
document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(button => {
  button.addEventListener('click', () => choosePlace(button.dataset.place!));
});

function startMap(camera: { center: [number, number]; zoom: number; pitch: number; bearing: number }) {
  map = new maplibregl.Map({
    container: 'map', style: baseStyle,
    ...camera,
    fadeDuration: 0, renderWorldCopies: false, refreshExpiredTiles: false,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    // Keep edge antialiasing; the DPR cap bounds its framebuffer cost.
    maxPitch: 70, canvasContextAttributes: { antialias: true },
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.once('load', () => {
    ready = true;
    if (pendingPlace) {
      applyPlace(pendingPlace);
      map.jumpTo({ center: pendingPlace.center });
      pendingPlace = undefined;
    }
    updateStyle();
  });
  map.on('moveend', () => {
    const center = map.getCenter();
    view = { ...view, center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
  });
  map.on('error', () => {
    status.hidden = false;
    status.textContent = 'Map could not load. Check your connection and WebGL support.';
  });
  map.on('idle', () => { if (!placeError) status.hidden = true; });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pulse = (time: number) => {
    requestAnimationFrame(pulse);
    if (!ready || reduced || before || tastes[taste].stage.motion !== 'shoreline') return;
    if (!map.getLayer('maptaste-shoreline')) return;
    map.setPaintProperty('maptaste-shoreline', 'line-opacity', 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time / 1400)));
  };
  requestAnimationFrame(pulse);
}
function syncPlate() {
  const stage = tastes[taste].stage;
  const extruded = before || stage.extrusion;
  for (const layer of baseStyle.layers) {
    if (layer.id === 'building' && layer.type === 'fill') layer.maxzoom = extruded ? 14 : 24;
    if (layer.id === 'building-3d' && layer.type === 'fill-extrusion') layer.minzoom = extruded ? 14 : 24;
    if (layer.id === 'natural_earth' && layer.type === 'raster') layer.maxzoom = !before && stage.hillshade ? 9 : 7;
  }
  if (!map?.getLayer) return;
  if (map.getLayer('building')) map.setLayerZoomRange('building', 13, extruded ? 14 : 24);
  if (map.getLayer('building-3d')) map.setLayerZoomRange('building-3d', extruded ? 14 : 24, 24);
  if (map.getLayer('natural_earth')) map.setLayerZoomRange('natural_earth', 0, !before && stage.hillshade ? 9 : 7);
}
function frameCamera() {
  if (!ready) return;
  const stage = tastes[taste].stage;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  map.easeTo({
    zoom: before ? 15.4 : stage.zoom,
    pitch: before ? 57 : stage.pitch,
    bearing: before ? -32 : stage.bearing,
    duration: reduced ? 0 : 650,
  });
}
function updateStyle() {
  if (!ready) return;
  const next = activeTheme();
  for (const change of themeDelta(applied, next)) {
    if (change.kind === 'paint') map.setPaintProperty(change.id, change.key, change.value);
    else map.setLayoutProperty(change.id, change.key, change.value);
  }
  map.setSky(next.sky);
  map.setLight(next.light);
  syncPlate();
  applied = next;
}
const theme = document.querySelector<HTMLButtonElement>('#theme')!;
theme.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.textContent = dark ? 'Light' : 'Dark';
  theme.setAttribute('aria-pressed', String(dark));
  params.set('theme', dark ? 'dark' : 'light');
  updateUrl();
  updateStyle();
});
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
const scoreEl = document.querySelector<HTMLElement>('#score')!;
const mapCoverage = document.querySelector<HTMLElement>('#map-coverage')!;
const findingsEl = document.querySelector<HTMLOListElement>('#findings')!;
const styleInput = document.querySelector<HTMLTextAreaElement>('#style-json')!;
const specimenScore = document.querySelector<HTMLElement>('#specimen-score')!;
const specimenCoverage = document.querySelector<HTMLElement>('#specimen-coverage')!;
const specimenFindings = document.querySelector<HTMLOListElement>('#specimen-findings')!;
const specimenInput = document.querySelector<HTMLTextAreaElement>('#specimen-json')!;
const rampEl = document.querySelector<HTMLElement>('#ramp')!;
const specimenButtons = document.querySelectorAll<HTMLButtonElement>('[data-specimen]');
const gallery = document.querySelector<HTMLElement>('#gallery')!;
const cta = document.querySelector<HTMLElement>('#cta')!;
const studyTaste = document.querySelector<HTMLElement>('#study-taste');
const knobClasses = document.querySelector<HTMLInputElement>('#knob-classes')!;
const knobLabelSize = document.querySelector<HTMLInputElement>('#knob-label-size')!;
const knobLabels = document.querySelector<HTMLInputElement>('#knob-labels')!;
const knobLine = document.querySelector<HTMLInputElement>('#knob-line')!;
const outClasses = document.querySelector<HTMLOutputElement>('#out-classes')!;
const outLabelSize = document.querySelector<HTMLOutputElement>('#out-label-size')!;
const outLabels = document.querySelector<HTMLOutputElement>('#out-labels')!;
const outLine = document.querySelector<HTMLOutputElement>('#out-line')!;
function paintRamp(kind: 'rainbow' | 'taste' | null) {
  rampEl.replaceChildren();
  rampEl.hidden = kind === null;
  if (!kind) return;
  for (const color of tasteRamp(kind === 'rainbow' ? 'rainbow' : taste)) {
    const swatch = document.createElement('i');
    swatch.style.background = color;
    rampEl.append(swatch);
  }
}
function paintKnob(input: HTMLInputElement, output: HTMLOutputElement, value: number, cap: number | null) {
  const min = Number(input.min);
  const max = Number(input.max);
  const span = max - min || 1;
  const row = input.closest<HTMLElement>('.knob');
  const shown = Number(input.step) < 1 ? value.toFixed(1) : String(Math.round(value));
  if (input.value !== shown) input.value = shown;
  const current = Number(input.value);
  const over = cap != null && current > cap + 1e-6;
  input.style.setProperty('--pct', `${Math.min(100, Math.max(0, ((current - min) / span) * 100))}%`);
  input.style.setProperty('--fill', over ? 'var(--accent)' : 'var(--ink)');
  output.textContent = shown;
  if (cap != null && cap >= min && cap <= max) {
    row?.style.setProperty('--cap', `${((cap - min) / span) * 100}%`);
    row?.setAttribute('data-capped', '');
    row?.toggleAttribute('data-over', over);
  } else {
    row?.removeAttribute('data-capped');
    row?.removeAttribute('data-over');
  }
}
function syncChrome() {
  const rules = tastes[taste].composition;
  cta.textContent = `npx maptaste check style.json --taste ${taste}`;
  if (studyTaste) studyTaste.textContent = taste;
  markGallery(gallery, taste);
  const tasteButton = document.querySelector<HTMLButtonElement>('[data-specimen="taste"]');
  if (tasteButton) tasteButton.textContent = taste;
  paintKnob(knobClasses, outClasses, knobs.classes, rules.maxFillStops);
  paintKnob(knobLabelSize, outLabelSize, knobs.labelSize, null);
  paintKnob(knobLabels, outLabels, knobs.labels, rules.maxLabelLayers);
  paintKnob(knobLine, outLine, knobs.lineWidth, rules.maxLineWidth);
}
function layerSpan(source: string, index: number): [number, number] | null {
  const keyAt = source.search(/"layers"\s*:/);
  if (keyAt < 0) return null;
  const bracket = source.indexOf('[', keyAt);
  if (bracket < 0) return null;
  let depth = 0;
  let seen = -1;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = bracket + 1; i < source.length; i++) {
    const ch = source[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') {
      if (depth === 0 && ch === '{') { seen += 1; start = i; }
      depth += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0 && ch === '}' && seen === index) return [start, i + 1];
      if (depth < 0) return null;
    }
  }
  return null;
}

function reveal(input: HTMLTextAreaElement, path: string) {
  const layer = /layers\[(\d+)\]/.exec(path);
  const span = layer ? layerSpan(input.value, Number(layer[1])) : null;
  const at = span ? span[0] : input.value.indexOf(path.startsWith('metadata') ? '"metadata"' : '"layers"');
  if (at < 0) return;
  const end = span ? span[1] : at + (path.startsWith('metadata') ? '"metadata"' : '"layers"').length;
  input.focus();
  input.setSelectionRange(at, end);
  const key = path.split('.').pop() ?? '';
  const keyAt = key ? input.value.slice(at, end).indexOf(`"${key}"`) : -1;
  const focusAt = keyAt >= 0 ? at + keyAt : at;
  const line = input.value.slice(0, focusAt).split('\n').length;
  input.scrollTop = Math.max(0, (line - 3) * 16);
}

function renderFindings(list: HTMLOListElement, input: HTMLTextAreaElement, items: { id: string; severity: string; message: string; path?: string; evidence?: string; remedy?: string }[]) {
  list.replaceChildren();
  for (const finding of items) {
    const item = document.createElement('li');
    item.className = finding.severity;
    const top = document.createElement('div');
    if (finding.id) {
      const id = document.createElement('span');
      id.className = 'rule';
      id.textContent = finding.id;
      top.append(id);
    }
    const severity = document.createElement('span');
    severity.className = 'sev';
    severity.textContent = finding.severity;
    top.append(severity);
    const message = document.createElement('p');
    message.textContent = finding.message;
    item.append(top, message);
    if (finding.path) {
      const path = document.createElement('code');
      path.textContent = finding.path;
      item.append(path);
    }
    if (finding.evidence) {
      const evidence = document.createElement('code');
      evidence.textContent = finding.evidence;
      item.append(evidence);
    }
    if (finding.remedy) {
      const remedy = document.createElement('p');
      remedy.className = 'remedy';
      remedy.textContent = finding.remedy;
      item.append(remedy);
    }
    if (finding.path) {
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      const show = () => {
        list.querySelectorAll('[aria-current]').forEach(other => other.removeAttribute('aria-current'));
        item.setAttribute('aria-current', 'true');
        reveal(input, finding.path!);
      };
      item.addEventListener('click', show);
      item.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        show();
      });
    }
    list.append(item);
  }
}
function showResult(score: HTMLElement, coverage: HTMLElement, list: HTMLOListElement, input: HTMLTextAreaElement, parsed: unknown) {
  try {
    const result = check(parsed as StyleDoc, { taste });
    score.textContent = String(result.score);
    coverage.textContent = result.coverage.statement;
    renderFindings(list, input, result.findings);
  } catch (error) {
    score.textContent = '—';
    coverage.textContent = '';
    renderFindings(list, input, [{ id: '', severity: 'info', message: error instanceof Error ? error.message : 'Could not check style' }]);
  }
}
function runMapCheck() {
  const style = currentStyleDocument();
  styleInput.value = JSON.stringify(style, null, 2);
  showResult(scoreEl, mapCoverage, findingsEl, styleInput, style);
}
function runSpecimen() {
  let parsed: unknown;
  try { parsed = JSON.parse(specimenInput.value); }
  catch {
    specimenScore.textContent = '—';
    specimenCoverage.textContent = '';
    renderFindings(specimenFindings, specimenInput, [{ id: '', severity: 'info', message: 'Invalid JSON' }]);
    return;
  }
  showResult(specimenScore, specimenCoverage, specimenFindings, specimenInput, parsed);
}
function syncModeButtons() {
  modeButtons.forEach(control => control.setAttribute('aria-pressed', String((control.dataset.mode === 'before') === before)));
}
function setMode(nextBefore: boolean) {
  before = nextBefore;
  params.set('mode', before ? 'before' : 'after');
  updateUrl();
  syncModeButtons();
  syncPlate();
  updateStyle();
  frameCamera();
  runMapCheck();
}
function showSpecimen(kind: 'rainbow' | 'taste') {
  specimenButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.specimen === kind)));
  const doc = kind === 'rainbow' ? tasteSpecimen('rainbow') : tasteSpecimen(taste);
  specimenInput.value = JSON.stringify(doc, null, 2);
  paintRamp(kind);
  runSpecimen();
}
function selectTaste(id: TasteName) {
  taste = id;
  knobs = { ...defaultKnobs[id] };
  params.set('taste', id);
  syncChrome();
  setMode(false);
}
modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode === 'before')));
specimenButtons.forEach(button => button.addEventListener('click', () => showSpecimen(button.dataset.specimen === 'rainbow' ? 'rainbow' : 'taste')));
renderGallery(gallery, taste, id => {
  selectTaste(id);
  document.querySelector('#showcase')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
for (const input of [knobClasses, knobLabelSize, knobLabels, knobLine]) {
  input.addEventListener('input', () => {
    knobs = {
      classes: Number(knobClasses.value),
      labelSize: Number(knobLabelSize.value),
      labels: Number(knobLabels.value),
      lineWidth: Number(knobLine.value),
    };
    syncChrome();
    if (before) {
      before = false;
      params.set('mode', 'after');
      updateUrl();
      syncModeButtons();
    }
    syncPlate();
    updateStyle();
    runMapCheck();
  });
}
let checkTimer: ReturnType<typeof setTimeout> | undefined;
specimenInput.addEventListener('input', () => {
  specimenButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  paintRamp(null);
  clearTimeout(checkTimer);
  checkTimer = setTimeout(runSpecimen, 160);
});
function currentStyleDocument(): StyleSpecification {
  const theme = activeTheme();
  const style = structuredClone(baseStyle);
  style.sky = theme.sky;
  style.light = theme.light;
  const defined = (values: Record<string, unknown>) => Object.fromEntries(Object.entries(values).filter(([, value]) => value != null));
  for (const [index, layer] of style.layers.entries()) {
    layer.paint = defined(theme.layers[index]!.paint);
    layer.layout = defined(theme.layers[index]!.layout);
  }
  style.center = view.center;
  style.zoom = view.zoom;
  style.bearing = view.bearing;
  style.pitch = view.pitch;
  const metadata: Record<string, unknown> = {
    ...(typeof style.metadata === 'object' && style.metadata ? style.metadata as Record<string, unknown> : {}),
    'maptaste:place': view.name,
    'maptaste:taste': before ? 'rainbow' : taste,
    'maptaste:mode': before ? 'before' : 'after',
    'maptaste:theme': taste === 'night-ops' || (dark && !before) ? 'dark' : 'light',
  };
  if (!before) metadata['maptaste:themes'] = ['light', 'dark'];
  style.metadata = metadata;
  return style;
}
const copyButton = document.querySelector<HTMLButtonElement>('#copy-style')!;
let copyTimer: ReturnType<typeof setTimeout> | undefined;
copyButton.addEventListener('click', async () => {
  const text = JSON.stringify(currentStyleDocument(), null, 2);
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    try {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      fallback.setAttribute('readonly', '');
      document.body.append(fallback);
      fallback.select();
      copied = document.execCommand('copy');
      fallback.remove();
    } catch { copied = false; }
  }
  copyButton.textContent = copied ? 'Copied' : 'Copy failed';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copyButton.textContent = 'Copy style'; }, 1600);
});
const status = document.querySelector<HTMLElement>('#map-status')!;
const localDev = import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
async function beginSession() {
  let response: Response;
  try {
    response = await fetch('/api/session', { method: 'POST' });
  } catch {
    if (localDev) { sessionGranted = true; await resolvePlace(); return; }
    status.hidden = false;
    status.textContent = 'Could not connect. Check your connection and try again.';
    return;
  }
  if (localDev && response.status === 404) { sessionGranted = true; await resolvePlace(); return; }
  if (response.ok) {
    try {
      const session = await response.json();
      if (session.ok === true) { sessionGranted = true; await resolvePlace(); return; }
    } catch { /* A non-API response must not start the hosted map. */ }
  }
  status.hidden = false;
  status.textContent = response.status === 429
    ? 'Daily demo limit reached. Try again after UTC reset.'
    : 'Could not start the demo. Check your connection and try again.';
}
document.documentElement.dataset.theme = dark ? 'dark' : 'light';
theme.textContent = dark ? 'Light' : 'Dark';
theme.setAttribute('aria-pressed', String(dark));
syncModeButtons();
syncChrome();
setMode(before);
showSpecimen('taste');
void beginSession();
