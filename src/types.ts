export type Severity = 'error' | 'warn' | 'info';
export type PackName = 'global' | 'cn';
export type TasteName = 'ink-paper' | 'night-ops' | 'civic' | 'editorial' | 'cn-metro' | 'terrain-quiet';
export interface Finding {
  id: string;
  severity: Severity;
  message: string;
  path?: string;
  /** What the style document actually contained. Omitted when the message already states it. */
  evidence?: string;
  /** One edit that addresses this finding. Omitted when the message is the edit. */
  remedy?: string;
}
export type StyleDoc = Record<string, unknown>;
export interface CheckOptions { pack?: PackName; taste?: TasteName }
export interface CheckResult { findings: Finding[]; score: number; summary: string; taste: TasteName }
export interface Rule { id: string; severity: Severity; packs: readonly PackName[]; check(style: StyleDoc, settings: CheckOptions): Finding[] }
