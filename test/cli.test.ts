import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('returns correct CLI exit codes and JSON', async () => {
 execFileSync('pnpm',['build']);
 const pkg = JSON.parse(readFileSync('package.json','utf8')) as { version: string; bin: Record<string, string>; scripts: { prepublishOnly: string } };
 expect(pkg.version).toBe('0.0.1');
 expect(pkg.bin).toEqual({ maptaste: 'dist/cli.js', 'maptaste-mcp': 'dist/mcp/server.js' });
 expect(pkg.scripts.prepublishOnly).toMatch(/build/);
 for (const file of Object.values(pkg.bin)) {
  expect(readFileSync(file, 'utf8').startsWith('#!/usr/bin/env node')).toBe(true);
  expect(spawnSync(process.execPath, ['--check', file]).status).toBe(0);
 }
 const run=(args:string[])=>spawnSync(process.execPath,['dist/cli.js',...args],{encoding:'utf8'});
 const bad=run(['check','test/fixtures/bad-style.json','--format','json']);expect(bad.status).toBe(1);expect(JSON.parse(bad.stdout).score).toBeLessThan(100);
 expect(run(['check','test/fixtures/good-style.json']).status).toBe(0);
 expect(run(['check','missing.json']).status).toBe(2);
 expect(run(['check','test/fixtures/good-style.json','--pack','invalid']).status).toBe(2);
 expect(run(['mcp','--extra']).status).toBe(2);
 const mcp = spawn(process.execPath, ['dist/cli.js', 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });
 let stderr = '';
 mcp.stderr?.on('data', chunk => { stderr += String(chunk); });
 await new Promise(resolve => setTimeout(resolve, 500));
 expect(mcp.exitCode, stderr).toBeNull();
 mcp.kill();
});
