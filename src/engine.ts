import type { Coverage, Finding, StyleDoc, CheckOptions, CheckResult } from './types.js';
import { rules } from './rules/index.js';
import { resolveTaste } from './tastes.js';

export function score(findings: Finding[]): number { return Math.max(0,100-findings.reduce((n,f)=>n+({error:10,warn:3,info:1}[f.severity]),0)); }
export function summarize(findings: Finding[]): string { return `${findings.filter(f=>f.severity==='error').length} errors, ${findings.filter(f=>f.severity==='warn').length} warnings, ${findings.filter(f=>f.severity==='info').length} info`; }
export function coverage(findings: Finding[]): Coverage {
  const blockingErrors = findings.filter(finding => finding.severity === 'error').length;
  const unresolved = findings.filter(finding => finding.id === 'MT014').length;
  const errors = blockingErrors === 0 ? 'No blocking taste errors.' : `Blocking taste errors: ${blockingErrors}.`;
  const unread = unresolved === 0 ? 'Unresolved values: 0.' : `Unresolved values: ${unresolved}. The score does not cover them.`;
  return { blockingErrors, unresolved, statement: `${errors} ${unread} Not a MapLibre style validation.` };
}
export function check(style: StyleDoc, options: CheckOptions = {}): CheckResult {
 if(!style||typeof style!=='object'||Array.isArray(style)) throw new TypeError('Style must be a JSON object');
 const taste = resolveTaste(options);
 const settings = { ...options, taste };
 const findings = rules.filter(rule => !settings.pack || rule.packs.includes(settings.pack)).flatMap(rule => rule.check(style, settings));
 return { findings, score: score(findings), summary: summarize(findings), taste, coverage: coverage(findings) };
}
