// Reasoning report orchestration — port of the final v35 app.js pipeline:
//   v35ActiveReport (app.js:2359) + teamReasoner (:2365) + buildReasoningReport
//   (:2423) + verdict / scoreGroupSummary / scoreDisplayName /
//   buildMarkdownReport (:2086-2117).
// Identity/scoring internals live in './identity' and './analysis'; this module
// is the glue that folds them into one report object plus its markdown export.

import type {
  AnalysisResult,
  IdentityResult,
  MatchupRow,
  ReasoningReport,
  SynergyResult,
  TeamMon,
  TeamProfile,
} from './types';
import { labelize } from './types';
import { types } from './dex';
import { analyze } from './analysis';
import { detectIdentities, evaluateMatchups, evaluateSynergy, profileTeam } from './identity';
import { validateTeamAdvanced } from './validate';
import {
  diversifySuggestions,
  needsForReport,
  suggestAdditions,
  swapOptionsFor,
  type SmogonData,
  type SuggestReport,
} from './suggest';
import { METAGAME_NOTES } from './data-content';

export interface ReasoningOptions {
  /** Pre-fetched Smogon data ({sets, analyses, stats}); omitted = offline lane ranking. */
  smogon?: SmogonData;
}

// ---------------------------------------------------------------------------
// Score semantics helpers (app.js scoreDisplayName / scoreGroupSummary / verdict)

export function scoreDisplayName(key: string): string {
  return (
    ({
      typeSynergy: 'Type Synergy',
      roleCompression: 'Role Quality / Compression',
      offensiveCoverage: 'Offensive Coverage',
      defensiveBackbone: 'Defensive Backbone',
      fieldControl: 'Field Control',
      speedControl: 'Speed Control',
      winReliability: 'Win Condition Reliability',
    }) as Record<string, string>
  )[key] || labelize(key);
}

export function scoreGroupSummary(r: ReasoningReport | null | undefined) {
  const s = (r?.synergy?.scores || {}) as Record<string, number>;
  const m = r?.matchups || [];
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + (+b || 0), 0) / (arr.length || 1));
  const matchupAvg = avg(m.map((x) => x.score));
  const structuralQuality = avg([
    s.typeSynergy,
    s.roleCompression,
    s.offensiveCoverage,
    s.defensiveBackbone,
    s.fieldControl,
    s.speedControl,
    s.winReliability,
  ]);
  const battleReliability = avg([s.winReliability, s.defensiveBackbone, s.fieldControl, s.speedControl, matchupAvg]);
  return {
    identityConfidence: r?.identity?.primary?.score || 0,
    structuralQuality,
    battleReliability,
    matchupAverage: matchupAvg,
  };
}

export function verdict(r: ReasoningReport): string {
  const p = r.identity?.primary?.name || '';
  const g = scoreGroupSummary(r);
  const issues = (r.synergy?.issues || []).slice(0, 2).map((x) => x.title).join(' + ');
  const caution = `Identity confidence is ${g.identityConfidence}/100, structural quality is ${g.structuralQuality}/100, and battle reliability is ${g.battleReliability}/100.`;
  if (p.includes('Hazard'))
    return `This is hazard-centric only if it can deny removal and abuse switches. ${caution} Next medicine: ${issues || 'tighten removal denial and chip loops'}.`;
  if (p.includes('Balance'))
    return `This is trying to be balance, not automatically a perfect team. ${caution} Next medicine: ${issues || 'reduce overload and protect the win path'}.`;
  if (p.includes('Dragon')) return `This is Dragon pressure with a siren on it. ${caution} Patch Fairy/Ice/Dragon counterplay before trusting it.`;
  if (p.includes('Sun Room')) return `This is Sun Room: create sun, flip speed with Trick Room, and cash out quickly. ${caution}`;
  if (p.includes('Trick Room')) return `This is speed inversion. ${caution} Protect setters and avoid wasting Room turns.`;
  if (p.includes('Stall')) return `This is low-tempo attrition only if offensive pressure stays minimal. ${caution}`;
  return `The team has a readable plan. ${caution} Patch the weakest matchup before calling it healthy.`;
}

// ---------------------------------------------------------------------------
// Report assembly (app.js v35ActiveReport / teamReasoner / buildReasoningReport)

/** Base report: identity + synergy + matchups + validation + diagnosis + profile. */
export function v35ActiveReport(t: TeamMon[], a: AnalysisResult | null | undefined): ReasoningReport | null {
  if (!t.length || !a) return null;
  const p = profileTeam(t, a);
  const identity = detectIdentities(t, a, p);
  const synergy = evaluateSynergy(t, a, p);
  const matchups = evaluateMatchups(t, a, p, identity);
  const validation = validateTeamAdvanced(t);
  const base = {
    generatedAt: new Date().toISOString(),
    team: t.map((mon) => ({
      species: mon.species,
      item: mon.item,
      ability: mon.ability,
      tera: mon.tera,
      nature: mon.nature,
      evs: mon.evs,
      ivs: mon.ivs,
      moves: mon.moves,
      types: types(mon),
    })),
    identity,
    synergy,
    matchups,
    validation,
    diagnosis: {
      status: a.status,
      topWeaknesses: a.rows.slice(0, 6),
      missingRoles: a.missing,
      redundancy: a.red,
    },
    profile: p,
  };
  return base as unknown as ReasoningReport;
}

