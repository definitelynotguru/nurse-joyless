const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/dex-integrity-guard.js', 'utf8');

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
  TYPES: ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'],
  CHART: {
    Normal:{Rock:.5,Ghost:0,Steel:.5},
    Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
    Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
    Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
    Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
    Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
    Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
    Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
    Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
    Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
    Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
    Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
    Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
    Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
    Dragon:{Dragon:2,Steel:.5,Fairy:0},
    Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
    Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
    Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5}
  },
  P: {
    Garchomp: [['Dragon','Ground'], [108,130,95,80,85,102]]
  },
  FALLBACK_ABILITIES: {},
  MOVES: {Earthquake:['Ground','Physical',100,100]},
  REPLAY_MOVE_HINTS: {},
  DexAdapter: {
    resolveSpeciesName(name){ return String(name || '').replace(/\b\w/g, c => c.toUpperCase()); },
    getSpecies(name){ return null; },
    resolveMoveName(name){ return String(name || '').trim(); },
    getMove(){ return null; }
  },
  types(){ return ['Normal']; },
  validateTeamAdvanced(rows){ return rows.map(mon => ({mon, species: mon.species, status: 'WARNING', issues: [], warnings: ['unknown or unsupported form; validation limited', 'Ability data unavailable.']})); },
  team: []
};
context.window = context;

vm.createContext(context);
vm.runInContext(source, context, {filename: 'src/dex-integrity-guard.js', timeout: 5000});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const guard = context.NURSE_JOYLESS_DEX_INTEGRITY_GUARD;
assert(guard, 'guard should install');

assert(JSON.stringify(context.types({species: 'Palkia-Origin'})) === JSON.stringify(['Water','Dragon']), 'Palkia-Origin must resolve Water / Dragon');
assert(JSON.stringify(context.types({species: 'Xerneas'})) === JSON.stringify(['Fairy']), 'Xerneas must resolve Fairy');
assert(JSON.stringify(context.types({species: 'Necrozma-Dusk-Mane'})) === JSON.stringify(['Psychic','Steel']), 'Necrozma-Dusk-Mane must resolve Psychic / Steel');
assert(JSON.stringify(context.types({species: 'Yveltal'})) === JSON.stringify(['Dark','Flying']), 'Yveltal must resolve Dark / Flying');
assert(JSON.stringify(context.types({species: 'Marshadow'})) === JSON.stringify(['Fighting','Ghost']), 'Marshadow must resolve Fighting / Ghost');
assert(JSON.stringify(context.types({species: 'Noivern'})) === JSON.stringify(['Flying','Dragon']), 'Noivern must resolve Flying / Dragon');

const team = [
  {species: 'Palkia-Origin'},
  {species: 'Xerneas'},
  {species: 'Necrozma-Dusk-Mane'},
  {species: 'Yveltal'},
  {species: 'Garchomp'},
  {species: 'Marshadow'}
];
const triage = guard.analyzeTypeTriage(team).rows;
assert(triage.Fairy.weak === 4, `Fairy weak should be 4, got ${triage.Fairy.weak}`);
assert(triage.Fairy.resist === 1, `Fairy resist should be 1, got ${triage.Fairy.resist}`);
assert(triage.Fighting.weak === 0, `Fighting weak should be 0, got ${triage.Fighting.weak}`);
assert(triage.Fighting.resist === 1, `Fighting resist should be 1 from Xerneas, got ${triage.Fighting.resist}`);
assert(triage.Fighting.immune === 1, `Fighting immune should be 1 from Marshadow, got ${triage.Fighting.immune}`);

assert(JSON.stringify(context.types({species: 'DefinitelyNotAMon'})) === JSON.stringify(['Unknown']), 'unknown species must not be silently treated as Normal');
const unknownTriage = guard.analyzeTypeTriage([{species: 'DefinitelyNotAMon'}]);
assert(unknownTriage.unsupported.length === 1, 'unknown species should be reported as unsupported');
assert(!unknownTriage.rows.Fighting || unknownTriage.rows.Fighting.weak === 0, 'unknown species must not create fake Fighting weakness');

const validation = context.validateTeamAdvanced([{species: 'Noivern', ability: 'Infiltrator'}]);
assert(validation[0].status === 'VALID', 'known fallback species should not keep fake unsupported/ability warnings');

assert(context.MOVES['Spacial Rend'], 'Spacial Rend fallback move should exist');
assert(context.MOVES['Sunsteel Strike'], 'Sunsteel Strike fallback move should exist');
assert(context.MOVES['Spectral Thief'], 'Spectral Thief fallback move should exist');

console.log('[OK] dex integrity guard passed');
