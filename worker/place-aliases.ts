/**
 * Exact-match nicknames / meme names → canonical geocode query.
 * Only whole-query matches (trimmed); keeps Nominatim as the resolver.
 */
const ALIASES: Record<string, string> = {
  // Shanghai
  魔都: '上海',
  申城: '上海',
  魔幻都: '上海',
  // Beijing
  帝都: '北京',
  京城: '北京',
  // Guangzhou
  羊城: '广州',
  花城: '广州',
  穗城: '广州',
  // Shenzhen
  鹏城: '深圳',
  // Chengdu
  蓉城: '成都',
  // Chongqing
  雾都: '重庆',
  山城: '重庆',
  // Others (common literary / media nicknames)
  春城: '昆明',
  星城: '长沙',
  泉城: '济南',
  冰城: '哈尔滨',
  鹭岛: '厦门',
  榕城: '福州',
  甬城: '宁波',
  金陵: '南京',
  长安: '西安',
  姑苏: '苏州',
  杭城: '杭州',
  // English slang sometimes typed as-is
  'magic city': 'Shanghai',
  'the bund': '外滩',
};

export function expandPlaceAlias(q: string): { query: string; alias: string | null } {
  const trimmed = q.trim();
  if (!trimmed) return { query: q, alias: null };
  const key = trimmed.toLowerCase();
  const mapped = ALIASES[trimmed] ?? ALIASES[key];
  if (!mapped) return { query: trimmed, alias: null };
  return { query: mapped, alias: trimmed };
}

export function listPlaceAliases(): Record<string, string> {
  return { ...ALIASES };
}
