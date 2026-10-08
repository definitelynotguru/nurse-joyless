// Port of test-v35-legacy-and-suggestions.js (suggestion-lane parts — the
// identity/weather assertions live in identity.spec.ts territory), the
// validateTeam/suggestAdditions/buildMarkdownReport blocks of test-smoke.js,
// plus needsForReport/swapOptionsFor/SmogonProvider coverage.
//
// Report-level paths (teamReasoner, buildReasoningReport) go through mocked
// './analysis' + './identity' contracts since those modules are another
// agent's deliverable in this workflow.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTeam } from '../src/engine/team';
import { id } from '../src/engine/dex';
import {
  SMOGON_FALLBACK_SETS,
  diversifySuggestions,
  fetchSmogonSets,
  mergeSuggestSets,
  needsForReport,
  suggestAdditions,
  swapOptionsFor,
  type SuggestReport,
} from '../src/engine/suggest';
import { buildMarkdownReport, buildReasoningReport, teamReasoner } from '../src/engine/report';
import { SUGGEST_SETS } from '../src/engine/data-sets';

// ---------------------------------------------------------------------------
// Contract mocks — the variables are read lazily inside the factory closures,
// so they must be assigned before each test rather than at module load.

let mockAnalysis: Record<string, unknown>;
let mockProfile: Record<string, unknown>;
let mockIdentity: Record<string, unknown>;
let mockSynergy: Record<string, unknown>;
let mockMatchups: Record<string, unknown>[];

vi.mock('../src/engine/analysis', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, analyze: () => mockAnalysis };
});
vi.mock('../src/engine/identity', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    profileTeam: () => mockProfile,
    detectIdentities: () => mockIdentity,
    evaluateSynergy: () => mockSynergy,
    evaluateMatchups: () => mockMatchups,
  };
});

const HAZARD_TEAM = `Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fairy
EVs: 252 HP / 196 Def / 60 Spe
Bold Nature
- Nasty Plot
- Shadow Ball
- Recover
- Make It Rain

Tornadus-Therian @ Assault Vest
Ability: Regenerator
Tera Type: Steel
EVs: 252 HP / 4 SpD / 252 Spe
Timid Nature
- Bleakwind Storm
- U-turn
- Knock Off
- Heat Wave

Gliscor @ Toxic Orb
Ability: Poison Heal
Tera Type: Water
EVs: 244 HP / 36 Def / 228 SpD
Careful Nature
- Spikes
- Knock Off
- Toxic
- Protect

Pecharunt @ Heavy-Duty Boots
Ability: Poison Puppeteer
Tera Type: Dark
EVs: 252 HP / 228 Def / 28 Spe
Bold Nature
IVs: 0 Atk
- Malignant Chain
- Foul Play
- Parting Shot
- Recover

Garganacl @ Leftovers
Ability: Purifying Salt
Tera Type: Fairy
EVs: 252 HP / 52 Def / 204 SpD
Careful Nature
- Stealth Rock
- Salt Cure
- Recover
- Protect

Hatterene @ Focus Sash
Ability: Magic Bounce
Tera Type: Water
EVs: 252 HP / 4 Def / 252 SpA
Quiet Nature
IVs: 0 Atk / 0 Spe
- Trick Room
- Psychic Noise
- Dazzling Gleam
- Healing Wish`;

const DRAGON_TEAM = `Charizard @ Heavy-Duty Boots
Ability: Blaze
Tera Type: Fire
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Flamethrower
- Hurricane
- Defog
- Roost

Dragonite @ Heavy-Duty Boots
Ability: Multiscale
Tera Type: Normal
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Dragon Dance
- Extreme Speed
- Earthquake
- Fire Punch

Garchomp @ Rocky Helmet
Ability: Rough Skin
Tera Type: Steel
EVs: 252 HP / 164 Def / 92 Spe
Impish Nature
- Stealth Rock
- Earthquake
- Dragon Tail
- Toxic

Salamence @ Life Orb
Ability: Moxie
Tera Type: Flying
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Dance
- Earthquake
- Outrage
- Stone Edge

Hydreigon @ Choice Specs
Ability: Levitate
Tera Type: Steel
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Draco Meteor
- Dark Pulse
- Flamethrower
- U-turn

Dragapult @ Choice Band
Ability: Infiltrator
Tera Type: Dragon
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Dragon Darts
- U-turn
- Sucker Punch
- Tera Blast`;

