export type Severity = 'error' | 'warn' | 'info';
export interface Finding { id: string; severity: Severity; message: string; path?: string }
export type StyleDoc = Record<string, unknown>;
export interface CheckOptions { pack?: 'global' | 'cn' }
export interface CheckResult { findings: Finding[]; score: number; summary: string }
export interface Rule { id: string; severity: Severity; packs: readonly ('global' | 'cn')[]; check(style: StyleDoc, settings: CheckOptions): Finding[] }
