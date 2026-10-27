#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { check } from './engine.js';
async function main() {
 const [command,file,...args]=process.argv.slice(2);
 if(command==='--help'||command==='-h') { console.log('Usage: maptaste check <file.json> [--format json|text] [--pack global|cn]'); return; }
 if(command!=='check'||!file||file.startsWith('--')) throw new Error('Usage: maptaste check <file.json> [--format json|text] [--pack global|cn]');
 let format='text',pack: 'global'|'cn'='global';
 for(let i=0;i<args.length;i+=2) {
 const key=args[i],value=args[i+1];
 if(key==='--format'&&(value==='json'||value==='text')) format=value;
 else if(key==='--pack'&&(value==='global'||value==='cn')) pack=value;
 else throw new Error(`Invalid option: ${key} ${value??''}`);
 }
 const result=check(JSON.parse(await readFile(file,'utf8')),{pack});
 console.log(format==='json'?JSON.stringify(result,null,2):[...result.findings.map(f=>`${f.severity.toUpperCase()} ${f.id} ${f.path??''}: ${f.message}`),`Score: ${result.score}/100 — ${result.summary}`].join('\n'));
 process.exitCode=result.findings.some(f=>f.severity==='error')?1:0;
}
main().catch((e: unknown)=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=2;});
