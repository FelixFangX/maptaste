import { expect, it } from 'vitest';
import { expandPlaceAlias } from '../worker/place-aliases';

it('maps common meme nicknames to canonical cities', () => {
  expect(expandPlaceAlias('魔都')).toEqual({ query: '上海', alias: '魔都' });
  expect(expandPlaceAlias('帝都')).toEqual({ query: '北京', alias: '帝都' });
  expect(expandPlaceAlias('鹏城')).toEqual({ query: '深圳', alias: '鹏城' });
  expect(expandPlaceAlias('蓉城')).toEqual({ query: '成都', alias: '蓉城' });
  expect(expandPlaceAlias('Magic City')).toEqual({ query: 'Shanghai', alias: 'Magic City' });
});

it('leaves unknown queries unchanged', () => {
  expect(expandPlaceAlias('上海')).toEqual({ query: '上海', alias: null });
  expect(expandPlaceAlias('北上广')).toEqual({ query: '北上广', alias: null });
});