/** Lightweight reasoner — report + suggestion pool without markdown shaping. */
export function teamReasoner(t: TeamMon[], a: AnalysisResult | null | undefined = analyze(t)): ReasoningReport {
  const base = v35ActiveReport(t, a);
  if (!base) {
    return { profile: null, identity: null, synergy: null, matchups: [], suggestions: [] } as unknown as ReasoningReport;
  }
  const suggestions = suggestAdditions(t, a as AnalysisResult, base.profile as TeamProfile, base.identity as IdentityResult, base.synergy as SynergyResult, base.matchups as MatchupRow[]).map((s) => ({
    ...s,
    swapOptions: swapOptionsFor(s, base as SuggestReport),
  }));
  return {
    ...base,
    suggestions: suggestions.slice(0, 6),
    suggestionPool: suggestions.slice(0, 18),
    needs: needsForReport(base as SuggestReport),
  } as unknown as ReasoningReport;
}

/**
 * Full reasoning report — v35 buildReasoningReport (app.js:2423). Pass
 * `opts.smogon` (from SmogonProvider.load / a cached snapshot) to rank the
 * suggestion pool against live set data instead of the offline lane tables.
 */
export function buildReasoningReport(t: TeamMon[], a: AnalysisResult | null | undefined = analyze(t), opts: ReasoningOptions = {}): ReasoningReport | null {
  const base = v35ActiveReport(t, a);
  if (!base) return null;
  const pool = (opts.smogon
    ? diversifySuggestions(base as SuggestReport, opts.smogon)
    : suggestAdditions(t, a as AnalysisResult, base.profile as TeamProfile, base.identity as IdentityResult, base.synergy as SynergyResult, base.matchups as MatchupRow[])
  ).map((s) => ({ ...s, swapOptions: swapOptionsFor(s, base as SuggestReport) }));
  const report = base as unknown as SuggestReport;
  report.suggestionPool = pool.slice(0, 18) as unknown as ReasoningReport['suggestions'];
  report.suggestions = (report.suggestionPool || []).slice(0, 6);
  report.suggestionSource = opts.smogon?.sets
    ? 'Smogon OU sets/stats + V3.5 lane ranking'
    : 'V3.5 lane-diverse local metagame brain';
  report.needs = needsForReport(report);
  return base;
}

// ---------------------------------------------------------------------------
// Markdown export (app.js buildMarkdownReport, section-for-section).

