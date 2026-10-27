import { buckets, D1Store, quotaDecision, type D1Database } from './quota';
import { geocodeAcceptLanguage } from './geocode-lang';
import { aiExpandPlace, isNicknameLike, looksLikeMatch, type Ai } from './resolve-place';

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: D1Database;
  AI: Ai;
  GLOBAL_DAILY_AI_RESOLVES: string;
  IP_DAILY_AI_RESOLVES: string;
  GLOBAL_DAILY_SESSIONS: string;
  IP_DAILY_SESSIONS: string;
  IP_REQUESTS_PER_MINUTE: string;
}


function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (path !== '/api/status' && path !== '/api/session' && path !== '/api/geocode') return json({ error: 'not_found' }, 404);
    const method = path === '/api/session' ? 'POST' : 'GET';
    if (request.method !== method) return json({ error: 'method_not_allowed' }, 405, { Allow: method });

    const now = new Date();
    const keys = await buckets(request.headers.get('CF-Connecting-IP') ?? 'unknown', now);
    const store = new D1Store(env.DB);
    if (path === '/api/geocode') {
      const raw = url.searchParams.get('q')?.trim();
      if (!raw || raw.length > 120) return json({ error: 'invalid_query' }, 400);
      const requests = await store.increment(keys.minute, now.getTime());
      if (requests > Number(env.IP_REQUESTS_PER_MINUTE)) {
        return json({ error: 'rate_limited', retryAfter: keys.retryAfter }, 429, { 'Retry-After': String(keys.retryAfter) });
      }
      try {
        const acceptLanguage = geocodeAcceptLanguage(raw, url.searchParams.get('lang'), request.headers.get('Accept-Language'));
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${acceptLanguage}|${raw}`));
        const cacheKey = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
        const cached = await env.DB.prepare('SELECT place FROM place_resolve WHERE key = ? AND updated_at > ?')
          .bind(cacheKey, now.getTime() - 7 * 86400000).first<{ place: string }>();
        async function nominatim(q: string) {
          const upstream = new URL('https://nominatim.openstreetmap.org/search');
          upstream.search = new URLSearchParams({ format: 'jsonv2', limit: '1', q }).toString();
          const response = await fetch(upstream, { headers: {
            'User-Agent': 'maptaste.ledring.dev/0.1 (felix@ledring.dev)', 'Accept-Language': acceptLanguage,
          } });
          if (response.status === 404) return undefined;
          if (!response.ok) throw new Error('Geocoder failed');
          const results = await response.json() as { name?: string; display_name: string; lat: string; lon: string; boundingbox?: string[] }[];
          if (!Array.isArray(results)) throw new Error('Invalid geocoder response');
          return results[0];
        }
        let expanded: string | null = cached?.place ?? null;
        let first = expanded ? await nominatim(expanded) : undefined;
        // Meme/nickname queries always go through Workers AI — Nominatim alone misreads them.
        if (!cached && !expanded) {
          const nickname = isNicknameLike(raw);
          if (!nickname) {
            first = await nominatim(raw);
          }
          if (nickname || !first || !looksLikeMatch(raw, first?.name, first?.display_name)) {
            const globalBucket = `gai:${keys.day}`;
            const ipBucket = `aip:${keys.day}:${keys.ip.split(':').at(-1)}`;
            const globalLimit = Number(env.GLOBAL_DAILY_AI_RESOLVES);
            const ipLimit = Number(env.IP_DAILY_AI_RESOLVES);
            if (!await store.reserve(globalBucket, ipBucket, 1, globalLimit, ipLimit, now.getTime())) {
              const globalUsed = await store.used(globalBucket);
              return json({ error: 'quota_exhausted', scope: globalUsed + 1 > globalLimit ? 'ai_global' : 'ai_ip', resetsAt: keys.resetsAt }, 429);
            }
            expanded = await aiExpandPlace(env.AI, raw, acceptLanguage);
            if (!expanded) return json({ error: 'not_found' }, 404);
            first = await nominatim(expanded);
          }
        }
        if (!first) return json({ error: 'not_found' }, 404);
        const lat = Number(first.lat), lng = Number(first.lon);
        if (!first.display_name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Invalid result');
        if (expanded && !cached) await env.DB.prepare('INSERT INTO place_resolve(key, place, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET place = excluded.place, updated_at = excluded.updated_at')
          .bind(cacheKey, expanded, now.getTime()).run();
        const clean = (value: string) => value.split(';')[0]!.split(',').map(part => part.trim()).filter(Boolean);
        const short = clean(first.display_name).slice(0, 2).join(', ');
        const named = typeof first.name === 'string' ? first.name.trim().split(';')[0]!.trim() : '';
        // Prefer local short name for proper nouns; keep city,country when that is clearer.
        const name = (named && named.length <= 40 ? (short.includes(named) ? short : named) : short) || named || first.display_name;
        const clipped = name.length <= 80 ? name : clean(first.display_name).slice(0, 2).join(', ').slice(0, 80);
        return json({ ok: true, name: clipped, lat, lng, lang: acceptLanguage.split(',')[0], ...(expanded ? { resolvedVia: 'ai', resolvedAs: expanded } : { resolvedVia: 'nominatim' }), ...(first.boundingbox ? { bbox: first.boundingbox.map(Number) } : {}) }, 200, { 'Cache-Control': 'public, max-age=3600' });
      } catch { return json({ error: 'upstream_failed' }, 502); }
    }
    const globalLimit = Number(env.GLOBAL_DAILY_SESSIONS);
    const ipLimit = Number(env.IP_DAILY_SESSIONS);
    async function quota() {
      const [globalUsed, ipUsed] = await Promise.all([store.used(keys.global), store.used(keys.ip)]);
      return {
        day: keys.day, globalLimit, globalUsed, globalRemaining: Math.max(0, globalLimit - globalUsed),
        ipLimit, ipUsed, ipRemaining: Math.max(0, ipLimit - ipUsed),
        exhausted: quotaDecision(globalUsed, ipUsed, 1, globalLimit, ipLimit) !== null,
        resetsAt: keys.resetsAt,
      };
    }
    if (path === '/api/status') return json({ quota: await quota() });
    const session = (request.headers.get('Cookie') ?? '').split(';')
      .map(cookie => cookie.trim()).find(cookie => cookie.startsWith('mt_session='))?.slice('mt_session='.length);
    // V1 deliberately uses a day prefix rather than a signed session secret.
    if (session?.startsWith(`${keys.day}.`)) return json({ ok: true, reused: true, quota: await quota() });

    const requests = await store.increment(keys.minute, now.getTime());
    if (quotaDecision(0, 0, 0, Infinity, Infinity, requests, Number(env.IP_REQUESTS_PER_MINUTE)) === 'rate_limited') {
      return json({ error: 'rate_limited', retryAfter: keys.retryAfter }, 429, { 'Retry-After': String(keys.retryAfter) });
    }
    if (!await store.reserve(keys.global, keys.ip, 1, globalLimit, ipLimit, now.getTime())) {
      const current = await quota();
      const scope = quotaDecision(current.globalUsed, current.ipUsed, 1, globalLimit, ipLimit);
      return json({ error: 'quota_exhausted', scope, resetsAt: keys.resetsAt }, 429);
    }
    return json({ ok: true, reused: false, quota: await quota() }, 200, {
      'Set-Cookie': `mt_session=${keys.day}.${crypto.randomUUID()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200`,
    });
  },
};
