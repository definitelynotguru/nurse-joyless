// STUB — replaced by the port-identity agent. Exists so sibling modules compile.
import type { AnalysisResult, TeamMon } from './types';
export function analyze(_t: TeamMon[]): AnalysisResult {
  throw new Error('analysis.analyze not yet implemented');
}
export function teamSignals(_t: TeamMon[], _a: AnalysisResult): unknown { return {}; }
export function riskList(_t: TeamMon[], _a: AnalysisResult): string[] { return []; }
export function scoreGroupSummary(_r: unknown): string { return ''; }
export function verdict(_issue: number): string { return ''; }
