const fs = require('fs');
const vm = require('vm');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const context = {
  console,
  window: null,
  globalThis: null,
  P: {},
  FALLBACK_ABILITIES: {
    Farigiraf: {0: 'Cud Chew', 1: 'Armor Tail', H: 'Sap Sipper'},
    Bruxish: {0: 'Dazzling', 1: 'Strong Jaw', H: 'Wonder Skin'},
    Tsareena: {0: 'Leaf Guard', 1: 'Queenly Majesty', H: 'Sweet Veil'},
    Gyarados: {0: 'Intimidate', H: 'Moxie'}
  },
  REPLAY_MOVE_HINTS: {
    'Extreme Speed': ['Normal', 'Physical', 2],
    'Aqua Jet': ['Water', 'Physical', 1]
  },
  DexAdapter: {
    id(value) {
      return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    },
    resolveSpeciesName(value) {
      return String(value || '').trim();
    },
    resolveMoveName(value) {
      return String(value || '').trim();
    },
    getSpecies(name) {
      const abilities = context.FALLBACK_ABILITIES[String(name || '').trim()];
      return abilities ? {abilities} : null;
    },
    getMove() {
      return null;
    }
  },
  movePriority(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return Number(meta?.[2] || 0);
  },
  moveMeta(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return meta ? [meta[0], meta[1], 0, 100, meta[2]] : null;
  },
  moveBlockingAbility() {
    return '';
  },
  dmg(att, def, mv) {
    return {
      def,
      mv,
      moveType: (context.REPLAY_MOVE_HINTS[mv] || ['Normal'])[0],
      move: [null, (context.REPLAY_MOVE_HINTS[mv] || [null, 'Physical'])[1]],
      rolls: new Array(16).fill(50),
      eff: 1,
      min: 50,
      maxd: 50,
      minp: 50,
      maxp: 50,
      ko: 1,
      two: 1,
      three: 1
    };
  },
  detectiveAbilities(species) {
    return Object.values(context.FALLBACK_ABILITIES[species] || {}).filter(Boolean);
  },
  ReplayParser: class ReplayParser {
    moveBlockedAbilities() {
      return [];
    }
    moveAbilityBypassProtectedAbilities() {
      return [];
    }
    abilitySuppressionActive() {
      return false;
    }
    moveAbilityBypass(state) {
      return state?.bypassAbility || '';
    }
    abilityRewardText() {
      return 'base reward';
    }
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/priority-blocking-upgrades.js', 'utf8'),
  context,
  { filename: 'priority-blocking-upgrades.js', timeout: 10000 }
);

const farigiraf = { species: 'Farigiraf', ability: 'Armor Tail' };
const gyarados = { species: 'Gyarados', ability: 'Intimidate' };
const tsareena = { species: 'Tsareena', ability: 'Queenly Majesty' };

const blockedExtremeSpeed = context.dmg({ species: 'Dragonite' }, farigiraf, 'Extreme Speed');
assert(blockedExtremeSpeed.blockedBy === 'Armor Tail', 'Armor Tail should blank direct priority attacks in damage math');
assert(blockedExtremeSpeed.maxd === 0, 'Armor Tail should zero out priority damage rolls');

const blockedAquaJet = context.dmg({ species: 'Palafin' }, tsareena, 'Aqua Jet');
assert(blockedAquaJet.blockedBy === 'Queenly Majesty', 'Queenly Majesty should blank direct priority attacks in damage math');
assert(blockedAquaJet.maxd === 0, 'Queenly Majesty should zero out priority damage rolls');

const liveThunderbolt = context.dmg({ species: 'Zapdos' }, gyarados, 'Thunderbolt');
assert(!liveThunderbolt.blockedBy, 'non-priority moves should stay live');
assert(liveThunderbolt.maxd > 0, 'non-priority moves should keep their normal damage rolls');

const parser = new context.ReplayParser();
const farigirafBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Extreme Speed');
assert(farigirafBlocked.includes('Armor Tail'), 'landed Extreme Speed should rule out Armor Tail in replay contradictions');

const bruxishBlocked = parser.moveBlockedAbilities({ species: 'Bruxish' }, 'Aqua Jet');
assert(bruxishBlocked.includes('Dazzling'), 'landed Aqua Jet should rule out Dazzling in replay contradictions');

const nonPriorityBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Thunderbolt');
assert(!nonPriorityBlocked.includes('Armor Tail'), 'non-priority moves should not fabricate priority-blocking contradictions');

const bypassProtected = parser.moveAbilityBypassProtectedAbilities({ species: 'Farigiraf', bypassAbility: 'Mold Breaker' }, 'Extreme Speed');
assert(bypassProtected.includes('Armor Tail'), 'bypass notes should still know Armor Tail was the ignored protection');

const reward = parser.abilityRewardText('Armor Tail');
assert(/priority/i.test(reward), 'priority blockers should explain their actual tactical reward');

const farigirafSpecies = context.DexAdapter.getSpecies('Farigiraf');
assert(farigirafSpecies?.abilities?.[1] === 'Armor Tail', 'Farigiraf fallback data should expose Armor Tail offline');

console.log('[OK] priority blocking upgrades passed');