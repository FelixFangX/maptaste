import { execFileSync, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('returns correct CLI exit codes and JSON',()=>{
 execFileSync('pnpm',['build']);
 const run=(args:string[])=>spawnSync(process.execPath,['dist/cli.js',...args],{encoding:'utf8'});
 const bad=run(['check','test/fixtures/bad-style.json','--format','json']);expect(bad.status).toBe(1);expect(JSON.parse(bad.stdout).score).toBeLessThan(100);
 expect(run(['check','test/fixtures/good-style.json']).status).toBe(0);
 expect(run(['check','missing.json']).status).toBe(2);
 expect(run(['check','test/fixtures/good-style.json','--pack','invalid']).status).toBe(2);
});
