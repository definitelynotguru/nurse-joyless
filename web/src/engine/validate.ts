// Legality validation for parsed Showdown sets.
//
// One synchronous pipeline merging, in legacy script order:
//   app.js validateTeamAdvanced (row builder)
//   → validation-fixes.js patchValidationRows (scrubIssue)
//   → final-validation-hotfix.js cleanupRows (shouldDropIssue)
//   → submission-polish.js normalizeValidationRows (soft issues → warnings,
//     hardIssueCount / warningCount / validationState / validationReasoning).
//
// Final status values are the merged legacy ones: 'invalid' (lowercase, kept
// from app.js when hard issues survive) | 'WARNING' | 'VALID'.

import type { Stats, TeamMon, ValidationRow } from './types';
import { toId, TYPES } from './types';
import {
  abilityOk,
  canLearn,
  getSpecies,
  moveCategory,
  moveData,
  resolveMoveName,
  resolveSpeciesName,
  warmLearnset,
} from './dex';
import { TRUSTED_FALLBACK_LEARNSETS } from './data-extra';

/** Row shape produced by the merged validation pipeline. */
type Row = {
  species: string;
  item: string;
  issues: string[];
  warnings: string[];
  valid: string[];
  status: string;
  confidence?: string;
  hardIssueCount?: number;
  warningCount?: number;
  validationState?: string;
  validationReasoning?: string;
};

// Abilities trusted by final-validation-hotfix.js's TRUSTED_VALIDATION_SETS.
const TRUSTED_ABILITIES: Record<string, string[]> = {
  Mimikyu: ['Disguise'],
  Naganadel: ['Beast Boost'],
  Tyranitar: ['Sand Stream', 'Unnerve'],
  Excadrill: ['Sand Rush', 'Sand Force', 'Mold Breaker'],
  Buzzwole: ['Beast Boost'],
  Corviknight: ['Pressure', 'Unnerve', 'Mirror Armor'],
  Volcanion: ['Water Absorb'],
  'Deoxys-Speed': ['Pressure'],
  Kingambit: ['Defiant', 'Supreme Overlord', 'Pressure'],
  'Iron Valiant': ['Quark Drive'],
  'Iron Treads': ['Quark Drive'],
  'Landorus-Therian': ['Intimidate'],
  Pecharunt: ['Poison Puppeteer'],
};

const UNKNOWN_TERA = /^(unknown|none|n\/a|na|\?|\?\?\?)$/i;
const isUnknownTera = (v: unknown): boolean => UNKNOWN_TERA.test(String(v ?? '').trim());
const isStellar = (v: unknown): boolean => toId(v) === 'stellar';
const isRealType = (v: unknown): boolean => TYPES.includes(String(v ?? '').trim());

function canonicalSpecies(name: unknown): string {
  try {
    return resolveSpeciesName(name);
  } catch {
    return String(name ?? '');
  }
}

function canonicalMove(name: unknown): string {
  try {
    return resolveMoveName(name);
  } catch {
    return String(name ?? '');
  }
}

/** Pull the move name out of a learnset/unknown-move issue string. */
function issueMoveName(text: unknown): string {
  const raw = String(text ?? '').trim();
  const unknown = raw.match(/unknown move:\s*([^.;]+)/i);
  if (unknown) return unknown[1].trim();
  const prefixed = raw.match(/^([^:]{1,60}):\s*(?:learnset|move exists|learnset check)/i);
  if (prefixed) return prefixed[1].trim();
  return '';
}

function trustedMove(mon: Partial<TeamMon>, move: string): boolean {
  const species = canonicalSpecies(mon?.species);
  const moves = TRUSTED_FALLBACK_LEARNSETS[species] || [];
  return moves.map(toId).includes(toId(canonicalMove(move)));
}

function trustedAbility(mon: Partial<TeamMon>): boolean {
  const species = canonicalSpecies(mon?.species);
  const abilities = TRUSTED_ABILITIES[species];
  if (!abilities || !mon?.ability) return false;
  return abilities.map(toId).includes(toId(mon.ability));
}

