import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { expect, it } from 'vitest';

it('answers check_taste over MCP stdio', async () => {
  execFileSync('pnpm', ['build']);
  const child = spawn(process.execPath, ['dist/cli.js', 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = createInterface({ input: child.stdout! });
  const pending = new Map<number, (message: { result?: { content?: { text?: string }[] }; error?: unknown }) => void>();
  lines.on('line', line => {
    const message = JSON.parse(line) as { id?: number; result?: { content?: { text?: string }[] }; error?: unknown };
    if (typeof message.id === 'number') pending.get(message.id)?.(message);
  });
  const call = (id: number, body: unknown) => new Promise<typeof body>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no response ${id}`)), 8000);
    pending.set(id, message => { clearTimeout(timer); resolve(message); });
    child.stdin!.write(`${JSON.stringify(body)}\n`);
  });
  await call(1, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'maptaste-test', version: '0' } } });
  child.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  const response = await call(2, {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'check_taste', arguments: { taste: 'ink-paper', style: { version: 8, layers: [{ id: 'values', type: 'fill', paint: { 'fill-color': 'hsl(0, 100%, 50%)' } }] } } },
  }) as { result?: { isError?: boolean; content?: { text?: string }[] } };
  child.kill();
  expect(response.result?.isError).not.toBe(true);
  const body = JSON.parse(response.result?.content?.[0]?.text ?? '{}') as { findings: { id: string; evidence?: string }[]; score: number; coverage: { statement: string; unresolved: number; blockingErrors: number } };
  expect(body.findings.some(finding => finding.id === 'MT001')).toBe(false);
  expect(body.findings.some(finding => finding.id === 'MT014')).toBe(true);
  expect(body.score).toBeLessThan(100);
  expect(body.coverage.blockingErrors).toBe(0);
  expect(body.coverage.unresolved).toBeGreaterThan(0);
  expect(body.coverage.statement).toContain('Not a MapLibre style validation.');
}, 20_000);
