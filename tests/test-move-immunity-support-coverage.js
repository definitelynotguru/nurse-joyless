const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const speciesData = {
  'Kommo-o': {
    name: 'Kommo-o',
    abilities: { 0: 'Bulletproof', 1: 'Soundproof', H: 'Overcoat' },
  },
  Brambleghast: {
    name: 'Brambleghast',
    abilities: { 0: 'Wind Rider' },
  },
};

const moveData = {
  Sing: ['Normal', 'Status', 0, 55],
  'Bullet Seed': ['Grass', 'Physical', 25, 100],
  Gust: ['Flying', 'Special', 40, 100],
  'Rage Powder': ['Bug', 'Status', 0, 100],
};

const context = {
  console,
  window: null,
  globalThis: null,
  REPLAY_MOVE_HINTS: {},
  detectiveAbilities(species = '') {
    return Object.values(speciesData[String(species).trim()]?.abilities || {}).filter(Boolean);
  },
  moveMeta(move = '') {
    return moveData[String(move).trim()] || null;
  },
  moveBlockingAbility() {
    return '';
  },
  dmg(att, def, move) {
    const meta = moveData[String(move).trim()] || ['', 'Status'];
    return {
      att,
      def,
      moveType: meta[0],
      move: meta,
      blockedBy: '',
      eff: 1,
      rolls: new Array(16).fill(48),
      min: 48,
      maxd: 48,
      minp: 48,
      maxp: 48,
      ko: 0,
      two: 0,
      three: 0,
    };
  },
  DexAdapter: {
    id(value = '') {
      return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
    },
    resolveMoveName(value = '') {
      return String(value).trim();
    },
    getSpecies(name = '') {
      return speciesData[String(name).trim()] || null;
    },
    getMove(name = '') {
      return moveData[String(name).trim()] || null;
    },
  },
  ReplayParser: function ReplayParser() {},
};

context.window = context;
context.globalThis = context;
context.ReplayParser.prototype = {
  abilityRewardText(ability) {
    return `${ability} revealed`;
  },
  abilityTriggeredByMove() {
    return false;
  },
  abilityClueLabel(ability) {
    return `${ability} revealed`;
  },
  abilityClueLabelWithProof(ability) {
    return `${ability} revealed`;
  },
  reactiveAbilityProof() {
    return false;
  },
  moveBlockedAbilities() {
    return [];
  },
  moveContradictionNote() {
    return '';
  },
  joinWithOr(values = []) {
    return values.join(' or ');
  },
  abilitySuppressionActive() {
    return false;
  },
  moveAbilityBypass() {
    return '';
  },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/move-immunity-upgrades.js', 'utf8'),
  context,
  { filename: 'move-immunity-upgrades.js', timeout: 10000 }
);

const parser = vm.runInContext('new ReplayParser()', context);

assert(parser.abilityTriggeredByMove('Soundproof', 'Sing'), 'Soundproof should recognize Sing as a sound move');
assert(parser.abilityTriggeredByMove('Wind Rider', 'Gust'), 'Wind Rider should recognize Gust as a wind move');
assert(parser.abilityTriggeredByMove('Overcoat', 'Rage Powder'), 'Overcoat should recognize Rage Powder as a powder move');

const singBlocks = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Sing');
assert(singBlocks.includes('Soundproof'), 'Sing landing should now contradict Soundproof');

const bulletSeedBlocks = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Bullet Seed');
assert(bulletSeedBlocks.includes('Bulletproof'), 'Bullet Seed landing should now contradict Bulletproof');

const ragePowderBlocks = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Rage Powder');
assert(ragePowderBlocks.includes('Overcoat'), 'Rage Powder landing should now contradict Overcoat');

assert(
  parser.abilityClueLabelWithProof('Soundproof', 'Sing', true) === 'Soundproof blocked Sing',
  'Replay clues should keep the exact blocked sound move for Soundproof support moves'
);
assert(
  parser.abilityClueLabelWithProof('Wind Rider', 'Gust', true) === 'Wind Rider activated on Gust',
  'Replay clues should keep the exact wind move for Wind Rider support coverage'
);
assert(
  parser.moveContradictionNote({ species: 'Kommo-o' }, 'Sing').includes('Soundproof'),
  'Contradiction notes should include Soundproof for landed support sound moves'
);

const bulletSeedRoll = vm.runInContext(
  `dmg({ability:''}, {ability:'Bulletproof'}, 'Bullet Seed')`,
  context,
  { timeout: 10000 }
);
assert(bulletSeedRoll.blockedBy === 'Bulletproof', 'Bulletproof should still zero out newly covered projectile moves');
assert(bulletSeedRoll.maxd === 0, 'Blocked projectile moves should produce zero-damage rolls');

assert(
  context.REPLAY_MOVE_HINTS.Sing?.[1] === 'Status',
  'Replay move hints should include newly covered support sound moves'
);
assert(
  context.REPLAY_MOVE_HINTS['Rage Powder']?.[1] === 'Status',
  'Replay move hints should include newly covered powder support moves'
);

console.log('[OK] move immunity support coverage passed');