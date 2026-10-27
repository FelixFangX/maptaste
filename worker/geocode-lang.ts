/** Pick Nominatim Accept-Language: explicit lang, else script of q, else browser, else en. */
export function geocodeAcceptLanguage(q: string, lang: string | null, header: string | null): string {
  const explicit = lang?.trim().split(',')[0]?.trim();
  if (explicit && /^[A-Za-z]{2,3}(-[A-Za-z0-9]+)?$/.test(explicit)) {
    const base = explicit.toLowerCase();
    return base.startsWith('zh') ? 'zh,zh-CN;q=0.9,en;q=0.5' : `${explicit},en;q=0.5`;
  }
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(q)) return 'ja,en;q=0.5';
  if (/\p{Script=Hangul}/u.test(q)) return 'ko,en;q=0.5';
  if (/\p{Script=Han}/u.test(q)) return 'zh,zh-CN;q=0.9,ja;q=0.6,en;q=0.4';
  if (/\p{Script=Cyrillic}/u.test(q)) return 'ru,en;q=0.5';
  if (/\p{Script=Arabic}/u.test(q)) return 'ar,en;q=0.5';
  if (/\p{Script=Thai}/u.test(q)) return 'th,en;q=0.5';
  const fromHeader = header?.split(',')[0]?.trim();
  if (fromHeader && /^[A-Za-z]{2,3}(-[A-Za-z0-9]+)?$/.test(fromHeader)) {
    return fromHeader.toLowerCase().startsWith('zh') ? 'zh,zh-CN;q=0.9,en;q=0.5' : `${fromHeader},en;q=0.5`;
  }
  return 'en';
}
