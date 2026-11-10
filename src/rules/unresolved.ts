import type { Finding, Rule } from '../types.js';
import { readPaint, type PaintRead } from './read.js';
import { layers, object, painted } from './utils.js';

const colorPaint: Record<string, readonly string[]> = {
  background: ['background-color'],
  fill: ['fill-color'],
  line: ['line-color'],
  symbol: ['text-color', 'text-halo-color'],
  'fill-extrusion': ['fill-extrusion-color'],
};
const numberPaint: Record<string, readonly string[]> = {
  background: ['background-opacity'],
  fill: ['fill-opacity'],
  line: ['line-width', 'line-opacity'],
  symbol: ['text-halo-width'],
};

function mistyped(expect: 'color' | 'number', read: PaintRead): string | undefined {
  if (read.state === 'unknown') return read.reason ?? 'unresolved';
  if (read.state !== 'known') return;
  if (expect === 'color' && read.colors.length === 0) return 'not a supported color';
  if (expect === 'number' && (read.numbers.length === 0 || read.colors.length > 0)) return 'not a number';
  return;
}

export const unresolved: Rule = { id: 'MT014', severity: 'info', packs: ['global', 'cn'], check(style) {
  const findings: Finding[] = [];
  const list = layers(style);
  const paintedGround = list.findIndex(layer => layer.type === 'background' && painted(layer));
  const anyGround = list.findIndex(layer => layer.type === 'background');
  if (paintedGround < 0 && anyGround < 0) {
    findings.push({
      id: 'MT014', severity: 'info', path: 'layers',
      message: 'No background layer. Ground luminance is not in this style, so the score does not prove the ground.',
      evidence: 'no background layer',
      remedy: 'Add a background layer with a background-color.',
    });
  } else if (paintedGround < 0) {
    findings.push({
      id: 'MT014', severity: 'info', path: `layers[${anyGround}].layout.visibility`,
      message: 'The background layer is not painted, so this score does not prove the ground.',
      evidence: 'visibility is none',
      remedy: 'Paint the background layer, or add another background layer that is visible.',
    });
  }
  list.forEach((layer, index) => {
    if (!painted(layer)) return;
    const type = typeof layer.type === 'string' ? layer.type : '';
    const paint = object(layer.paint);
    const layout = object(layer.layout);
    const look = (bag: Record<string, unknown>, where: 'paint' | 'layout', key: string, expect: 'color' | 'number') => {
      if (!(key in bag)) return;
      const reason = mistyped(expect, readPaint(bag[key]));
      if (!reason) return;
      findings.push({
        id: 'MT014', severity: 'info', path: `layers[${index}].${where}.${key}`,
        message: 'maptaste cannot read this value, so this score does not prove it.',
        evidence: reason,
        remedy: expect === 'color'
          ? 'Use a hex, rgb(), or rgba() color, or a step/interpolate whose outputs are those colors.'
          : 'Use a number, or a step/interpolate whose stops and outputs are numbers.',
      });
    };
    for (const key of colorPaint[type] ?? []) look(paint, 'paint', key, 'color');
    for (const key of numberPaint[type] ?? []) look(paint, 'paint', key, 'number');
    if (type === 'symbol') look(layout, 'layout', 'text-size', 'number');
  });
  return findings;
} };
