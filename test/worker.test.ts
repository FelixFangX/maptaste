import { describe, expect, it } from 'vitest';
import worker, { type Env } from '../worker/index';
import { buckets } from '../worker/quota';

function setup(globalLimit = '2', ipLimit = '1') {
  const rows = new Map<string, { neurons: number; requests: number }>();
  const env: Env = {
    GLOBAL_DAILY_SESSIONS: globalLimit, IP_DAILY_SESSIONS: ipLimit, IP_REQUESTS_PER_MINUTE: '2',
    ASSETS: { fetch: async () => new Response('asset') },
    DB: { prepare(sql) { return { bind(...args) { return {
      async first<T>() {
        const key = String(args[0]);
        if (sql.startsWith('SELECT')) return (rows.get(key) ?? null) as T | null;
        const row = rows.get(key) ?? { neurons: 0, requests: 0 };
        row.requests++; rows.set(key, row); return row as T;
      },
      async run() {
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
  return { call };
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
