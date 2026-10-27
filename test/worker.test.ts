import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../worker/index';
import { buckets } from '../worker/quota';

function setup(globalLimit = '2', ipLimit = '1') {
  const rows = new Map<string, { neurons: number; requests: number }>();
  const cache = new Map<string, { place: string; updated_at: number }>();
  const ai = vi.fn().mockResolvedValue({ response: '{"place":null}' });
  const env: Env = {
    AI: { run: ai }, GLOBAL_DAILY_AI_RESOLVES: '2', IP_DAILY_AI_RESOLVES: '1',
    GLOBAL_DAILY_SESSIONS: globalLimit, IP_DAILY_SESSIONS: ipLimit, IP_REQUESTS_PER_MINUTE: '2',
    ASSETS: { fetch: async () => new Response('asset') },
    DB: { prepare(sql) { return { bind(...args) { return {
      async first<T>() {
        const key = String(args[0]);
        if (sql.startsWith('SELECT place')) {
          const cached = cache.get(key);
          return (cached && cached.updated_at > Number(args[1]) ? cached : null) as T | null;
        }
        if (sql.startsWith('SELECT')) return (rows.get(key) ?? null) as T | null;
        const row = rows.get(key) ?? { neurons: 0, requests: 0 };
        row.requests++; rows.set(key, row); return row as T;
      },
      async run() {
        if (sql.startsWith('INSERT INTO place_resolve')) {
          cache.set(String(args[0]), { place: String(args[1]), updated_at: Number(args[2]) });
          return { meta: { changes: 1 } };
        }
        const [amount, , global, ip, , , gl, , , il] = args;
        const g = rows.get(String(global)) ?? { neurons: 0, requests: 0 };
        const i = rows.get(String(ip)) ?? { neurons: 0, requests: 0 };
        if (g.neurons + Number(amount) > Number(gl) || i.neurons + Number(amount) > Number(il)) return { meta: { changes: 0 } };
        g.neurons += Number(amount); i.neurons += Number(amount);
        rows.set(String(global), g); rows.set(String(ip), i);
        return { meta: { changes: 2 } };
      },
    }; } }; } },
  };
  const call = (path = '/api/session', cookie = '', ip = '192.0.2.1') => worker.fetch(new Request(`https://maptaste.ledring.dev${path}`, {
    method: path === '/api/session' ? 'POST' : 'GET', headers: { Cookie: cookie, 'CF-Connecting-IP': ip },
  }), env);
  return { call, ai, env, cache, rows };
}

describe('session quota worker', () => {
  it('serves assets and reports status without charging', async () => {
    const { call } = setup();
    expect(await (await call('/')).text()).toBe('asset');
    expect((await (await call('/api/status')).json()).quota.globalUsed).toBe(0);
  });
  it('reuses a current cookie even at quota and rejects stale cookies', async () => {
    const { call } = setup();
    const first = await call();
    const cookie = first.headers.get('Set-Cookie')!;
    expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax; Max-Age=7200');
    expect((await (await call('/api/session', cookie.split(';')[0])).json()).reused).toBe(true);
    const denied = await call('/api/session', 'mt_session=2000-01-01.old');
    expect(denied.status).toBe(429);
    expect((await denied.json()).scope).toBe('ip');
    expect((await (await call()).json()).error).toBe('rate_limited');
    expect((await (await call('/api/status')).json()).quota.globalUsed).toBe(1);
  });
  it('enforces the shared global cap across IPs', async () => {
    const { call } = setup('1', '20');
    await call();
    expect((await (await call('/api/session', '', '192.0.2.2')).json()).scope).toBe('global');
  });
  it('hashes IPs with the UTC day and resets at midnight', async () => {
    const keys = await buckets('192.0.2.1', new Date('2026-10-27T23:59:59Z'));
    expect(keys.ip).not.toContain('192.0.2.1');
    expect(keys.resetsAt).toBe('2026-10-28T00:00:00.000Z');
    expect(keys.retryAfter).toBe(1);
    expect((await buckets('192.0.2.1', new Date('2026-10-28T00:00:00Z'))).ip).not.toBe(keys.ip);
  });
});


