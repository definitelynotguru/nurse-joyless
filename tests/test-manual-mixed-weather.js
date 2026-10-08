const fs = require('fs');
const vm = require('vm');

function clampScore(value, cap) {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(cap, numeric));
}

function makeContext() {
  const ctx = {
    console,
    unique(values = []) { return [...new Set(values)]; },
    njCap: clampScore,
    offensiveMoveTypes(mon) { return mon.offensiveTypes || []; },
    types(mon) { return mon.types || []; },
    profileTeam(team = []) {
      return {
        drought: team.filter(mon => mon.ability === 'Drought').map(mon => mon.species),
        drizzle: team.filter(mon => mon.ability === 'Drizzle').map(mon => mon.species),
        hazards: team.filter(mon => mon.moves.some(move => ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web'].includes(move))).map(mon => mon.species),
        layers: team.filter(mon => mon.moves.some(move => ['Spikes', 'Toxic Spikes', 'Sticky Web'].includes(move))).map(mon => mon.species),
        removalDenial: team.filter(mon => mon.isRemovalDenial).map(mon => mon.species),
        pivot: team.filter(mon => mon.moves.some(move => ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Teleport'].includes(move))).map(mon => mon.species),
        defensiveAnchors: team.filter(mon => mon.isDefensiveAnchor).map(mon => mon.species),
      };
    },
    detectIdentities() {
      return {
        primary: { name: 'Rain Offense', score: 86, evidence: ['base read'] },
        secondary: [],
        all: [
          { name: 'Rain Offense', score: 86, evidence: ['base read'] },
          { name: 'Sun Offense', score: 84, evidence: ['base read'] },
          { name: 'Sun Room', score: 80, evidence: ['base read'] },
          { name: 'Trick Room Offense', score: 82, evidence: ['base read'] },
          { name: 'Balance', score: 73, evidence: ['base read'] },
          { name: 'Bulky Offense', score: 70, evidence: ['base read'] },
        ],
      };
    },
    evaluateSynergy() {
      return {
        scores: { winReliability: 81, speedControl: 79, roleCompression: 76, offensiveCoverage: 78, fieldControl: 79 },
        issues: [],
      };
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/weather-identity-upgrades.js', 'utf8'), ctx, { filename: 'weather-identity-upgrades.js' });
  return ctx;
}

function mon(species, {
  ability = '',
  item = 'Leftovers',
  moves = [],
  offensiveTypes = [],
  types = [],
  baseSpeed = 80,
  atk = 95,
  spa = 95,
  isDefensiveAnchor = false,
  isRemovalDenial = false,
} = {}) {
  return {
    species,
    ability,
    item,
    moves,
    offensiveTypes,
    types,
    baseStats: { spe: baseSpeed, atk, spa },
    isDefensiveAnchor,
    isRemovalDenial,
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ctx = makeContext();

const manualMixedWeatherTeam = [
  mon('Tornadus-Therian', { moves: ['Rain Dance', 'Hurricane', 'U-turn', 'Knock Off'], types: ['Flying'], offensiveTypes: ['Flying', 'Dark'], baseSpeed: 121, atk: 100, spa: 110 }),
  mon('Whimsicott', { moves: ['Sunny Day', 'Encore', 'U-turn', 'Moonblast'], types: ['Grass', 'Fairy'], offensiveTypes: ['Grass', 'Fairy'], baseSpeed: 116, atk: 77, spa: 77 }),
  mon('Walking Wake', { ability: 'Protosynthesis', moves: ['Hydro Steam', 'Draco Meteor', 'Flamethrower', 'Flip Turn'], types: ['Water', 'Dragon'], offensiveTypes: ['Water', 'Dragon', 'Fire'], baseSpeed: 109, atk: 83, spa: 125 }),
  mon('Zapdos', { moves: ['Thunder', 'Volt Switch', 'Roost', 'Weather Ball'], types: ['Electric', 'Flying'], offensiveTypes: ['Electric', 'Flying'], baseSpeed: 100, atk: 90, spa: 125 }),
  mon('Great Tusk', { moves: ['Rapid Spin', 'Stealth Rock', 'Headlong Rush', 'Knock Off'], types: ['Ground', 'Fighting'], offensiveTypes: ['Ground', 'Dark', 'Fighting'], baseSpeed: 87, atk: 131, spa: 53 }),
  mon('Kingambit', { moves: ['Sucker Punch', 'Kowtow Cleave', 'Iron Head', 'Swords Dance'], types: ['Dark', 'Steel'], offensiveTypes: ['Dark', 'Steel'], baseSpeed: 50, atk: 135, spa: 60 }),
];

const profile = ctx.profileTeam(manualMixedWeatherTeam, {});
assert(profile.rainSetters.length === 1, 'expected one manual rain setter');
assert(profile.sunSetters.length === 1, 'expected one manual sun setter');
assert(profile.weatherConflict, 'manual Rain Dance plus Sunny Day should count as a weather conflict');

const identity = ctx.detectIdentities(manualMixedWeatherTeam, {}, profile);
const rainRow = identity.all.find(row => row.name === 'Rain Offense');
const sunRow = identity.all.find(row => row.name === 'Sun Offense');
const balanceRow = identity.all.find(row => row.name === 'Balance');
assert(rainRow.score < balanceRow.score, 'manual mixed-weather shell should demote Rain Offense below the non-weather balance read');
assert(sunRow.score < balanceRow.score, 'manual mixed-weather shell should demote Sun Offense below the non-weather balance read');
assert(rainRow.evidence.some(line => /conflicting rain and sun setters/i.test(line)), 'rain row should explain the manual weather conflict');
assert(sunRow.evidence.some(line => /conflicting rain and sun setters/i.test(line)), 'sun row should explain the manual weather conflict');

const synergy = ctx.evaluateSynergy(manualMixedWeatherTeam, {}, profile, identity);
assert(synergy.scores.winReliability < 81, 'manual mixed-weather shell should lose win reliability');
assert(synergy.scores.roleCompression < 76, 'manual mixed-weather shell should lose role-compression score');
assert(synergy.issues.some(issue => issue.title === 'Conflicting weather plan'), 'manual mixed-weather shell should surface the conflicting weather issue');

const goodManualRainTeam = [
  mon('Tornadus-Therian', { moves: ['Rain Dance', 'Hurricane', 'U-turn', 'Knock Off'], types: ['Flying'], offensiveTypes: ['Flying', 'Dark'], baseSpeed: 121, atk: 100, spa: 110 }),
  mon('Barraskewda', { ability: 'Swift Swim', item: 'Choice Band', moves: ['Waterfall', 'Close Combat', 'Flip Turn', 'Aqua Jet'], types: ['Water'], offensiveTypes: ['Water', 'Fighting'], baseSpeed: 136, atk: 123, spa: 60 }),
  mon('Zapdos', { moves: ['Thunder', 'Volt Switch', 'Roost', 'Weather Ball'], types: ['Electric', 'Flying'], offensiveTypes: ['Electric', 'Flying'], baseSpeed: 100, atk: 90, spa: 125 }),
  mon('Archaludon', { moves: ['Draco Meteor', 'Thunder', 'Flash Cannon', 'Body Press'], types: ['Steel', 'Dragon'], offensiveTypes: ['Dragon', 'Electric', 'Steel', 'Fighting'], baseSpeed: 85, atk: 105, spa: 125 }),
  mon('Great Tusk', { moves: ['Rapid Spin', 'Stealth Rock', 'Headlong Rush', 'Knock Off'], types: ['Ground', 'Fighting'], offensiveTypes: ['Ground', 'Dark', 'Fighting'], baseSpeed: 87, atk: 131, spa: 53 }),
  mon('Raging Bolt', { moves: ['Thunderclap', 'Thunder', 'Dragon Pulse', 'Calm Mind'], types: ['Electric', 'Dragon'], offensiveTypes: ['Electric', 'Dragon'], baseSpeed: 75, atk: 73, spa: 137 }),
];

const goodRainProfile = ctx.profileTeam(goodManualRainTeam, {});
assert(!goodRainProfile.weatherConflict, 'a single manual rain setter without sun support should not create a weather conflict');
const goodRainIdentity = ctx.detectIdentities(goodManualRainTeam, {}, goodRainProfile);
assert(goodRainIdentity.all.find(row => row.name === 'Rain Offense').score === 86, 'good manual rain team should keep the original Rain Offense confidence');
const goodRainSynergy = ctx.evaluateSynergy(goodManualRainTeam, {}, goodRainProfile, goodRainIdentity);
assert(!goodRainSynergy.issues.some(issue => issue.title === 'Conflicting weather plan'), 'good manual rain team should not inherit the mixed-weather conflict issue');

const goodManualSunTeam = [
  mon('Whimsicott', { moves: ['Sunny Day', 'Encore', 'U-turn', 'Moonblast'], types: ['Grass', 'Fairy'], offensiveTypes: ['Grass', 'Fairy'], baseSpeed: 116, atk: 77, spa: 77 }),
  mon('Walking Wake', { ability: 'Protosynthesis', moves: ['Hydro Steam', 'Draco Meteor', 'Flamethrower', 'Flip Turn'], types: ['Water', 'Dragon'], offensiveTypes: ['Water', 'Dragon', 'Fire'], baseSpeed: 109, atk: 83, spa: 125 }),
  mon('Charizard', { moves: ['Flamethrower', 'Weather Ball', 'Solar Beam', 'Roost'], types: ['Fire', 'Flying'], offensiveTypes: ['Fire', 'Flying', 'Grass', 'Normal'], baseSpeed: 100, atk: 84, spa: 109 }),
  mon('Venusaur', { ability: 'Chlorophyll', moves: ['Growth', 'Giga Drain', 'Weather Ball', 'Sleep Powder'], types: ['Grass', 'Poison'], offensiveTypes: ['Grass', 'Normal'], baseSpeed: 80, atk: 82, spa: 100 }),
  mon('Great Tusk', { moves: ['Rapid Spin', 'Stealth Rock', 'Headlong Rush', 'Knock Off'], types: ['Ground', 'Fighting'], offensiveTypes: ['Ground', 'Dark', 'Fighting'], baseSpeed: 87, atk: 131, spa: 53 }),
  mon('Kingambit', { moves: ['Sucker Punch', 'Kowtow Cleave', 'Iron Head', 'Swords Dance'], types: ['Dark', 'Steel'], offensiveTypes: ['Dark', 'Steel'], baseSpeed: 50, atk: 135, spa: 60 }),
];

const goodSunProfile = ctx.profileTeam(goodManualSunTeam, {});
assert(!goodSunProfile.weatherConflict, 'a single manual sun setter without rain support should not create a weather conflict');
const goodSunIdentity = ctx.detectIdentities(goodManualSunTeam, {}, goodSunProfile);
assert(goodSunIdentity.all.find(row => row.name === 'Sun Offense').score === 84, 'good manual sun team should keep the original Sun Offense confidence');
const goodSunSynergy = ctx.evaluateSynergy(goodManualSunTeam, {}, goodSunProfile, goodSunIdentity);
assert(!goodSunSynergy.issues.some(issue => issue.title === 'Conflicting weather plan'), 'good manual sun team should not inherit the mixed-weather conflict issue');

console.log('[OK] manual mixed-weather conflict regression passed');