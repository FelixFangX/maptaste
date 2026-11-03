import type { Finding, StyleDoc, CheckOptions, CheckResult } from './types.js';
import { rules } from './rules/index.js';
import { resolveTaste } from './tastes.js';

export function score(findings: Finding[]): number { return Math.max(0,100-findings.reduce((n,f)=>n+({error:10,warn:3,info:1}[f.severity]),0)); }
export function summarize(findings: Finding[]): string { return `${findings.filter(f=>f.severity==='error').length} errors, ${findings.filter(f=>f.severity==='warn').length} warnings, ${findings.filter(f=>f.severity==='info').length} info`; }
export function check(style: StyleDoc, options: CheckOptions = {}): CheckResult {
 if(!style||typeof style!=='object'||Array.isArray(style)) throw new TypeError('Style must be a JSON object');
 const taste = resolveTaste(options);
 const settings = { ...options, taste };
 const findings = rules.filter(rule => !settings.pack || rule.packs.includes(settings.pack)).flatMap(rule => rule.check(style, settings));
 return { findings, score: score(findings), summary: summarize(findings), taste };
}
