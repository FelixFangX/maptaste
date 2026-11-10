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
/** Taste score context. This is not a MapLibre specification result. */
export interface Coverage {
  blockingErrors: number;
  /** MT014 findings. Those values are outside the subset this checker reads. */
  unresolved: number;
  statement: string;
}
export interface CheckResult { findings: Finding[]; score: number; summary: string; taste: TasteName; coverage: Coverage }
export interface Rule { id: string; severity: Severity; packs: readonly PackName[]; check(style: StyleDoc, settings: CheckOptions): Finding[] }
