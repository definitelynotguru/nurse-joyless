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
    'Kommo-o': { 0: 'Bulletproof', 1: 'Soundproof', H: 'Overcoat' },
    Brambleghast: { 0: 'Wind Rider' }
  },
  REPLAY_MOVE_HINTS: {
    'Boomburst': ['Normal', 'Special', 0],
    'Electro Ball': ['Electric', 'Special', 0],
    'Fairy Wind': ['Fairy', 'Special', 0]
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
      return abilities ? { abilities } : null;
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
      move: [null, (context.REPLAY_MOVE_HINTS[mv] || [null, 'Special'])[1]],
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
    moveContradictionNote() {
      return '';
    }
    joinWithOr(list = []) {
      return list.join(' or ');
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

const soundproofBoomBurst = context.dmg({ species: 'Noivern' }, { species: 'Kommo-o', ability: 'Soundproof' }, 'Boomburst');
assert(soundproofBoomBurst.blockedBy === 'Soundproof', 'Soundproof should blank omitted sound moves like Boomburst in damage math');
assert(soundproofBoomBurst.maxd === 0, 'Soundproof should zero the Boomburst damage rolls once coverage exists');

const moldBreakerBoomBurst = context.dmg({ species: 'Haxorus', ability: 'Mold Breaker' }, { species: 'Kommo-o', ability: 'Soundproof' }, 'Boomburst');
assert(!moldBreakerBoomBurst.blockedBy, 'Mold Breaker should still bypass Soundproof on Boomburst');
assert(moldBreakerBoomBurst.maxd > 0, 'Mold Breaker should keep Boomburst live after bypassing Soundproof');

const bulletproofElectroBall = context.dmg({ species: 'Jolteon' }, { species: 'Kommo-o', ability: 'Bulletproof' }, 'Electro Ball');
assert(bulletproofElectroBall.blockedBy === 'Bulletproof', 'Bulletproof should blank omitted ball moves like Electro Ball in damage math');
assert(bulletproofElectroBall.maxd === 0, 'Bulletproof should zero the Electro Ball damage rolls once coverage exists');

const windRiderFairyWind = context.dmg({ species: 'Flutter Mane' }, { species: 'Brambleghast', ability: 'Wind Rider' }, 'Fairy Wind');
assert(windRiderFairyWind.blockedBy === 'Wind Rider', 'Wind Rider should blank omitted wind moves like Fairy Wind in damage math');
assert(windRiderFairyWind.maxd === 0, 'Wind Rider should zero the Fairy Wind damage rolls once coverage exists');

const parser = new context.ReplayParser();

const soundproofBlocked = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Boomburst');
assert(soundproofBlocked.includes('Soundproof'), 'Replay contradictions should rule out Soundproof after Boomburst lands');

const bulletproofBlocked = parser.moveBlockedAbilities({ species: 'Kommo-o' }, 'Electro Ball');
assert(bulletproofBlocked.includes('Bulletproof'), 'Replay contradictions should rule out Bulletproof after Electro Ball lands');

const windRiderBlocked = parser.moveBlockedAbilities({ species: 'Brambleghast' }, 'Fairy Wind');
assert(windRiderBlocked.includes('Wind Rider'), 'Replay contradictions should rule out Wind Rider after Fairy Wind lands');

assert(parser.abilityClueLabel('Soundproof', 'Boomburst') === 'Soundproof blocked Boomburst', 'Soundproof clue labels should preserve omitted sound move names');
assert(parser.abilityClueLabel('Bulletproof', 'Electro Ball') === 'Bulletproof blocked Electro Ball', 'Bulletproof clue labels should preserve omitted ball move names');
assert(parser.abilityClueLabel('Wind Rider', 'Fairy Wind') === 'Wind Rider activated on Fairy Wind', 'Wind Rider clue labels should preserve omitted wind move names');

assert(parser.moveContradictionNote({ species: 'Kommo-o' }, 'Boomburst') === 'Boomburst successfully landed, so Soundproof impossible as the current ability.', 'Soundproof contradiction notes should stay move-specific for omitted sound moves');

console.log('[OK] move immunity family coverage passed');