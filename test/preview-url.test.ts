import { describe, expect, it } from 'vitest';
import { buildPreviewUrl } from '../src/preview-url';

describe('preview URL', () => {
  it('leaves named places for browser geocoding', () => {
    const result = buildPreviewUrl({ place: 'Tokyo' });
    expect(result.url).toBe('https://maptaste.ledring.dev/?place=Tokyo');
    expect(result.center).toBeNull();
    expect(result.zoom).toBe(15.4);
  });
  it('preserves MapLibre order and safely encodes captions and appearance', () => {
    const result = buildPreviewUrl({ ll: '139.7671,35.6812', place: 'Tokyo & Japan', zoom: 16, mode: 'before', theme: 'dark' });
    const url = new URL(result.url);
    expect(result.center).toEqual([139.7671, 35.6812]);
    expect(url.searchParams.get('place')).toBe('Tokyo & Japan');
    expect(url.searchParams.get('ll')).toBe('139.7671,35.6812');
    expect(url.searchParams.get('z')).toBe('16');
    expect(url.searchParams.get('mode')).toBe('before');
    expect(url.searchParams.get('theme')).toBe('dark');
  });
  it.each([{}, { ll: '181,0' }, { ll: ',0' }, { ll: '0,91' }, { ll: 'NaN,0' }, { place: ' ' }, { place: 'Tokyo', zoom: Infinity }])('rejects invalid input %j', args => {
    expect(() => buildPreviewUrl(args)).toThrow();
  });
});