/** Ability known via any loaded species data (fallback table or dex). */
function abilityKnown(mon: Partial<TeamMon>): boolean {
  try {
    const species = resolveSpeciesName(mon?.species);
    const abilities = getSpecies(species)?.abilities || {};
    return Object.values(abilities).some((a) => toId(a) === toId(mon?.ability));
  } catch {
    return false;
  }
}

// ----- validation-fixes.js: scrubIssue -----
function scrubIssue(message: unknown, mon: Partial<TeamMon>): string {
  const text = String(message ?? '');
  const lower = text.toLowerCase();
  const move = issueMoveName(text);

  if (move && trustedMove(mon, move) && /learnset/i.test(text)) return '';
  const unknownMove = lower.match(/unknown move:\s*([^.;]+)/i);
  if (unknownMove && moveData(unknownMove[1].trim())) return '';
  if (/unknown or unsupported form/.test(lower) && getSpecies(mon?.species)) return '';
  if (/ability data unavailable/.test(lower) && abilityKnown(mon)) return '';
  if (/invalid tera type/.test(lower) && /^(stellar|unknown|none|n\/a|na|\?|\?\?\?)$/i.test(String(mon?.tera ?? '').trim())) return '';
  return text;
}

// ----- final-validation-hotfix.js: shouldDropIssue -----
function shouldDropIssue(issue: unknown, mon: Partial<TeamMon>): boolean {
  const text = String(issue ?? '');
  const lower = text.toLowerCase();
  const move = issueMoveName(text);

  if (/unknown move/i.test(text) && move && moveData(move)) return true;
  if (move && trustedMove(mon, move) && /learnset|move exists|legality is unconfirmed/i.test(text)) return true;
  if (/unknown or unsupported form/.test(lower)) {
    try {
      if (getSpecies(mon?.species)) return true;
    } catch { /* keep */ }
  }
  if (/ability data unavailable/.test(lower) && trustedAbility(mon)) return true;
  if (/invalid tera type/.test(lower) && (isUnknownTera(mon?.tera) || isStellar(mon?.tera))) return true;
  return false;
}

// ----- submission-polish.js: soft/hard classification -----
const SOFT_VALIDATION_PATTERNS = [
  /learnset data not loaded/i,
  /learnset check unavailable/i,
  /move exists but legality is unconfirmed/i,
  /manual verification recommended/i,
  /ability data unavailable/i,
  /unknown or unsupported form/i,
];

const HARD_VALIDATION_PATTERNS = [
  /unknown move:/i,
  /ev total/i,
  /ev stat/i,
  /assault vest/i,
  /invalid ability/i,
  /invalid tera type/i,
];

function isSoftValidationIssue(issue: unknown, mon: Partial<TeamMon>): boolean {
  const text = String(issue ?? '');
  if (/invalid tera type/i.test(text) && (isUnknownTera(mon?.tera) || isStellar(mon?.tera))) return true;
  if (HARD_VALIDATION_PATTERNS.some((p) => p.test(text))) return false;
  return SOFT_VALIDATION_PATTERNS.some((p) => p.test(text));
}

function buildValidationReasoning(hardCount: number, warningCount: number): { state: string; note: string } {
  if (hardCount > 0) {
    return {
      state: 'hard-blocker',
      note: 'Hard validation blockers remain, so this set still needs a direct legality fix.',
    };
  }
  if (warningCount > 0) {
    return {
      state: 'warning-only',
      note: 'Only soft validation warnings remain. The set is still usable, but some checks rely on fallback or manual confirmation.',
    };
  }
  return {
    state: 'clean',
    note: 'No validation blockers remain in the current offline pass.',
  };
}

const HARD_KEYS = ['hardIssues', 'hard', 'errors', 'issues'] as const;
const ISSUE_KEYS = [...HARD_KEYS, 'warnings'] as const;

type LooseRow = Row & Record<string, unknown>;

