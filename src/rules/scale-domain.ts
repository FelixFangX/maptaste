import type { Finding, Rule } from '../types.js';
import { readPaint, type PaintRead } from './read.js';
import { layers, object, painted, shown } from './utils.js';

const watched: { where: 'paint' | 'layout'; types: readonly string[]; keys: readonly string[] }[] = [
  { where: 'paint', types: ['background', 'fill', 'fill-extrusion', 'line', 'symbol'], keys: ['background-color', 'background-opacity', 'fill-color', 'fill-extrusion-color', 'fill-opacity', 'line-color', 'line-width', 'line-opacity', 'text-color', 'text-halo-color', 'text-halo-width'] },
  { where: 'layout', types: ['symbol'], keys: ['text-size'] },
];

function rangeProblem(key: string, values: readonly number[]): string | undefined {
  const nonNegative = key === 'line-width' || key === 'text-size' || key === 'text-halo-width';
  const unit = key.endsWith('opacity');
  for (const value of values) {
    if (nonNegative && value < 0) return `${shown(value)} is below 0`;
    if (unit && (value < 0 || value > 1)) return `${shown(value)} is outside 0–1`;
  }
  return;
}

function domainEvidence(read: PaintRead): string | undefined {
  const stops = read.stops;
  if (!read.domain || !stops) return;
  if (read.domain === 'short') return `${stops.length} interpolate stop${stops.length === 1 ? '' : 's'}`;
  for (let i = 1; i < stops.length; i++) {
    if (stops[i] === stops[i - 1]) return `duplicate stop ${shown(stops[i]!)}`;
    if (!(stops[i]! > stops[i - 1]!)) return `stop ${shown(stops[i]!)} follows ${shown(stops[i - 1]!)}`;
  }
  return read.domain;
}

export const scaleDomain: Rule = { id: 'MT015', severity: 'warn', packs: ['global', 'cn'], check(style) {
  const findings: Finding[] = [];
  layers(style).forEach((layer, index) => {
    if (!painted(layer)) return;
    const type = typeof layer.type === 'string' ? layer.type : '';
    for (const group of watched) {
      if (!group.types.includes(type)) continue;
      const bag = group.where === 'paint' ? object(layer.paint) : object(layer.layout);
      for (const key of group.keys) {
        if (!(key in bag)) continue;
        const read = readPaint(bag[key]);
        if (read.state === 'absent') continue;
        const path = `layers[${index}].${group.where}.${key}`;
        const domain = domainEvidence(read);
        if (domain && read.domain) {
          findings.push({
            id: 'MT015', severity: 'warn', path,
            message: read.domain === 'short'
              ? 'interpolate needs at least two stops.'
              : 'Stops must increase. 0 and negative breaks are valid; duplicates and reversals are not.',
            evidence: domain,
            remedy: read.domain === 'short'
              ? 'Add a second numeric stop and output.'
              : 'Reorder the stops so each number is greater than the one before it.',
          });
        }
        if (read.state !== 'known') continue;
        const range = rangeProblem(key, read.numbers);
        if (!range) continue;
        findings.push({
          id: 'MT015', severity: 'warn', path,
          message: `${key} is outside the range MapLibre will paint.`,
          evidence: range,
          remedy: key.endsWith('opacity') ? 'Use an opacity from 0 to 1. 0 is transparent and is not the same as omitting the property.' : `Use a ${key} of 0 or more. 0 is legal; a missing value is the spec default, not 0.`,
        });
      }
    }
  });
  return findings;
} };
