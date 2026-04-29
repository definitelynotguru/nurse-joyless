const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = [
  fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'src/validation-fixes.js'), 'utf8'),
].join('\n');

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
    onchange: null,
    style: {},
    dataset: {},
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return makeFakeElement(); },
    querySelectorAll(){ return []; },
    scrollIntoView(){},
    appendChild(){},
    click(){},
    closest(){ return null; },
  };
}

const elements = {};
const context = {
  console,
  setTimeout(fn){ if (typeof fn === 'function') fn(); return 0; },
  clearTimeout(){},
  alert(){},
  localStorage: { getItem(){ return null; }, setItem(){} },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  document: {
    addEventListener(){},
    getElementById(id) { if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return makeFakeElement(); },
  },
  window: { addEventListener(){} },
  URL: { createObjectURL(){ return 'blob:test'; }, revokeObjectURL(){} },
  Blob: function Blob(){},
  fetch: async () => { throw new Error('offline'); },
};
context.window = context;

const teamText = `Pecharunt @ Heavy-Duty Boots
Ability: Poison Puppeteer
Tera Type: Fairy
EVs: 112 HP / 144 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Malignant Chain
- Shadow Ball
- Nasty Plot
- Recover

Kingambit (F) @ Leftovers
Ability: Supreme Overlord
Tera Type: Fighting
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Iron Head
- Low Kick
- Sucker Punch
- Swords Dance

Volcanion @ Leftovers
Ability: Water Absorb
Tera Type: Poison
EVs: 248 HP / 68 Def / 8 SpA / 184 Spe
Modest Nature
IVs: 0 Atk
- Steam Eruption
- Flamethrower
- Taunt
- Will-O-Wisp

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Stellar
EVs: 252 Atk / 4 SpA / 252 Spe
Naive Nature
- Close Combat
- Knock Off
- Moonblast
- Encore

Landorus-Therian @ Rocky Helmet
Ability: Intimidate
Tera Type: Water
EVs: 248 HP / 24 Def / 4 SpD / 232 Spe
Jolly Nature
- Earthquake
- U-turn
- Stealth Rock
- Taunt

Deoxys-Speed @ Eject Pack
Ability: Pressure
Tera Type: Fighting
EVs: 200 Atk / 252 SpA / 56 Spe
Naive Nature
- Psycho Boost
- Superpower
- Knock Off
- Spikes`;

const tests = String.raw`
(function(){
  function assert(cond, msg){ if(!cond) throw new Error(msg); }
  const parsed = parseTeam(${JSON.stringify(teamText)});
  assert(parsed.length === 6, 'team should parse into 6 members');
  assert(parsed[1].species === 'Kingambit', 'gender marker (F) should not become species F');
  assert(parsed[2].species === 'Volcanion', 'Volcanion should resolve through fallback data');
  assert(parsed[5].species === 'Deoxys-Speed', 'Deoxys-Speed should resolve through fallback data');
  assert(moveData('Low Kick'), 'Low Kick should be recognized');
  assert(moveData('Steam Eruption'), 'Steam Eruption should be recognized');
  assert(moveData('Taunt'), 'Taunt should be recognized by validation, not only replay hints');
  assert(moveData('Psycho Boost'), 'Psycho Boost should be recognized');
  assert(moveData('Superpower'), 'Superpower should be recognized');

  const rows = validateTeamAdvanced(parsed);
  assert(Array.isArray(rows) && rows.length === 6, 'validation should return 6 rows');
  const byName = Object.fromEntries(rows.map(row => [(row.mon?.species || row.species || row.name), row]));
  assert(byName.Kingambit, 'validation should contain Kingambit, not F');
  assert(!byName.F, 'validation must not create a fake F species row');
  const rendered = JSON.stringify(rows);
  ['unknown move: Low Kick','unknown move: Steam Eruption','unknown move: Taunt','unknown move: Psycho Boost','unknown move: Superpower','unknown or unsupported form','Ability data unavailable','invalid Tera type'].forEach(text => {
    assert(!rendered.toLowerCase().includes(text.toLowerCase()), 'validation still contains false issue: ' + text);
  });
  ['Pecharunt','Kingambit','Volcanion','Iron Valiant','Landorus-Therian','Deoxys-Speed'].forEach(name => {
    const row = byName[name];
    assert(row, 'missing validation row for ' + name);
    assert(String(row.status).toUpperCase() !== 'INVALID', name + ' should not be hard-invalid from local fallback gaps');
  });
  assert(NURSE_JOYLESS_VALIDATION_FIXES === true, 'validation fixes flag missing');
  console.log('[OK] validation fixes regression passed');
})();
`;

vm.runInNewContext(source + '\n' + tests, context, { timeout: 5000 });
