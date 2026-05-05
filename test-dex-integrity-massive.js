const fs = require('fs');
const vm = require('vm');

// ── 1. Extract real constants from app.js ──────────────────────────
const appSrc = fs.readFileSync('src/app.js', 'utf8');

function extractConst(name) {
  const re = new RegExp(`const ${name}=([^;]+);`, 's');
  const m = appSrc.match(re);
  if (!m) throw new Error(`Cannot extract ${name}`);
  return vm.runInNewContext('(' + m[1] + ')', {});
}

const TYPES  = extractConst('TYPES');
const CHART  = extractConst('CHART');
const P_BASE = extractConst('P');

// ── 2. Read dex-integrity-guard.js ───────────────────────────────
const guardSrc = fs.readFileSync('src/dex-integrity-guard.js', 'utf8');

// ── 3. Build VM context with real data ────────────────────────────
const context = {
  console,
  window: null,
  document: {
    readyState: 'complete',
    addEventListener(){},
    getElementById(){ return null; },
    querySelectorAll(){ return []; }
  },
  MutationObserver: function(){ this.observe = function(){}; },
  TYPES,
  CHART,
  P: { ...P_BASE },
  FALLBACK_ABILITIES: {},
  MOVES: {},
  REPLAY_MOVE_HINTS: {},
  id: s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
  DexAdapter: {
    resolveSpeciesName(name){ return String(name || '').replace(/\b\w/g, c => c.toUpperCase()); },
    getSpecies(name){
      const d = context.P[name];
      if (!d) return null;
      return { name, types: d[0], baseStats: d[1], abilities: {} };
    },
    resolveMoveName(name){ return String(name || '').trim(); },
    getMove(){ return null; }
  },
  types(monOrName) {
    const raw = typeof monOrName === 'string' ? monOrName : (monOrName && monOrName.species) || monOrName;
    const sp = context.DexAdapter.getSpecies(raw);
    if (sp && Array.isArray(sp.types) && sp.types.length) return sp.types;
    return ['Normal'];
  },
  validateTeamAdvanced(rows){ return rows.map(mon => ({mon, species: mon.species, status: 'WARNING', issues: [], warnings: ['unknown or unsupported form; validation limited', 'Ability data unavailable.']})); },
  team: []
};
context.window = context;

vm.createContext(context);
vm.runInContext(guardSrc, context, {filename: 'src/dex-integrity-guard.js', timeout: 5000});

const guard = context.NURSE_JOYLESS_DEX_INTEGRITY_GUARD;
if (!guard) throw new Error('Guard failed to install');

// Merge EXTRA_SPECIES into P so we can build teams with them
const extraSpeciesMatch = guardSrc.match(/const EXTRA_SPECIES = \{([^]*?)\};/);
let EXTRA_SPECIES = {};
if (extraSpeciesMatch) {
  EXTRA_SPECIES = vm.runInNewContext('({' + extraSpeciesMatch[1] + '})', {});
}
context.P = { ...context.P, ...EXTRA_SPECIES };

// ── 4. Reference implementation of type effectiveness ────────────
function refMult(atk, defs) {
  return defs.reduce((a, t) => a * ((CHART[atk] && CHART[atk][t] !== undefined) ? CHART[atk][t] : 1), 1);
}

function refAnalyze(teamList) {
  const rows = {};
  const unsupported = [];
  TYPES.forEach(tp => { rows[tp] = {weak: 0, quad: 0, resist: 0, immune: 0}; });

  for (const mon of teamList || []) {
    const sp = context.DexAdapter.getSpecies(mon.species);
    // Match guard semantics exactly: unknown-type species are unsupported
    if (!sp || !Array.isArray(sp.types) || !sp.types.length || sp.types.includes('Unknown') || sp.unsupported) {
      unsupported.push(mon.species || 'Unknown');
      continue;
    }
    for (const tp of TYPES) {
      const mult = refMult(tp, sp.types);
      if (mult === 0) rows[tp].immune += 1;
      else if (mult >= 4) { rows[tp].weak += 1; rows[tp].quad += 1; }
      else if (mult > 1) rows[tp].weak += 1;
      else if (mult < 1) rows[tp].resist += 1;
    }
  }
  return {rows, unsupported};
}

// ── 5. Build 100+ diverse teams ──────────────────────────────────
const ALL_SPECIES = Object.keys(context.P);

function rand(n) { return Math.floor(Math.random() * n); }
function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }

function makeTeam(n, filterFn) {
  const pool = shuffle(ALL_SPECIES.filter(filterFn || (() => true)));
  return pool.slice(0, n).map(s => ({species: s}));
}

const teams = [];

