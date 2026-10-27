import { expect, it } from 'vitest';
import { isNicknameLike, looksLikeMatch } from '../worker/resolve-place';

it.each(['魔都', '帝都', '某某某城', '某某某某岛', 'Gotham', 'nyc'])('recognizes nickname-like %s', q => {
  expect(isNicknameLike(q)).toBe(true);
});
it.each(['123 Main St', '12Broadway', 'Magic City', 'abcdefghijklmnop', '这是一个很长的地方名字', ''])('does not classify %s as a nickname', q => {
  expect(isNicknameLike(q)).toBe(false);
});
it('matches names ignoring case and whitespace', () => {
  expect(looksLikeMatch(' New York ', 'NEW   YORK', '')).toBe(true);
  expect(looksLikeMatch('上海', '', '上海 市, 中国')).toBe(true);
  expect(looksLikeMatch('魔都', '上海', '上海, 中国')).toBe(false);
  expect(looksLikeMatch('', '', '')).toBe(false);
});
