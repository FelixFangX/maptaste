import { buckets, D1Store, quotaDecision, type D1Database } from './quota';

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
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (path !== '/api/status' && path !== '/api/session') return json({ error: 'not_found' }, 404);
    const method = path === '/api/status' ? 'GET' : 'POST';
    if (request.method !== method) return json({ error: 'method_not_allowed' }, 405, { Allow: method });

    const now = new Date();
    const keys = await buckets(request.headers.get('CF-Connecting-IP') ?? 'unknown', now);
    const store = new D1Store(env.DB);
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