// 1-10: Pure-type stacks (mono / near-mono)
teams.push({ name: 'Mono Fire',        team: makeTeam(6, s => context.P[s][0].includes('Fire')) });
teams.push({ name: 'Mono Water',       team: makeTeam(6, s => context.P[s][0].includes('Water')) });
teams.push({ name: 'Mono Grass',       team: makeTeam(6, s => context.P[s][0].includes('Grass')) });
teams.push({ name: 'Mono Electric',    team: makeTeam(6, s => context.P[s][0].includes('Electric')) });
teams.push({ name: 'Mono Dragon',      team: makeTeam(6, s => context.P[s][0].includes('Dragon')) });
teams.push({ name: 'Mono Steel',       team: makeTeam(6, s => context.P[s][0].includes('Steel')) });
teams.push({ name: 'Mono Fairy',       team: makeTeam(6, s => context.P[s][0].includes('Fairy')) });
teams.push({ name: 'Mono Ghost',       team: makeTeam(6, s => context.P[s][0].includes('Ghost')) });
teams.push({ name: 'Mono Dark',        team: makeTeam(6, s => context.P[s][0].includes('Dark')) });
teams.push({ name: 'Mono Fighting',      team: makeTeam(6, s => context.P[s][0].includes('Fighting')) });

// 11-20: Duo-type stacks
teams.push({ name: 'Dragon + Flying',    team: makeTeam(6, s => context.P[s][0].includes('Dragon') && context.P[s][0].includes('Flying')) });
teams.push({ name: 'Water + Flying',     team: makeTeam(6, s => context.P[s][0].includes('Water') && context.P[s][0].includes('Flying')) });
teams.push({ name: 'Fire + Steel',       team: makeTeam(6, s => context.P[s][0].includes('Fire') && context.P[s][0].includes('Steel')) });
teams.push({ name: 'Ground + Flying',    team: makeTeam(6, s => context.P[s][0].includes('Ground') && context.P[s][0].includes('Flying')) });
teams.push({ name: 'Grass + Poison',     team: makeTeam(6, s => context.P[s][0].includes('Grass') && context.P[s][0].includes('Poison')) });
teams.push({ name: 'Dark + Steel',       team: makeTeam(6, s => context.P[s][0].includes('Dark') && context.P[s][0].includes('Steel')) });
teams.push({ name: 'Psychic + Fairy',    team: makeTeam(6, s => context.P[s][0].includes('Psychic') && context.P[s][0].includes('Fairy')) });
teams.push({ name: 'Rock + Dark',        team: makeTeam(6, s => context.P[s][0].includes('Rock') && context.P[s][0].includes('Dark')) });
teams.push({ name: 'Bug + Fire',         team: makeTeam(6, s => context.P[s][0].includes('Bug') && context.P[s][0].includes('Fire')) });
teams.push({ name: 'Ice + Dragon',       team: makeTeam(6, s => context.P[s][0].includes('Ice') && context.P[s][0].includes('Dragon')) });

// 21-30: Random archetypes (6 mons)
for (let i = 0; i < 10; i++) {
  teams.push({ name: `Random team ${i+1}`, team: makeTeam(6) });
}

// 31-40: Smaller squad sizes
for (let i = 0; i < 10; i++) {
  teams.push({ name: `Small squad ${i+1} (n=${i+1})`, team: makeTeam(i + 1) });
}

// 41-50: Legendary/Ubers teams using EXTRA_SPECIES
const legendaries = Object.keys(EXTRA_SPECIES);
for (let i = 0; i < 10; i++) {
  teams.push({ name: `Legendary squad ${i+1}`, team: shuffle(legendaries).slice(0, 6).map(s => ({species: s})) });
}

// 51-60: Mixed meta teams (legendary + base)
for (let i = 0; i < 10; i++) {
  const half1 = shuffle(legendaries).slice(0, 3).map(s => ({species: s}));
  const half2 = makeTeam(3);
  teams.push({ name: `Mixed meta ${i+1}`, team: shuffle([...half1, ...half2]) });
}

// 61-70: Teams with immunities (Flying for Ground, Ghost for Normal/Fighting, etc.)
teams.push({ name: 'Ground-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Flying') || context.P[s][0].includes('Ghost') || context.P[s][0].includes('Bug')) });
teams.push({ name: 'Fighting-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Ghost') || context.P[s][0].includes('Flying') || context.P[s][0].includes('Poison')) });
teams.push({ name: 'Normal-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Ghost') || context.P[s][0].includes('Rock') || context.P[s][0].includes('Steel')) });
teams.push({ name: 'Electric-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Ground') || context.P[s][0].includes('Flying')) });
teams.push({ name: 'Fire-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Water') || context.P[s][0].includes('Rock') || context.P[s][0].includes('Fire') || context.P[s][0].includes('Dragon')) });
teams.push({ name: 'Water-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Water') || context.P[s][0].includes('Grass') || context.P[s][0].includes('Dragon')) });
teams.push({ name: 'Grass-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Fire') || context.P[s][0].includes('Poison') || context.P[s][0].includes('Bug') || context.P[s][0].includes('Flying') || context.P[s][0].includes('Dragon')) });
teams.push({ name: 'Ice-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Fire') || context.P[s][0].includes('Water') || context.P[s][0].includes('Ice') || context.P[s][0].includes('Steel')) });
teams.push({ name: 'Psychic-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Dark') || context.P[s][0].includes('Psychic') || context.P[s][0].includes('Steel')) });
teams.push({ name: 'Poison-immune stack', team: makeTeam(6, s => context.P[s][0].includes('Poison') || context.P[s][0].includes('Ground') || context.P[s][0].includes('Rock') || context.P[s][0].includes('Ghost') || context.P[s][0].includes('Steel')) });