// ----- validation-fixes.js: patchValidationRows -----
function patchValidationRows(rows: LooseRow[], sourceTeam: Partial<TeamMon>[]): LooseRow[] {
  return rows.map((row, idx) => {
    const mon = (row.mon || row.set || row.pokemon || sourceTeam[idx] || {}) as Partial<TeamMon>;
    ISSUE_KEYS.forEach((key) => {
      if (Array.isArray(row[key])) row[key] = (row[key] as string[]).map((i) => scrubIssue(i, mon)).filter(Boolean);
    });
    const hardCount = HARD_KEYS.reduce((n, key) => n + (Array.isArray(row[key]) ? (row[key] as string[]).length : 0), 0);
    const warningCount = Array.isArray(row.warnings) ? row.warnings.length : 0;
    if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
    if (String(row.confidence || '').toLowerCase() === 'low' && hardCount === 0) {
      row.confidence = warningCount ? 'medium' : 'high';
    }
    return row;
  });
}

// ----- final-validation-hotfix.js: cleanupRows -----
function cleanupRows(rows: LooseRow[], sourceTeam: Partial<TeamMon>[]): LooseRow[] {
  return rows.map((row, index) => {
    const mon = (row.mon || row.set || row.pokemon || sourceTeam[index] || {}) as Partial<TeamMon>;
    ISSUE_KEYS.forEach((key) => {
      if (Array.isArray(row[key])) row[key] = (row[key] as string[]).filter((i) => !shouldDropIssue(i, mon));
    });
    const hardCount = HARD_KEYS.reduce((sum, key) => sum + (Array.isArray(row[key]) ? (row[key] as string[]).length : 0), 0);
    const warningCount = Array.isArray(row.warnings) ? row.warnings.length : 0;
    if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
    if (hardCount === 0 && String(row.confidence || '').toLowerCase() === 'low') {
      row.confidence = warningCount ? 'medium' : 'high';
    }
    return row;
  });
}

// ----- submission-polish.js: normalizeValidationRows -----
function normalizeValidationRows(rows: LooseRow[], sourceTeam: Partial<TeamMon>[]): LooseRow[] {
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return row;
    const mon = (row.mon || row.set || row.pokemon || sourceTeam[index] || {}) as Partial<TeamMon>;
    const warnings: string[] = Array.isArray(row.warnings) ? [...row.warnings] : [];
    HARD_KEYS.forEach((key) => {
      if (!Array.isArray(row[key])) return;
      const kept: string[] = [];
      (row[key] as string[]).forEach((issue) => {
        if (isSoftValidationIssue(issue, mon)) warnings.push(issue);
        else kept.push(issue);
      });
      row[key] = kept;
    });
    row.warnings = [...new Set(warnings.filter(Boolean))];
    const hardCount = HARD_KEYS.reduce((sum, key) => sum + (Array.isArray(row[key]) ? (row[key] as string[]).length : 0), 0);
    const warningCount = row.warnings.length;
    const reasoning = buildValidationReasoning(hardCount, warningCount);
    row.hardIssueCount = hardCount;
    row.warningCount = warningCount;
    row.validationState = reasoning.state;
    row.validationReasoning = reasoning.note;
    if (hardCount === 0) row.status = warningCount ? 'WARNING' : 'VALID';
    if (hardCount === 0 && String(row.confidence || '').toLowerCase() === 'low') {
      row.confidence = warningCount ? 'medium' : 'high';
    }
    return row;
  });
}