export function buildMarkdownReport(r: ReasoningReport | null | undefined): string {
  if (!r) return '# Nurse Joyless Report\n\nNo analysis available.';
  const meanings = (METAGAME_NOTES.scoreMeanings || {}) as Record<string, string>;
  const g = scoreGroupSummary(r);
  const fc = r.synergy?.fieldControl || ({} as NonNullable<SynergyResult['fieldControl']>);
  const teamBlock = (r.team || [])
    .map(
      (p) =>
        `${p.species} @ ${p.item || 'No Item'}\nAbility: ${p.ability || 'Unknown'}\nTera Type: ${p.tera || 'Unknown'}\nEVs: ${
          Object.entries(p.evs || {})
            .filter(([, v]) => v)
            .map(([k, v]) => `${v} ${k.toUpperCase()}`)
            .join(' / ') || 'None'
        }\n${p.nature || 'Hardy'} Nature\n${(p.moves || []).map((m) => `- ${m}`).join('\n')}`,
    )
    .join('\n\n');
  const idRows = (r.identity ? [r.identity.primary, ...(r.identity.secondary || [])] : [])
    .map((x) => `| ${x.name} | ${x.score}/100 | Structural identity confidence, not win rate | ${x.plan} | ${x.evidence.join('; ') || '—'} |`)
    .join('\n');
  const scoreRows = Object.entries(r.synergy?.scores || {})
    .map(([k, v]) => `| ${scoreDisplayName(k)} | ${v}/100 | ${meanings[k] || 'Structural score.'} | ${v >= 70 ? 'Strong' : v >= 45 ? 'Mixed / matchup-dependent' : 'Weak or unstable'} |`)
    .join('\n');
  const typeRows = (r.diagnosis?.topWeaknesses || [])
    .map((w) => `| ${w.tp} | ${w.weak} | ${w.res} | ${w.imm} | ${w.sev.toUpperCase()} |`)
    .join('\n');
  const issues = (r.synergy?.issues || []).map((i) => `- **${i.title}** (${i.severity}): ${i.detail}`).join('\n') || '- No major structural issues detected.';
  const profile = r.profile || ({} as TeamProfile);
  const monNotes = (r.team || [])
    .map(
      (p) => `### ${p.species}\n- Item: ${p.item || 'None'}\n- Typing: ${(p.types || []).join('/')}\n- Main role read: ${
        profile.defensiveAnchors?.includes(p.species)
          ? 'defensive anchor'
          : profile.wallbreakers?.includes(p.species)
            ? 'breaker / win pressure'
            : profile.pivot?.includes(p.species)
              ? 'pivot / tempo tool'
              : 'role compression'
      }\n- Overload note: ${
        (r.synergy?.roleQualityOverloads || profile.overloaded || []).includes(p.species)
          ? 'Overloaded or matchup-overworked; avoid asking it to solve too many jobs.'
          : 'No major overload flag.'
      }`,
    )
    .join('\n\n');
  const suggestions = (r.suggestions || [])
    .map(
      (s) =>
        `### ${s.species} — ${s.score}/100 fit\nSource: ${s.source || r.suggestionSource || 'local metagame fallback'}\n${
          (s.why || []).map((w) => `- ${w}`).join('\n') || '- Improves structure.'
        }\n${s.swapOptions?.[0] ? `- Suggested replacement target: ${s.swapOptions[0].species}` : ''}\n\n\`\`\`showdown\n${s.set || 'Set unavailable'}\n\`\`\``,
    )
    .join('\n\n');
  return `# Nurse Joyless V3.5 Team Report

Generated: ${r.generatedAt}
Format: SV OU-style modern singles MVP
Data Mode: ${r.suggestionSource || 'local metagame brain'}

> **Score note:** Identity Confidence means “how strongly the team resembles an archetype.” Structural Quality and Battle Reliability are separate. None of these numbers are ladder win-rate predictions.

## 1. Team Import

\`\`\`showdown
${teamBlock}
\`\`\`

## 2. Executive Verdict

**Primary Identity:** ${r.identity?.primary?.name || 'Unknown'}
**Identity Confidence:** ${g.identityConfidence}/100
**Structural Quality:** ${g.structuralQuality}/100
**Battle Reliability:** ${g.battleReliability}/100
**Execution Risk:** ${(r.synergy?.issues?.length || 0) >= 4 ? 'High' : (r.synergy?.issues?.length || 0) >= 2 ? 'Medium' : 'Low'}

${verdict(r)}

## 3. Identity Analysis

| Candidate | Score | What the score means | Plan | Evidence |
|---|---:|---|---|---|
${idRows}

## 4. Scoreboard

| Score | Value | What it measures | Read |
|---|---:|---|---|
${scoreRows}

## 5. Field Control Breakdown

| Subscore | Value | Evidence |
|---|---:|---|
| Hazard Setting | ${fc.hazardSetting ?? '—'}/100 | Hazard setters and layer access. |
| Hazard Removal | ${fc.hazardRemoval ?? '—'}/100 | Defog, Rapid Spin, Court Change, Magic Bounce, and Boots support. |
| Removal Denial | ${fc.removalDenial ?? '—'}/100 | Gholdengo / Good as Gold, Ghost spinblockers, Magic Bounce, Taunt pressure. |
| Chip Abuse | ${fc.chipAbuse ?? '—'}/100 | Knock Off, Salt Cure, phazing, status, hazards, forced switches. |
| Pivot Abuse | ${fc.pivotAbuse ?? '—'}/100 | U-turn, Volt Switch, Flip Turn, Parting Shot, Chilly Reception. |
| Setter Overload Risk | ${fc.setterOverload ? 'High' : 'Low'} | ${fc.setterOverload || 0} hazard slot(s) are also overloaded into other jobs. |

## 6. Structural Findings

${issues}

## 7. Type Triage

| Type | Weak | Resist | Immune | Severity |
|---|---:|---:|---:|---|
${typeRows}

## 8. Matchup Matrix

| Matchup | Score | Read | Dependency / Advice |
|---|---:|---|---|
${(r.matchups || []).map((m) => `| ${m.name} | ${m.score}/100 | ${m.reason} | ${m.advice} |`).join('\n')}

## 9. Pokémon-by-Pokémon Notes

${monNotes}

## 10. Suggested Additions

${suggestions}

## 11. Validation

| Pokémon | Status | Hard Issues | Warnings | Confidence |
|---|---|---|---|---|
${(r.validation || []).map((v) => `| ${v.species} | ${v.status.toUpperCase()} | ${v.issues.join('; ') || 'None'} | ${v.warnings.join('; ') || 'None'} | ${v.warnings.length ? 'Medium/Low' : 'High'} |`).join('\n')}
`;
}