// 71-80: Known archetype cores
const coreTeams = [
  { name: 'Rain core',    mons: ['Pelipper', 'Barraskewda', 'Tornadus-Therian', 'Raging Bolt', 'Garchomp', 'Amoonguss'] },
  { name: 'Sun core',     mons: ['Torkoal', 'Venusaur', 'Charizard', 'Walking Wake', 'Gouging Fire', 'Rillaboom'] },
  { name: 'Dragon spam',  mons: ['Dragonite', 'Garchomp', 'Salamence', 'Dragapult', 'Hydreigon', 'Roaring Moon'] },
  { name: 'Hazard stack', mons: ['Gholdengo', 'Garchomp', 'Ting-Lu', 'Toxapex', 'Clodsire', 'Gliscor'] },
  { name: 'Stall core',   mons: ['Toxapex', 'Clodsire', 'Dondozo', 'Amoonguss', 'Alomomola', 'Garganacl'] },
  { name: 'HO core',      mons: ['Weavile', 'Meowscarada', 'Barraskewda', 'Dragapult', 'Iron Valiant', 'Cinderace'] },
  { name: 'Balance core', mons: ['Corviknight', 'Heatran', 'Rotom-Wash', 'Tyranitar', 'Clefable', 'Garchomp'] },
  { name: 'VoltTurn',     mons: ['Rotom-Wash', 'Corviknight', 'Landorus-Therian', 'Dragapult', 'Garchomp', 'Rillaboom'] },
  { name: 'Trick Room',   mons: ['Torkoal', 'Hatterene', 'Cresselia', 'Ursaluna', 'Raging Bolt', 'Dondozo'] },
  { name: 'Bulky Offense',mons: ['Great Tusk', 'Kingambit', 'Raging Bolt', 'Dragapult', 'Gholdengo', 'Pelipper'] },
];
for (const ct of coreTeams) {
  teams.push({ name: ct.name, team: ct.mons.filter(s => context.P[s]).map(s => ({species: s})) });
}

