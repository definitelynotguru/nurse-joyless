const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  P: {
    Toxapex: [['Water', 'Poison'], [50, 63, 152, 53, 142, 35]],
  },
  FALLBACK_ABILITIES: {
    Toxapex: {0: 'Merciless', 1: 'Limber', H: 'Regenerator'},
  },
  MOVES: {},
  REPLAY_MOVE_HINTS: {},
  DexAdapter: {
    resolveSpeciesName(value) { return String(value || ''); },
    resolveMoveName(value) { return String(value || ''); },
    getSpecies() { return null; },
  },
  window: null,
};
context.window = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/final-validation-hotfix.js', 'utf8'),
  context,
  {filename: 'final-validation-hotfix.js', timeout: 10000}
);
vm.runInContext(
  fs.readFileSync('src/final-validation-hotfix.js', 'utf8'),
  context,
  {filename: 'final-validation-hotfix.js', timeout: 10000}
);

const toxapexAbilities = Object.values(context.FALLBACK_ABILITIES.Toxapex || {});
assert(!toxapexAbilities.includes('Limber'), 'Toxapex should no longer keep an impossible Limber fallback line');
assert(
  toxapexAbilities.length === 2 &&
    toxapexAbilities.includes('Merciless') &&
    toxapexAbilities.includes('Regenerator'),
  'Toxapex should keep only its real fallback ability lines'
);

const persianAbilities = Object.values(context.FALLBACK_ABILITIES.Persian || {});
assert(
  persianAbilities.includes('Limber') &&
    persianAbilities.includes('Technician') &&
    persianAbilities.includes('Unnerve'),
  'Persian should restore a real Limber fallback pool for paralysis-contradiction coverage'
);

assert(Array.isArray(context.P.Persian?.[0]), 'Persian species data should be available for offline helper reads');
assert(context.P.Persian[0][0] === 'Normal', 'Persian helper species data should keep the correct typing');
assert(Object.keys(context.FALLBACK_ABILITIES.Toxapex).length === 2, 'reloading the hotfix should not reintroduce fake Toxapex ability slots');

console.log('[OK] fallback ability fixes passed');
