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
    'Kommo-o': {0: 'Bulletproof', 1: 'Soundproof', H: 'Overcoat'},
    Brambleghast: {0: 'Wind Rider'},
    Gholdengo: {0: 'Good as Gold'}
  },
  REPLAY_MOVE_HINTS: {
    'Bug Buzz': ['Bug', 'Special', 0],
    'Shadow Ball': ['Ghost', 'Special', 0],
    'Bleakwind Storm': ['Flying', 'Special', 0],
    'Sleep Powder': ['Grass', 'Status', 0],
    'Thunder Wave': ['Electric', 'Status', 0]
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
  moveMeta(move) {
    const meta = context.REPLAY_MOVE_HINTS[String(move || '').trim()];
    return meta ? [meta[0], meta[1], 0, 100, meta[2]] : null;
  },
  moveCategory(move) {
    return context.REPLAY_MOVE_HINTS[String(move || '').trim()]?.[1] || '';
  },
  moveBlockingAbility() {
    return '';
  },
  dmg(att, def, mv) {
    return {
      att,
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
    moveContradictionNote() {
      return '';
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
    joinWithOr(values = []) {
      return values.join(' or ');
    }
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/move-immunity-upgrades.js', 'utf8'),
  context,
  { filename: 'src/move-immunity-upgrades.js', timeout: 10000 }
);

const soundproofBlocked = context.dmg(
  { species: 'Volcarona', ability: 'Flame Body' },
  { species: 'Kommo-o', ability: 'Soundproof' },
  'Bug Buzz'
);
assert(soundproofBlocked.blockedBy === 'Soundproof', 'Soundproof should still blank sound moves without a bypass ability');
assert(soundproofBlocked.maxd === 0, 'Soundproof should still zero normal Bug Buzz damage');

const moldBreakerSoundproof = context.dmg(
  { species: 'Haxorus', ability: 'Mold Breaker' },
  { species: 'Kommo-o', ability: 'Soundproof' },
  'Bug Buzz'
);
assert(!moldBreakerSoundproof.blockedBy, 'Mold Breaker should let Bug Buzz bypass Soundproof in damage math');
assert(moldBreakerSoundproof.maxd > 0, 'Mold Breaker should keep live damage rolls into Soundproof');

const turboblazeBulletproof = context.dmg(
  { species: 'Reshiram', ability: 'Turboblaze' },
  { species: 'Kommo-o', ability: 'Bulletproof' },
  'Shadow Ball'
);
assert(!turboblazeBulletproof.blockedBy, 'Turboblaze should let Shadow Ball bypass Bulletproof in damage math');
assert(turboblazeBulletproof.maxd > 0, 'Turboblaze should keep live damage rolls into Bulletproof');

const teravoltWindRider = context.dmg(
  { species: 'Zekrom', ability: 'Teravolt' },
  { species: 'Brambleghast', ability: 'Wind Rider' },
  'Bleakwind Storm'
);
assert(!teravoltWindRider.blockedBy, 'Teravolt should let Bleakwind Storm bypass Wind Rider in damage math');
assert(teravoltWindRider.maxd > 0, 'Teravolt should keep live damage rolls into Wind Rider');

const myceliumMightSoundproof = context.dmg(
  { species: 'Toedscruel', ability: 'Mycelium Might' },
  { species: 'Kommo-o', ability: 'Soundproof' },
  'Bug Buzz'
);
assert(myceliumMightSoundproof.blockedBy === 'Soundproof', 'Mycelium Might should not bypass damaging move immunities');
assert(myceliumMightSoundproof.maxd === 0, 'Mycelium Might should keep damaging sound moves blocked');

const parser = new context.ReplayParser();
const soundproofBypass = parser.moveBlockedAbilities({ species: 'Kommo-o', bypassAbility: 'Mold Breaker' }, 'Bug Buzz');
assert(!soundproofBypass.includes('Soundproof'), 'Mold Breaker replay windows should keep Soundproof live instead of ruling it out');

const bulletproofBypass = parser.moveBlockedAbilities({ species: 'Kommo-o', bypassAbility: 'Turboblaze' }, 'Shadow Ball');
assert(!bulletproofBypass.includes('Bulletproof'), 'Turboblaze replay windows should keep Bulletproof live instead of ruling it out');

const windRiderBypass = parser.moveBlockedAbilities({ species: 'Brambleghast', bypassAbility: 'Teravolt' }, 'Bleakwind Storm');
assert(!windRiderBypass.includes('Wind Rider'), 'Teravolt replay windows should keep Wind Rider live instead of ruling it out');

const overcoatBypass = parser.moveBlockedAbilities({ species: 'Kommo-o', bypassAbility: 'Mycelium Might' }, 'Sleep Powder');
assert(!overcoatBypass.includes('Overcoat'), 'Mycelium Might status windows should keep Overcoat live instead of ruling it out');

const safeSoundproof = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Bug Buzz');
assert(safeSoundproof.includes('Soundproof'), 'without a bypass window, Bug Buzz should still rule out Soundproof');

console.log('[OK] move immunity bypass upgrades passed');