// 81-90: Type-weakness targeted teams (teams weak to specific types)
teams.push({ name: 'Quad-weak Rock team',  team: ['Charizard', 'Volcarona', 'Dragonite', 'Salamence', 'Tyranitar', 'Roaring Moon'].map(s => ({species: s})) });
teams.push({ name: 'Quad-weak Ice team',   team: ['Dragonite', 'Salamence', 'Landorus-Therian', 'Tornadus-Therian', 'Garchomp', 'Pelipper'].map(s => ({species: s})) });
teams.push({ name: 'Quad-weak Fighting',   team: ['Tyranitar', 'Darkrai', 'Weavile', 'Ursaluna', 'Kingambit', 'Yveltal'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Quad-weak Ground',     team: ['Heatran', 'Toxapex', 'Clodsire', 'Garganacl', 'Pecharunt', 'Tyranitar'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Resist-everything-ish',team: ['Toxapex', 'Skarmory', 'Corviknight', 'Heatran', 'Clodsire', 'Gholdengo'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Normal weak team',     team: ['Tyranitar', 'Garganacl', 'Great Tusk', 'Garganacl', 'Tyranitar', 'Garganacl'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Fairy weak team',      team: ['Dragonite', 'Garchomp', 'Salamence', 'Hydreigon', 'Dragapult', 'Roaring Moon'].map(s => ({species: s})) });
teams.push({ name: 'Steel resist stack',   team: ['Heatran', 'Corviknight', 'Toxapex', 'Gholdengo', 'Kingambit', 'Skarmory'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Grass resist stack',   team: ['Volcarona', 'Torkoal', 'Charizard', 'Heatran', 'Salamence', 'Dragonite'].map(s => ({species: s})) });
teams.push({ name: 'Water resist stack',   team: ['Venusaur', 'Rillaboom', 'Toxapex', 'Clodsire', 'Rotom-Wash', 'Great Tusk'].map(s => ({species: s})).filter(Boolean) });

// 91-100: Edge case / stress tests
teams.push({ name: 'Single mon',            team: [{species: 'Garchomp'}] });
teams.push({ name: 'Two mons',              team: [{species: 'Garchomp'}, {species: 'Toxapex'}] });
teams.push({ name: 'Unknown species',       team: [{species: 'DefinitelyNotAMon'}, {species: 'Garchomp'}, {species: 'Toxapex'}] });
teams.push({ name: 'All unknown',           team: [{species: 'FakeMon1'}, {species: 'FakeMon2'}, {species: 'FakeMon3'}] });
teams.push({ name: 'Empty team',            team: [] });
teams.push({ name: 'One legendary',         team: [{species: 'Zacian-Crowned'}] });
teams.push({ name: 'Six legendaries',       team: ['Zacian-Crowned', 'Miraidon', 'Koraidon', 'Eternatus', 'Palkia-Origin', 'Dialga-Origin'].map(s => ({species: s})) });
teams.push({ name: 'Mixed forms',           team: ['Zacian', 'Zacian-Crowned', 'Kyurem', 'Kyurem-Black', 'Rotom-Wash', 'Rotom-Heat'].map(s => ({species: s})).filter(Boolean) });
teams.push({ name: 'Partially unknown',     team: [{species: 'Garchomp'}, {species: 'FakeA'}, {species: 'Toxapex'}, {species: 'FakeB'}, {species: 'Dragapult'}, {species: 'FakeC'}] });
teams.push({ name: 'All same mon x6',       team: Array(6).fill({species: 'Garchomp'}) });

// 101-110: Random stress tests with varying sizes
for (let i = 0; i < 10; i++) {
  const size = rand(6) + 1;
  teams.push({ name: `Stress ${i+1} (n=${size})`, team: makeTeam(size) });
}

// 111-120: More legendary-only stress
for (let i = 0; i < 10; i++) {
  const size = rand(6) + 1;
  teams.push({ name: `Lego stress ${i+1} (n=${size})`, team: shuffle(legendaries).slice(0, size).map(s => ({species: s})) });
}

// ── 6. Run all teams through both analyzers and compare ───────────
let passed = 0;
let failed = 0;
const failures = [];

for (const {name, team} of teams) {
  const ref = refAnalyze(team);
  const tri = guard.analyzeTypeTriage(team);

  let ok = true;
  let details = [];

  // Compare unsupported lists
  if (ref.unsupported.length !== tri.unsupported.length) {
    ok = false;
    details.push(`unsupported mismatch: ref=${ref.unsupported.length} tri=${tri.unsupported.length}`);
  }

  // Compare per-type counts
  for (const tp of TYPES) {
    const r = ref.rows[tp] || {weak: 0, quad: 0, resist: 0, immune: 0};
    const t = tri.rows[tp] || {weak: 0, quad: 0, resist: 0, immune: 0};
    if (r.weak !== t.weak || r.quad !== t.quad || r.resist !== t.resist || r.immune !== t.immune) {
      ok = false;
      details.push(`${tp}: ref(w=${r.weak} q=${r.quad} r=${r.resist} i=${r.immune}) vs tri(w=${t.weak} q=${t.quad} r=${t.resist} i=${t.immune})`);
    }
  }

  // Sanity checks for "makes sense"
  const teamSize = team.length;
  for (const tp of TYPES) {
    const t = tri.rows[tp] || {weak: 0, resist: 0, immune: 0};
    // No type should have more weaknesses than team size
    if (t.weak > teamSize) { ok = false; details.push(`${tp} weak=${t.weak} > teamSize=${teamSize}`); }
    // No type should have more resistances than team size
    if (t.resist > teamSize) { ok = false; details.push(`${tp} resist=${t.resist} > teamSize=${teamSize}`); }
    // No type should have more immunities than team size
    if (t.immune > teamSize) { ok = false; details.push(`${tp} immune=${t.immune} > teamSize=${teamSize}`); }
    // If there are unsupported mons, they should NOT appear in any count
    if (tri.unsupported.length > 0) {
      // This is already handled by the guard, but let's double-check: all counts must be <= known-species count
      const knownCount = teamSize - tri.unsupported.length;
      if (t.weak > knownCount) { ok = false; details.push(`${tp} weak=${t.weak} > known=${knownCount}`); }
    }
  }

  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push({name, teamSize, details: details.slice(0, 5)});
    console.log(`[FAIL] ${name}: ${details.slice(0, 3).join('; ')}`);
  }
}

console.log(`\n=== Results: ${passed} passed / ${failed} failed / ${teams.length} total ===`);
if (failures.length) {
  console.log('\nDetailed failures:');
  for (const f of failures) {
    console.log(`  ${f.name} (size=${f.teamSize}): ${f.details.join('; ')}`);
  }
  process.exit(1);
}
console.log('[OK] all massive dex integrity tests passed');