// ---------------------------------------------------------------------------
// Hand-built report inputs matching the contract shapes; these let the lane
// engine run without the sibling identity/analysis implementations.

const weak = (tp: string, w: number, res: number, imm: number, sev: string, score = 60) => ({
  tp,
  weak: w,
  four: 0,
  res,
  imm,
  score,
  sev,
});
const mu = (name: string, score: number) => ({ name, score, class: 'ok', reason: '', advice: '' });

function hazardReport(): SuggestReport {
  return {
    team: parseTeam(HAZARD_TEAM),
    profile: {
      overloaded: ['Garganacl'],
      typeCounts: { Poison: 1, Ghost: 2, Rock: 3, Ground: 1, Flying: 1 },
      hazards: ['Gliscor', 'Garganacl', 'Hatterene'],
      defensiveAnchors: ['Garganacl'],
      fast: ['Tornadus-Therian'],
      pivot: ['Tornadus-Therian', 'Pecharunt'],
      removalDenial: ['Gholdengo', 'Hatterene'],
    },
    identity: {
      primary: { name: 'Hazard Stack Fat Balance', score: 88, evidence: ['3 hazard setter(s)'], plan: 'Set hazards, deny removal.' },
      secondary: [{ name: 'Balance', score: 70, evidence: [], plan: '' }],
      all: [
        { name: 'Hazard Stack Fat Balance', score: 88, evidence: [], plan: '' },
        { name: 'Balance', score: 70, evidence: [], plan: '' },
      ],
    },
    synergy: {
      scores: {
        typeSynergy: 72,
        roleCompression: 55,
        offensiveCoverage: 50,
        defensiveBackbone: 58,
        fieldControl: 48,
        speedControl: 42,
        winReliability: 50,
      },
      fieldControl: { hazardSetting: 80, hazardRemoval: 30, removalDenial: 28, chipAbuse: 62, pivotAbuse: 41, setterOverload: 1, score: 48 },
      roleQualityOverloads: ['Garganacl'],
      issues: [{ severity: 'warn', title: 'No removal denial', detail: 'Hazards can be cleared.' }],
    },
    matchups: [mu('Rain', 48), mu('Hazard Stack', 75), mu('Hyper Offense', 55)],
    diagnosis: { status: 'Critical', topWeaknesses: [weak('Ground', 3, 1, 1, 'bad', 70), weak('Fighting', 2, 1, 0, 'warn', 40)], missingRoles: [], redundancy: [] },
  } as unknown as SuggestReport;
}

function dragonReport(): SuggestReport {
  return {
    team: parseTeam(DRAGON_TEAM),
    profile: {
      overloaded: [],
      typeCounts: { Dragon: 4, Fire: 2, Ground: 1, Flying: 1, Dark: 1, Ghost: 1 },
      hazards: ['Garchomp'],
      defensiveAnchors: [],
      fast: ['Dragonite', 'Salamence', 'Dragapult', 'Charizard', 'Hydreigon'],
      priority: ['Dragonite', 'Dragapult'],
      pivot: ['Hydreigon', 'Dragapult'],
      removalDenial: [],
      wincons: ['Dragonite', 'Salamence', 'Dragapult'],
      setup: ['Dragonite', 'Salamence'],
      wallbreakers: ['Salamence', 'Hydreigon', 'Dragapult'],
      choice: ['Hydreigon', 'Dragapult'],
    },
    identity: {
      primary: { name: 'Dragon Spam Offense', score: 90, evidence: ['4 Dragon-type member(s)'], plan: 'Exploit stacked Dragon pressure.' },
      secondary: [{ name: 'Hyper Offense', score: 72, evidence: [], plan: '' }],
      all: [
        { name: 'Dragon Spam Offense', score: 90, evidence: [], plan: '' },
        { name: 'Hyper Offense', score: 72, evidence: [], plan: '' },
      ],
    },
    synergy: {
      scores: {
        typeSynergy: 44,
        roleCompression: 62,
        offensiveCoverage: 78,
        defensiveBackbone: 38,
        fieldControl: 42,
        speedControl: 74,
        winReliability: 66,
      },
      fieldControl: { hazardSetting: 45, hazardRemoval: 25, removalDenial: 0, chipAbuse: 40, pivotAbuse: 45, setterOverload: 0, score: 42 },
      roleQualityOverloads: [],
      issues: [{ severity: 'critical', title: '4 Dragon-type stack', detail: 'Repeated typing creates predictable paths.' }],
    },
    matchups: [mu('Dragon Mirror', 52), mu('Hyper Offense', 70), mu('Stall', 62)],
    diagnosis: { status: 'Concerning', topWeaknesses: [weak('Fairy', 3, 1, 0, 'bad', 66), weak('Ice', 3, 0, 0, 'bad', 64), weak('Dragon', 2, 1, 0, 'warn', 40)], missingRoles: [], redundancy: [] },
  } as unknown as SuggestReport;
}

