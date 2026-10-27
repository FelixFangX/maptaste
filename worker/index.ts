import { buckets, D1Store, quotaDecision, type D1Database } from './quota';
import { geocodeAcceptLanguage } from './geocode-lang';

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: D1Database;
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
      const q = url.searchParams.get('q')?.trim();
      if (!q || q.length > 120) return json({ error: 'invalid_query' }, 400);
      const requests = await store.increment(keys.minute, now.getTime());
      if (requests > Number(env.IP_REQUESTS_PER_MINUTE)) {
        return json({ error: 'rate_limited', retryAfter: keys.retryAfter }, 429, { 'Retry-After': String(keys.retryAfter) });
      }
      try {
        const acceptLanguage = geocodeAcceptLanguage(q, url.searchParams.get('lang'), request.headers.get('Accept-Language'));
        const upstream = new URL('https://nominatim.openstreetmap.org/search');
        upstream.search = new URLSearchParams({ format: 'jsonv2', limit: '1', q }).toString();
        const response = await fetch(upstream, { headers: {
          'User-Agent': 'maptaste.ledring.dev/0.1 (felix@ledring.dev)', 'Accept-Language': acceptLanguage,
        } });
        if (response.status === 404) return json({ error: 'not_found' }, 404);
        if (!response.ok) return json({ error: 'upstream_failed' }, 502);
        const results = await response.json() as { name?: string; display_name: string; lat: string; lon: string; boundingbox?: string[] }[];
        if (!Array.isArray(results)) throw new Error('Invalid geocoder response');
        const first = results[0];
        if (!first) return json({ error: 'not_found' }, 404);
        const lat = Number(first.lat), lng = Number(first.lon);
        if (!first.display_name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Invalid result');
        const short = first.display_name.split(',').slice(0, 2).map(part => part.trim()).join(', ');
        const named = typeof first.name === 'string' && first.name.trim() ? first.name.trim() : '';
        // Prefer local short name for proper nouns; keep city,country when that is clearer.
        const name = (named && named.length <= 40 ? (short.includes(named) ? short : named) : short) || first.display_name;
        const clipped = name.length <= 80 ? name : first.display_name.slice(0, 80);
        return json({ ok: true, name: clipped, lat, lng, lang: acceptLanguage.split(',')[0], ...(first.boundingbox ? { bbox: first.boundingbox.map(Number) } : {}) }, 200, { 'Cache-Control': 'public, max-age=86400' });
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