describe('geocode', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('validates queries before fetching', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const { call } = setup();
    for (const path of ['/api/geocode', '/api/geocode?q=%20', `/api/geocode?q=${'x'.repeat(121)}`]) expect((await call(path)).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('maps and caches results, shares rate limits, and never charges sessions', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json([{ display_name: 'Tokyo, Japan, Asia', lat: '35.6812', lon: '139.7671', boundingbox: ['35', '36', '139', '140'] }]));
    vi.stubGlobal('fetch', fetcher);
    const { call } = setup();
    const response = await call('/api/geocode?q=%20Tokyo%20');
    expect(await response.json()).toEqual({ ok: true, resolvedVia: 'nominatim', name: 'Tokyo, Japan', lat: 35.6812, lng: 139.7671, lang: 'en', bbox: [35, 36, 139, 140] });
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    const [url, options] = fetcher.mock.calls[0];
    expect(url.searchParams.get('q')).toBe('Tokyo');
    expect(options.headers).toEqual({ 'User-Agent': 'maptaste.ledring.dev/0.1 (felix@ledring.dev)', 'Accept-Language': 'en' });
    expect((await (await call('/api/status')).json()).quota.globalUsed).toBe(0);
    expect((await call()).status).toBe(200);
    expect((await call('/api/geocode?q=Tokyo')).status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([['empty', 404], ['missing', 404], ['failure', 502], ['network', 502], ['malformed', 502]])('handles %s upstream responses', async (kind, code) => {
    vi.stubGlobal('fetch', kind === 'network' ? vi.fn().mockRejectedValue(new Error('offline')) : vi.fn().mockResolvedValue(kind === 'empty' ? Response.json([]) : kind === 'malformed' ? Response.json({}) : new Response('', { status: kind === 'missing' ? 404 : 503 })));
    const response = await setup().call('/api/geocode?q=Tokyo');
    expect(response.status).toBe(code);
    expect((await response.json()).error).toBe(code === 404 ? 'not_found' : 'upstream_failed');
  });
});


describe('AI place resolution', () => {
  afterEach(() => vi.unstubAllGlobals());
  const shanghai = { name: '上海', display_name: '上海, 中国', lat: '31.23', lon: '121.47' };
  it('resolves a nickname mismatch and reuses the cached expansion without charging AI', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: URL) => Response.json(url.searchParams.get('q') === '魔都' ? [{ ...shanghai, name: 'Other', display_name: 'Other' }] : [shanghai]));
    vi.stubGlobal('fetch', fetcher);
    const { call, ai } = setup();
    ai.mockResolvedValue({ response: '```json\n{"place":"上海"}\n```' });
    const result = await (await call('/api/geocode?q=魔都')).json();
    expect(result).toMatchObject({ resolvedVia: 'ai', resolvedAs: '上海', lat: 31.23 });
    expect(result).not.toHaveProperty('alias');
    expect((await call('/api/geocode?q=魔都')).status).toBe(200);
    expect(ai).toHaveBeenCalledTimes(1);
    expect(ai.mock.calls[0][0]).toBe('@cf/meta/llama-3.1-8b-instruct');
    expect(fetcher.mock.calls.map(([url]) => url.searchParams.get('q'))).toEqual(['魔都', '上海', '上海']);
  });
  it.each(['ai_global', 'ai_ip'])('rejects exhausted %s budgets before AI', async scope => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json([])));
    const { call, ai, env } = setup();
    if (scope === 'ai_global') env.GLOBAL_DAILY_AI_RESOLVES = '0';
    else env.IP_DAILY_AI_RESOLVES = '0';
    const response = await call('/api/geocode?q=魔都');
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ error: 'quota_exhausted', scope });
    expect(ai).not.toHaveBeenCalled();
  });
  it('charges unknown resolutions and rejects further attempts from that IP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json([])));
    const { call, ai } = setup();
    expect((await call('/api/geocode?q=魔都')).status).toBe(404);
    expect(await (await call('/api/geocode?q=帝都')).json()).toMatchObject({ scope: 'ai_ip' });
    expect(ai).toHaveBeenCalledTimes(1);
  });
  it('ignores expired cache entries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json([])));
    const { call, cache, ai } = setup();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('en|Tokyo'));
    const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
    cache.set(key, { place: 'Old', updated_at: Date.now() - 8 * 86400000 });
    expect((await call('/api/geocode?q=Tokyo')).status).toBe(404);
    expect(ai).toHaveBeenCalledTimes(1);
  });
});