// ----- app.js validateTeamAdvanced (base row builder) -----
function baseValidationRows(t: Partial<TeamMon>[]): LooseRow[] {
  const out: LooseRow[] = [];
  (t || []).forEach((mon) => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const valid: string[] = [];

    const species = getSpecies(mon.species);
    if (species) valid.push('species exists');
    else warnings.push('unknown or unsupported form; validation limited');

    const evs: Partial<Stats> = mon.evs || {};
    const evTotal = Object.values(evs).reduce((a, b) => a + (+b || 0), 0);
    if (evTotal > 510) issues.push(`EV total ${evTotal} exceeds 510`);
    else valid.push(`EV total ${evTotal}/510`);
    Object.entries(evs).forEach(([k, v]) => {
      if (+v > 252) issues.push(`${k.toUpperCase()} EV ${v} exceeds 252`);
    });

    const moves = mon.moves || [];
    if (moves.length > 4) issues.push('more than four moves');
    else valid.push('move count legal');

    if (mon.item === 'Assault Vest' && moves.some((m) => moveCategory(m) === 'Status')) {
      issues.push('Assault Vest cannot be used with status moves');
    }
    if (/^Choice /.test(mon.item || '') && moves.filter((m) => moveCategory(m) === 'Status').length >= 2) {
      warnings.push('Choice item with multiple status/setup moves is usually strategically inconsistent');
    }
    if (mon.item === 'Focus Sash' && (evs.hp || 0) >= 200) {
      warnings.push('Focus Sash + heavy HP investment is suspicious; bulky items may fit better');
    }

    // Level + tera legality (the patch chain already knows how to scrub the
    // "invalid tera type" wording for Stellar / unknown tokens).
    const level = mon.level ?? 100;
    if (!(level >= 1 && level <= 100)) issues.push(`invalid level: ${level}`);
    const tera = String(mon.tera || '').trim();
    if (tera && !isRealType(tera)) issues.push(`invalid tera type: ${tera}`);

    const ab = abilityOk(mon);
    if (!ab.ok) issues.push(ab.reason);
    else if (ab.confidence === 'unknown') warnings.push(ab.reason);
    else if (ab.confidence !== 'none') valid.push(ab.reason);

    moves.forEach((m) => {
      const md = moveData(m);
      if (!md) {
        issues.push(`unknown move: ${m}`);
        return;
      }
      const can = canLearn(mon.species || '', m) as unknown;
      if (can === false) warnings.push(`${m}: learnset check suggests illegality; verify manually`);
      else if (can === true) valid.push(`${m}: learnset OK`);
      else if (can && (can as { known?: boolean; can?: boolean }).known === true && (can as { can?: boolean }).can === false)
        warnings.push(`${m}: learnset check suggests illegality; verify manually`);
      else if (can && (can as { known?: boolean; can?: boolean }).known === true && (can as { can?: boolean }).can === true)
        valid.push(`${m}: learnset OK`);
      else warnings.push(`${m}: learnset data not loaded; move exists but legality is unconfirmed`);
    });

    out.push({
      species: mon.species || 'Unknown',
      item: mon.item || 'None',
      issues,
      warnings,
      valid,
      // 'low' seed so the submission-polish stage resolves the confidence ladder
      // (hard-blocker stays low, warning-only → medium, clean → high).
      confidence: 'low',
      status: issues.length ? 'invalid' : warnings.length ? 'warning' : 'valid',
    } as LooseRow);
  });
  return out;
}

/**
 * Full merged validation pass. Synchronous — the legacy wrappers tolerated a
 * thenable inner result, but the ported base builder is always sync.
 */
export function validateTeamAdvanced(t: Partial<TeamMon>[]): ValidationRow[] {
  const sourceTeam = t || [];
  let rows = baseValidationRows(sourceTeam);
  rows = patchValidationRows(rows, sourceTeam);
  rows = cleanupRows(rows, sourceTeam);
  rows = normalizeValidationRows(rows, sourceTeam);
  return rows as ValidationRow[];
}

/** Simple legality pass — same pipeline as validateTeamAdvanced. */
export function validateTeam(t: Partial<TeamMon>[]): ValidationRow[] {
  return validateTeamAdvanced(t);
}

/**
 * Optional async pre-warm: fetch learnset data for each species so a later
 * synchronous validateTeamAdvanced call upgrades 'learnset data not loaded'
 * warnings into definitive OK/illegal checks.
 */
export async function warmTeamLearnsets(t: Partial<TeamMon>[]): Promise<void> {
  await Promise.all((t || []).map((mon) => warmLearnset(mon?.species || '').catch(() => undefined)));
}