beforeEach(() => {
  const r = hazardReport();
  mockAnalysis = {
    rows: r.diagnosis!.topWeaknesses,
    status: 'Critical',
    missing: [],
    red: [],
    typeCounts: (r.profile as { typeCounts?: Record<string, number> })?.typeCounts || {},
    roles: {},
  };
  mockProfile = r.profile as unknown as Record<string, unknown>;
  mockIdentity = r.identity as unknown as Record<string, unknown>;
  mockSynergy = r.synergy as unknown as Record<string, unknown>;
  mockMatchups = r.matchups as unknown as Record<string, unknown>[];
});

// ---------------------------------------------------------------------------

const LANES = new Set(['matchup', 'field control', 'win condition', 'defensive glue', 'speed control', 'identity fit']);

describe('diversifySuggestions (v35 lane engine)', () => {
  it('returns lane-diverse suggestions for a hazard team', () => {
    const report = hazardReport();
    const pool = diversifySuggestions(report);
    expect(pool.length).toBeGreaterThanOrEqual(6);
    const top = pool.slice(0, 6);
    const lanes = new Set(top.map((s) => s.lane).filter(Boolean));
    expect(lanes.size, `suggestions are not lane-diverse enough: ${[...lanes].join(',')}`).toBeGreaterThanOrEqual(4);
    const teamIds = new Set((report.team || []).map((m) => id(m.species)));
    for (const s of pool) {
      expect(teamIds.has(id(s.species)), `${s.species} should not be suggested onto its own team`).toBe(false);
      expect(typeof s.score).toBe('number');
      expect(s.roles.length).toBeGreaterThan(0);
      expect(LANES.has(s.lane)).toBe(true);
      expect(s.source).toBe('V3.5 lane-diverse local metagame brain');
    }
  });

  it('produces different top suggestions for radically different teams', () => {
    const atop = diversifySuggestions(hazardReport()).slice(0, 6).map((s) => s.species).join('|');
    const btop = diversifySuggestions(dragonReport()).slice(0, 6).map((s) => s.species).join('|');
    expect(atop).not.toBe(btop);
  });

  it('marks the Smogon source when live set data is provided', () => {
    const data = {
      sets: {
        Toxapex: {
          'Standard Set': { item: ['Heavy-Duty Boots'], ability: ['Regenerator'], teraTypes: ['Steel'], moves: [['Recover'], ['Toxic'], ['Haze'], ['Surf']] },
        },
      },
    };
    const pool = diversifySuggestions(hazardReport(), data as never);
    expect(pool.every((s) => s.source === 'Smogon OU sets/stats + V3.5 lane ranking')).toBe(true);
    const toxapex = pool.find((s) => s.species === 'Toxapex');
    expect(toxapex?.set).toContain('Toxapex @ Heavy-Duty Boots');
  });
});

