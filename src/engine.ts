import type { Finding, StyleDoc, CheckOptions, CheckResult } from './types.js';
import { rules } from './rules/index.js';
export function score(findings: Finding[]): number { return Math.max(0,100-findings.reduce((n,f)=>n+({error:10,warn:3,info:1}[f.severity]),0)); }
export function summarize(findings: Finding[]): string { return `${findings.filter(f=>f.severity==='error').length} errors, ${findings.filter(f=>f.severity==='warn').length} warnings, ${findings.filter(f=>f.severity==='info').length} info`; }
export function check(style: StyleDoc, options: CheckOptions = {}): CheckResult {
 if(!style||typeof style!=='object'||Array.isArray(style)) throw new TypeError('Style must be a JSON object');
 if(options.pack && options.pack!=='global' && options.pack!=='cn') throw new TypeError('Unknown pack');
 const settings={...options,pack:options.pack??'global'};
 const findings=rules.filter(r=>r.packs.includes(settings.pack)).flatMap(r=>r.check(style,settings));
 return {findings,score:score(findings),summary:summarize(findings)};
}
