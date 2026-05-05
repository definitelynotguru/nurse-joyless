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
    'Aqua Jet': ['Water', 'Physical', 1],
    'Extreme Speed': ['Normal', 'Physical', 2],
    'Helping Hand': ['Normal', 'Status', 5],
    Protect: ['Normal', 'Status', 4],
    Quash: ['Dark', 'Status', 1]
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
  moveCategory(move) {
    return context.REPLAY_MOVE_HINTS[String(move || '').trim()]?.[1] || 'Status';
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
    constructor() {
      this.turnMoves = [];
      this.revealed = [];
      this.states = {};
    }
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
    abilityTriggeredByMove() {
      return false;
    }
    abilityClueLabel(ability) {
      return `${ability} revealed`;
    }
    abilityClueLabelWithProof(ability) {
      return `${ability} revealed`;
    }
    reactiveAbilityProof() {
      return false;
    }
    ensureState(target) {
      const raw = String(target || '');
      const species = raw.split(':').slice(1).join(':').trim();
      const slot = raw.split(':')[0].trim();
      const key = `${slot}|${species}`;
      if (!this.states[key]) this.states[key] = {species, slot, abilityHints: []};
      return this.states[key];
    }
    recordAbilityReveal(state, turn, ability, moveEvent, text, clueLabel) {
      if (!state.abilityHints.includes(ability)) state.abilityHints.push(ability);
      this.revealed.push({
        state,
        turn,
        ability,
        move: moveEvent?.move || '',
        label: clueLabel,
        text
      });
    }
    extractEvidence() {
      return 'base';
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

const liveProtect = context.dmg({ species: 'Farigiraf' }, farigiraf, 'Protect');
assert(!liveProtect.blockedBy, 'self-targeting support priority should not be treated as an Armor Tail damage block');
assert(liveProtect.maxd > 0, 'self-targeting support priority should keep the normal calculator path');

const parser = new context.ReplayParser();
const farigirafBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Extreme Speed');
assert(farigirafBlocked.includes('Armor Tail'), 'landed Extreme Speed should rule out Armor Tail in replay contradictions');

const bruxishBlocked = parser.moveBlockedAbilities({ species: 'Bruxish' }, 'Aqua Jet');
assert(bruxishBlocked.includes('Dazzling'), 'landed Aqua Jet should rule out Dazzling in replay contradictions');

const nonPriorityBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Thunderbolt');
assert(!nonPriorityBlocked.includes('Armor Tail'), 'non-priority moves should not fabricate priority-blocking contradictions');

const supportBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Helping Hand');
assert(!supportBlocked.includes('Armor Tail'), 'self or ally support priority should not fabricate Armor Tail contradictions');

const protectBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Protect');
assert(!protectBlocked.includes('Armor Tail'), 'Protect should not count as blockable priority against Armor Tail');

const quashBlocked = parser.moveBlockedAbilities({ species: 'Farigiraf' }, 'Quash');
assert(quashBlocked.includes('Armor Tail'), 'foe-targeting priority status like Quash should still count as blocked by Armor Tail');

const bypassProtected = parser.moveAbilityBypassProtectedAbilities({ species: 'Farigiraf', bypassAbility: 'Mold Breaker' }, 'Extreme Speed');
assert(bypassProtected.includes('Armor Tail'), 'bypass notes should still know Armor Tail was the ignored protection');

const reward = parser.abilityRewardText('Armor Tail');
assert(/priority/i.test(reward), 'priority blockers should explain their actual tactical reward');

const farigirafSpecies = context.DexAdapter.getSpecies('Farigiraf');
assert(farigirafSpecies?.abilities?.[1] === 'Armor Tail', 'Farigiraf fallback data should expose Armor Tail offline');

assert(parser.abilityTriggeredByMove('Armor Tail', 'Extreme Speed'), 'priority blockers should count as move-triggered reveals for replay clue labeling');
assert(parser.abilityClueLabel('Dazzling', 'Aqua Jet') === 'Dazzling blocked Aqua Jet', 'priority blockers should keep move-specific replay clue labels');
assert(parser.abilityClueLabelWithProof('Queenly Majesty', 'Extreme Speed', true) === 'Queenly Majesty blocked Extreme Speed', 'proof-backed priority blocker labels should stay move-specific');
assert(parser.reactiveAbilityProof('Armor Tail'), 'priority blockers should count as hard reactive replay proof');

parser.turnMoves = [{ slot: 'p1a', species: 'Dragonite', move: 'Extreme Speed' }];
parser.extractEvidence({ type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' }, 3);
assert(parser.revealed.length === 1, 'explicit blocked-priority replay events should create an ability reveal');
assert(parser.revealed[0].ability === 'Armor Tail', 'blocked-priority replay events should reveal the correct ability');
assert(parser.revealed[0].label === 'Armor Tail blocked Extreme Speed', 'blocked-priority replay events should preserve the blocked move in the clue label');
assert(parser.revealed[0].state.abilityHints.includes('Armor Tail'), 'blocked-priority replay events should anchor the live ability hint');

parser.revealed = [];
parser.turnMoves = [{ slot: 'p1a', species: 'Farigiraf', move: 'Helping Hand' }];
parser.extractEvidence({ type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' }, 4);
assert(parser.revealed.length === 0, 'support priority activate events should not fabricate a priority-blocker reveal');

parser.revealed = [];
parser.turnMoves = [{ slot: 'p1a', species: 'Zapdos', move: 'Thunderbolt' }];
parser.extractEvidence({ type: '-activate', target: 'p2a: Farigiraf', effect: 'ability: Armor Tail' }, 5);
assert(parser.revealed.length === 0, 'non-priority activate events should not fabricate a priority-blocker reveal');

console.log('[OK] priority blocking upgrades passed');