describe('needsForReport', () => {
  it('emits one need per structural gap', () => {
    const report = {
      synergy: { scores: { fieldControl: 50, winReliability: 50, defensiveBackbone: 50 } },
      matchups: [mu('Rain', 50)],
      diagnosis: { topWeaknesses: [weak('Ground', 3, 1, 0, 'bad'), weak('Water', 2, 2, 0, 'warn'), weak('Fairy', 3, 0, 0, 'crit')] },
    } as unknown as SuggestReport;
    const labels = needsForReport(report).map((n) => n.label);
    expect(labels).toContain('Ground counterplay');
    expect(labels).toContain('Fairy counterplay');
    expect(labels).not.toContain('Water counterplay'); // 'warn' severity does not qualify
    expect(labels).toContain('field control');
    expect(labels).toContain('closing path');
    expect(labels).toContain('defensive glue');
    expect(labels).toContain('rain insurance');
  });

  it('returns no needs on a healthy report', () => {
    const report = {
      synergy: { scores: { fieldControl: 80, winReliability: 75, defensiveBackbone: 80 } },
      matchups: [mu('Rain', 70)],
      diagnosis: { topWeaknesses: [weak('Ground', 1, 3, 1, 'good')] },
    } as unknown as SuggestReport;
    expect(needsForReport(report)).toEqual([]);
  });
});

describe('swapOptionsFor', () => {
  it('ranks overloaded and weakness-matching team members first', () => {
    const report = hazardReport();
    const suggestion = { roles: ['defensive glue', 'Water check', 'Regenerator glue'] };
    const options = swapOptionsFor(suggestion, report);
    expect(options.length).toBe(report.team!.length);
    // sorted descending by score
    for (let i = 1; i < options.length; i++) expect(options[i].score).toBeLessThanOrEqual(options[i - 1].score);
    const garg = options.find((o) => o.species === 'Garganacl')!;
    // Garganacl (Rock) is weak to both top-weakness types and overloaded; the
    // legacy swap reasons list is capped at 3, so those three fill the row.
    expect(garg.reasons).toEqual(['eases Ground pressure', 'eases Fighting pressure', 'removes an overloaded slot']);
    expect(garg.score).toBeGreaterThanOrEqual(9);
    // every swap option points at a real slot on the report's team
    options.forEach((o) => expect(report.team![o.teamIndex].species).toBe(o.species));
  });
});

describe('suggestAdditions (public entry)', () => {
  it('returns the full lane pool for a hazard report', () => {
    const team = parseTeam(HAZARD_TEAM);
    const r = hazardReport();
    const pool = suggestAdditions(team, mockAnalysis as never, r.profile as never, r.identity as never, r.synergy as never, r.matchups as never);
    expect(pool.length).toBeGreaterThanOrEqual(6);
    expect(pool.length).toBeLessThanOrEqual(18);
    const lanes = new Set(pool.slice(0, 6).map((s) => s.lane));
    expect(lanes.size).toBeGreaterThanOrEqual(4);
  });
});

