import { expect, it } from 'vitest';
import { geocodeAcceptLanguage } from '../worker/geocode-lang';

it('uses Chinese for Han script queries', () => {
  expect(geocodeAcceptLanguage('上海', null, 'en-US')).toMatch(/^zh/);
  expect(geocodeAcceptLanguage('外滩', null, null)).toMatch(/^zh/);
});

it('uses Japanese for kana', () => {
  expect(geocodeAcceptLanguage('東京タワー', null, 'en')).toMatch(/^ja/);
});

it('honors explicit lang over script', () => {
  expect(geocodeAcceptLanguage('Shanghai', 'zh', 'en')).toMatch(/^zh/);
  expect(geocodeAcceptLanguage('上海', 'en', null)).toMatch(/^en/);
});

it('falls back to browser then en', () => {
  expect(geocodeAcceptLanguage('Paris', null, 'fr-FR,fr;q=0.9')).toMatch(/^fr/);
  expect(geocodeAcceptLanguage('Paris', null, null)).toBe('en');
});
