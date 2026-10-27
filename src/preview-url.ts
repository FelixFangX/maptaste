export interface PreviewArgs {
  place?: string;
  ll?: string;
  zoom?: number;
  mode?: 'before' | 'after';
  theme?: 'light' | 'dark';
}

export function buildPreviewUrl(args: PreviewArgs) {
  const allowed = ['place', 'll', 'zoom', 'mode', 'theme'];
  if (Object.keys(args).some(key => !allowed.includes(key))) throw new Error('Unknown preview argument');
  if (args.place !== undefined && (typeof args.place !== 'string' || !args.place.trim() || args.place.trim().length > 80)) throw new Error('place must contain 1–80 characters');
  if (args.ll !== undefined && typeof args.ll !== 'string') throw new Error('ll must be lng,lat');
  if (!args.place && !args.ll) throw new Error('Provide place or ll');
  let center: [number, number] | null = null;
  if (args.ll !== undefined) {
    const parts = args.ll.split(',');
    const values = parts.map(Number);
    if (parts.length !== 2 || parts.some(part => !part.trim()) || !values.every(Number.isFinite) || Math.abs(values[0]) > 180 || Math.abs(values[1]) > 90) throw new Error('ll must be valid lng,lat');
    center = [values[0], values[1]];
  }
  const zoom = args.zoom ?? 15.4;
  if (typeof zoom !== 'number' || !Number.isFinite(zoom) || zoom < 0 || zoom > 24) throw new Error('Invalid zoom');
  if (args.mode !== undefined && !['before', 'after'].includes(args.mode)) throw new Error('Invalid mode');
  if (args.theme !== undefined && !['light', 'dark'].includes(args.theme)) throw new Error('Invalid theme');
  const url = new URL('https://maptaste.ledring.dev/');
  if (center) url.searchParams.set('ll', center.join(','));
  if (args.place) url.searchParams.set('place', args.place.trim());
  if (args.zoom !== undefined) url.searchParams.set('z', String(zoom));
  if (args.mode) url.searchParams.set('mode', args.mode);
  if (args.theme) url.searchParams.set('theme', args.theme);
  return { url: url.toString(), center, zoom, pitch: 57, bearing: -32,
    ...(args.place ? { name: args.place.trim() } : {}),
    how: 'Open the URL or embed; session quota still applies on first interactive load' };
}