describe('Smogon data layer', () => {
  it('exposes the merged fallback set table', () => {
    for (const key of Object.keys(SUGGEST_SETS)) expect(SMOGON_FALLBACK_SETS[key]).toBe(SUGGEST_SETS[key]);
    for (const extra of ['Amoonguss', 'Toxapex', 'Alomomola', 'Slowking-Galar', 'Samurott-Hisui', 'Landorus-Therian', 'Zapdos', 'Clefable', 'Ting-Lu']) {
      expect(SMOGON_FALLBACK_SETS[extra], `${extra} should have a fallback set`).toBeTruthy();
      expect(SMOGON_FALLBACK_SETS[extra]).toContain(`${extra} @ `);
    }
  });

  it('mergeSuggestSets overlays remote text onto the fallback table', () => {
    const merged = mergeSuggestSets({ Fakemontwo: 'Fakemontwo @ Leftovers\n- Splash' });
    expect(merged['Fakemontwo']).toContain('Splash');
    expect(merged['Corviknight']).toBe(SMOGON_FALLBACK_SETS['Corviknight']);
    const overridden = mergeSuggestSets({ Corviknight: 'Corviknight @ Choice Band\n- Brave Bird' });
    expect(overridden['Corviknight']).toContain('Choice Band');
  });

  it('fetchSmogonSets resolves a non-empty record regardless of network', async () => {
    const sets = await fetchSmogonSets('gen9ou');
    expect(typeof sets).toBe('object');
    expect(Object.keys(sets).length).toBeGreaterThan(0);
    for (const [species, text] of Object.entries(sets).slice(0, 3)) {
      expect(text).toContain(`${species.split(' ')[0]}`);
      expect(text).toMatch(/@ |Item/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Report glue — mocked analysis/identity chain.

describe('teamReasoner / buildReasoningReport glue', () => {
  it('assembles a full report with suggestions, pool, and needs', () => {
    const team = parseTeam(HAZARD_TEAM);
    const report = teamReasoner(team, mockAnalysis as never);
    expect(report.profile).toBeTruthy();
    expect(report.identity).toBeTruthy();
    expect(report.synergy).toBeTruthy();
    expect(Array.isArray(report.matchups)).toBe(true);
    expect(Array.isArray(report.suggestions)).toBe(true);
    expect(report.suggestions!.length).toBeGreaterThanOrEqual(6);
    expect(report.suggestionPool!.length).toBeLessThanOrEqual(18);
    expect(report.suggestions![0].swapOptions!.length).toBe(team.length);
    expect(report.validation!.length).toBe(6);
    expect(report.diagnosis!.topWeaknesses!.length).toBeGreaterThan(0);
    expect(Array.isArray(report.needs)).toBe(true);
    const needLabels = report.needs!.map((n) => n.label);
    expect(needLabels).toContain('field control');
    expect(needLabels).toContain('rain insurance');
  });

  it('returns the empty shell when there is no team or analysis', () => {
    const empty = teamReasoner([], mockAnalysis as never);
    expect(empty.profile).toBeNull();
    expect(empty.identity).toBeNull();
    expect(empty.synergy).toBeNull();
    expect(empty.matchups).toEqual([]);
    expect(empty.suggestions).toEqual([]);
  });

  it('buildReasoningReport stamps the local lane source', () => {
    const report = buildReasoningReport(parseTeam(HAZARD_TEAM), mockAnalysis as never)!;
    expect(report.suggestionSource).toBe('V3.5 lane-diverse local metagame brain');
    expect(report.suggestions!.length).toBe(Math.min(6, report.suggestionPool!.length));
    expect(report.suggestionPool!.length).toBeLessThanOrEqual(18);
    expect(report.needs!.length).toBeGreaterThan(0);
  });

  it('buildReasoningReport honors a provided Smogon snapshot', () => {
    const report = buildReasoningReport(parseTeam(HAZARD_TEAM), mockAnalysis as never, {
      smogon: {
        sets: {
          Toxapex: {
            Standard: { item: ['Heavy-Duty Boots'], ability: ['Regenerator'], teraTypes: ['Steel'], moves: [['Recover'], ['Toxic'], ['Haze'], ['Surf']] },
          },
        },
      },
    })!;
    expect(report.suggestionSource).toBe('Smogon OU sets/stats + V3.5 lane ranking');
    const toxapex = report.suggestionPool!.find((s) => s.species === 'Toxapex');
    expect(toxapex).toBeTruthy();
  });
});

describe('buildMarkdownReport (test-smoke block)', () => {
  const fakeReport = () =>
    ({
      generatedAt: '2026-10-07T00:00:00.000Z',
      suggestionSource: 'V3.5 lane-diverse local metagame brain',
      team: [
        {
          species: 'Kingambit',
          item: 'Leftovers',
          ability: 'Supreme Overlord',
          tera: 'Dark',
          nature: 'Adamant',
          evs: { hp: 252, atk: 252, spd: 4 },
          ivs: {},
          moves: ['Sucker Punch', 'Kowtow Cleave'],
          types: ['Dark', 'Steel'],
        },
        {
          species: 'Corviknight',
          item: 'Leftovers',
          ability: 'Pressure',
          tera: 'Dragon',
          nature: 'Impish',
          evs: { hp: 248, def: 252, spd: 8 },
          ivs: {},
          moves: ['Roost', 'Defog'],
          types: ['Flying', 'Steel'],
        },
      ],
      identity: {
        primary: { name: 'Balance', score: 80, evidence: ['1 defensive anchor(s)'], plan: 'Adapt game-to-game using defensive glue.' },
        secondary: [{ name: 'Stall', score: 44, evidence: [], plan: '' }],
        all: [
          { name: 'Balance', score: 80, evidence: [], plan: '' },
          { name: 'Stall', score: 44, evidence: [], plan: '' },
        ],
      },
      synergy: {
        scores: { typeSynergy: 70, roleCompression: 66, offensiveCoverage: 55, defensiveBackbone: 62, fieldControl: 58, speedControl: 50, winReliability: 61 },
        fieldControl: { hazardSetting: 44, hazardRemoval: 37, removalDenial: 25, chipAbuse: 40, pivotAbuse: 28, setterOverload: 0, score: 40 },
        roleQualityOverloads: [],
        issues: [{ severity: 'warn', title: 'No removal denial', detail: 'Hazards can be cleared unless pressure compensates.' }],
      },
      matchups: [mu('Rain', 60), mu('Stall', 55)],
      diagnosis: { status: 'Concerning', topWeaknesses: [weak('Fighting', 2, 1, 0, 'warn', 45)], missingRoles: ['speed control'], redundancy: [] },
      profile: { defensiveAnchors: ['Corviknight'], wallbreakers: ['Kingambit'], pivot: [], overloaded: [], typeCounts: { Steel: 2 } },
      validation: [
        {
          species: 'Kingambit',
          item: 'Leftovers',
          issues: [],
          warnings: [],
          valid: ['species exists'],
          status: 'VALID',
          confidence: 'high',
          hardIssueCount: 0,
          warningCount: 0,
          validationState: 'clean',
        },
      ],
      suggestions: [
        {
          species: 'Toxapex',
          score: 82,
          roles: ['defensive glue', 'Water check'],
          why: ['stabilizes the Rain matchup'],
          set: 'Toxapex @ Heavy-Duty Boots\n- Recover',
          source: 'local metagame fallback',
          swapOptions: [{ teamIndex: 0, species: 'Kingambit', score: 5, reasons: ['eases Fighting pressure'] }],
        },
      ],
      suggestionPool: [],
      needs: [{ label: 'field control', why: 'hazards, removal, denial, or chip loops are unstable' }],
    }) as never;

  it('emits all report sections', () => {
    const md = buildMarkdownReport(fakeReport());
    expect(md).toContain('# Nurse Joyless V3.5 Team Report');
    expect(md).toContain('Matchup Matrix');
    expect(md).toContain('Suggested Additions');
    expect(md).toContain('## 1. Team Import');
    expect(md).toContain('## 2. Executive Verdict');
    expect(md).toContain('**Identity Confidence:** 80/100');
    expect(md).toContain('## 3. Identity Analysis');
    expect(md).toContain('| Balance | 80/100 |');
    expect(md).toContain('## 4. Scoreboard');
    expect(md).toContain('Win Condition Reliability');
    expect(md).toContain('## 5. Field Control Breakdown');
    expect(md).toContain('## 6. Structural Findings');
    expect(md).toContain('No removal denial');
    expect(md).toContain('## 7. Type Triage');
    expect(md).toContain('| Fighting | 2 | 1 | 0 | WARN |');
    expect(md).toContain('## 8. Matchup Matrix');
    expect(md).toContain('| Rain | 60/100 |');
    expect(md).toContain('## 9. Pokémon-by-Pokémon Notes');
    expect(md).toContain('defensive anchor');
    expect(md).toContain('## 10. Suggested Additions');
    expect(md).toContain('### Toxapex — 82/100 fit');
    expect(md).toContain('```showdown');
    expect(md).toContain('## 11. Validation');
    expect(md).toContain('| Kingambit | VALID |');
  });

  it('handles a null report', () => {
    expect(buildMarkdownReport(null)).toContain('No analysis available');
  });
});
