const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeFakeElement(value = '') {
  return {
    value,
    checked: false,
    innerHTML: '',
    innerText: '',
    textContent: '',
    className: '',
    _items: [],
    options: [],
    onclick: null,
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return makeFakeElement(); },
    querySelectorAll(){ return []; },
    scrollIntoView(){},
    appendChild(){},
    click(){},
    closest(){ return null; },
    getBoundingClientRect(){ return { top: 999 }; },
  };
}

const elements = {};
const context = {
  console,
  setTimeout(fn){ if (typeof fn === 'function') fn(); return 0; },
  clearTimeout(){},
  TextDecoder,
  alert(){},
  localStorage: { getItem(){ return ''; }, setItem(){} },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  document: {
    addEventListener(){},
    getElementById(id) { if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
    querySelectorAll(){ return []; },
    querySelector(){ return null; },
    createElement(){ return makeFakeElement(); },
  },
  window: null,
  URL: { createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  Blob: function Blob(){},
  fetch: async () => { throw new Error('offline'); },
};
context.window = context;
context.addEventListener = function(){};

vm.createContext(context);
const source = [
  fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'src/validation-fixes.js'), 'utf8'),
].join('\n');
vm.runInContext(source, context, { filename: 'validation-runtime.js', timeout: 10000 });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const TEAM = `Queenmaker (Kingambit) (F) @ Leftovers
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Low Kick

Volcanion @ Heavy-Duty Boots
Ability: Water Absorb
Tera Type: Stellar
EVs: 248 HP / 252 SpA / 8 SpD
Modest Nature
- Steam Eruption
- Flamethrower
- Taunt
- Protect

Deoxys-Speed @ Life Orb
Ability: Pressure
Tera Type: Psychic
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Psycho Boost
- Superpower
- Taunt
- Shadow Ball

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Fairy
EVs: 4 Atk / 252 SpA / 252 Spe
Naive Nature
- Moonblast
- Close Combat
- Encore
- Knock Off

Iron Treads @ Leftovers
Ability: Quark Drive
Tera Type: Ghost
EVs: 252 Atk / 4 SpD / 252 Spe
Jolly Nature
- Stealth Rock
- Earthquake
- Knock Off
- Rapid Spin

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Tera Type: Flying
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Earthquake
- U-turn
- Stone Edge
- Taunt`;

const parsedTeam = vm.runInContext(`parseTeam(${JSON.stringify(TEAM)})`, context, { timeout: 10000 });
assert(parsedTeam.length === 6, 'expected all six sets to parse');
assert(parsedTeam[0].species === 'Kingambit', 'gender tags should not replace the species name');
assert(parsedTeam[0].item === 'Leftovers', 'gender-tag parsing should preserve the item');
assert(parsedTeam[1].species === 'Volcanion', 'Volcanion should resolve through fallback species data');
assert(parsedTeam[1].tera === 'Stellar', 'Stellar should be preserved through team parsing');

const validationRows = vm.runInContext(`validateTeamAdvanced(parseTeam(${JSON.stringify(TEAM)}))`, context, { timeout: 10000 });
assert(validationRows.length === 6, 'validator should return one row per parsed set');
validationRows.forEach(row => {
  assert(row.status !== 'invalid', `${row.species} should not be marked invalid by fallback validator gaps`);
  assert(!row.issues.some(issue => /unknown move/i.test(issue)), `${row.species} should not report unknown moves`);
  assert(!row.issues.some(issue => /invalid tera type/i.test(issue)), `${row.species} should not report an invalid Tera type here`);
  assert(!row.warnings.some(issue => /unknown or unsupported form/i.test(issue)), `${row.species} should not warn that a patched fallback species is unsupported`);
  assert(!row.warnings.some(issue => /ability data unavailable/i.test(issue)), `${row.species} should not lose ability validation once fallback data is applied`);
});

const volcanionRow = validationRows.find(row => row.species === 'Volcanion');
assert(volcanionRow, 'Volcanion should stay present in the validation output');

const ironValiantRow = validationRows.find(row => row.species === 'Iron Valiant');
assert(ironValiantRow, 'Iron Valiant should stay present in the validation output');

const rowSummary = JSON.stringify(validationRows);
[
  'unknown move: low kick',
  'unknown move: steam eruption',
  'unknown move: taunt',
  'unknown move: psycho boost',
  'unknown move: superpower',
  'unknown or unsupported form',
  'ability data unavailable',
  'invalid tera type',
].forEach(fragment => {
  assert(!rowSummary.toLowerCase().includes(fragment), `validation output should not include false fallback gap text: ${fragment}`);
});

const dexChecks = vm.runInContext(`({
  volcanion: !!DexAdapter.getSpecies('Volcanion'),
  deoxysSpeed: !!DexAdapter.getSpecies('Deoxys-Speed'),
  steamEruption: !!moveData('Steam Eruption'),
  superpower: !!moveData('Superpower'),
  lowKick: !!moveData('Low Kick'),
  taunt: !!moveData('Taunt')
})`, context, { timeout: 10000 });
assert(Object.values(dexChecks).every(Boolean), 'fallback species and move tables should include the validator regression data');

assert(vm.runInContext(`Boolean(NURSE_JOYLESS_VALIDATION_FIXES)`, context, { timeout: 10000 }), 'validation runtime fix flag should be set');

console.log('[OK] validation fixes passed');
