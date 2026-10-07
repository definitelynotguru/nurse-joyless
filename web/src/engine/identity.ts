// STUB — replaced by the port-identity agent. Exists so sibling modules compile.
import type { AnalysisResult, IdentityResult, MatchupRow, SynergyResult, TeamMon, TeamProfile } from './types';
export function profileTeam(_t: TeamMon[], _a: AnalysisResult): TeamProfile {
  throw new Error('identity.profileTeam not yet implemented');
}
export function detectIdentities(_t: TeamMon[], _a: AnalysisResult, _p: TeamProfile): IdentityResult {
  throw new Error('identity.detectIdentities not yet implemented');
}
export function evaluateSynergy(_t: TeamMon[], _a: AnalysisResult, _p: TeamProfile, _identity?: IdentityResult): SynergyResult {
  throw new Error('identity.evaluateSynergy not yet implemented');
}
export function evaluateMatchups(_t: TeamMon[], _a: AnalysisResult, _p: TeamProfile, _identity?: IdentityResult): MatchupRow[] { return []; }
export function isDefensiveAnchor(_m: TeamMon): boolean { return false; }
export function isDefensiveWall(_m: TeamMon): boolean { return false; }
