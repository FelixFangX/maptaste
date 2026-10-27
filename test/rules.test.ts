import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { check, score } from '../src/index.js';
const fixture=(name:string)=>JSON.parse(readFileSync(new URL(`./fixtures/${name}-style.json`,import.meta.url),'utf8'));
describe('taste rules',()=>{
 it('flags rainbow, contrast, dark mode and density',()=>{const r=check(fixture('bad'));expect(r.findings.map(f=>f.id)).toEqual(expect.arrayContaining(['MT001','MT002','MT003','MT004']));expect(r.score).toBeLessThan(100);});
 it('prefers restrained styles',()=>{const good=check(fixture('good'));expect(good.score).toBeGreaterThan(check(fixture('bad')).score);expect(good.findings).toEqual([]);});
 it('clamps score',()=>expect(score(Array.from({length:20},()=>({id:'x',severity:'error' as const,message:'x'})))).toBe(0));
 it('rejects non-object input',()=>expect(()=>check([] as never)).toThrow());
 it('uses a stricter cn density threshold',()=>{const s=fixture('bad');s.layers=s.layers.slice(0,9);s.layers.forEach((l:any)=>{if(l.layout)l.layout['text-size']=14;});expect(check(s,{pack:'global'}).findings.some(f=>f.id==='MT004')).toBe(false);expect(check(s,{pack:'cn'}).findings.some(f=>f.id==='MT004')).toBe(true);});
});
