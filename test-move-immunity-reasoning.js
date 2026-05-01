const fs = require('fs');
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
vm.runInContext(fs.readFileSync('src/app.js', 'utf8'), context, { filename: 'app.js', timeout: 10000 });
vm.runInContext(fs.readFileSync('src/replay-ability-upgrades.js', 'utf8'), context, { filename: 'replay-ability-upgrades.js', timeout: 10000 });
vm.runInContext(fs.readFileSync('src/move-immunity-upgrades.js', 'utf8'), context, { filename: 'move-immunity-upgrades.js', timeout: 10000 });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const soundproofRoll = vm.runInContext(
  `dmg(
    preset('Primarina','Leftovers','Modest',{hp:252,atk:0,def:0,spa:252,spd:4,spe:0},['Hyper Voice','Moonblast','Protect','Psychic Noise']),
    {...preset('Kommo-o','Leftovers','Careful',{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},['Body Press','Stealth Rock','Protect','Dragon Dance']), ability:'Soundproof'},
    'Hyper Voice',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(soundproofRoll.blockedBy === 'Soundproof', 'Soundproof should zero out sound-move damage math');
assert(soundproofRoll.maxd === 0, 'Soundproof should produce zero-damage rolls on sound moves');

const soundproofControlRoll = vm.runInContext(
  `dmg(
    preset('Iron Valiant','Life Orb','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Moonblast','Thunderbolt','Calm Mind','Psyshock']),
    {...preset('Kommo-o','Leftovers','Careful',{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},['Body Press','Stealth Rock','Protect','Dragon Dance']), ability:'Soundproof'},
    'Moonblast',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(soundproofControlRoll.blockedBy === '', 'Soundproof should not block unrelated non-sound moves');
assert(soundproofControlRoll.maxd > 0, 'non-sound moves should still deal damage through Soundproof');

const bulletproofRoll = vm.runInContext(
  `dmg(
    preset('Dragapult','Choice Specs','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Shadow Ball','Draco Meteor','Flamethrower','U-turn']),
    {...preset('Kommo-o','Leftovers','Careful',{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},['Body Press','Stealth Rock','Protect','Dragon Dance']), ability:'Bulletproof'},
    'Shadow Ball',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(bulletproofRoll.blockedBy === 'Bulletproof', 'Bulletproof should zero out ball-and-bomb move damage math');
assert(bulletproofRoll.maxd === 0, 'Bulletproof should produce zero-damage rolls on blocked projectiles');

const bulletproofControlRoll = vm.runInContext(
  `dmg(
    preset('Dragapult','Choice Specs','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Draco Meteor','Flamethrower','Shadow Ball','U-turn']),
    {...preset('Kommo-o','Leftovers','Careful',{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},['Body Press','Stealth Rock','Protect','Dragon Dance']), ability:'Bulletproof'},
    'Draco Meteor',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(bulletproofControlRoll.blockedBy === '', 'Bulletproof should not block unrelated non-projectile moves');
assert(bulletproofControlRoll.maxd > 0, 'non-projectile moves should still deal damage through Bulletproof');

const windRiderRoll = vm.runInContext(
  `dmg(
    preset('Tornadus-Therian','Assault Vest','Timid',{hp:252,atk:0,def:0,spa:4,spd:0,spe:252},['Bleakwind Storm','Heat Wave','Knock Off','U-turn']),
    {...preset('Brambleghast','Heavy-Duty Boots','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Power Whip','Shadow Ball','Rapid Spin','Spikes']), ability:'Wind Rider'},
    'Bleakwind Storm',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(windRiderRoll.blockedBy === 'Wind Rider', 'Wind Rider should zero out wind-move damage math');
assert(windRiderRoll.maxd === 0, 'Wind Rider should produce zero-damage rolls on wind moves');

const windRiderControlRoll = vm.runInContext(
  `dmg(
    preset('Dragapult','Choice Specs','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Shadow Ball','Draco Meteor','Flamethrower','U-turn']),
    {...preset('Brambleghast','Heavy-Duty Boots','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Power Whip','Shadow Ball','Rapid Spin','Spikes']), ability:'Wind Rider'},
    'Shadow Ball',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(windRiderControlRoll.blockedBy === '', 'Wind Rider should not block unrelated non-wind moves');
assert(windRiderControlRoll.maxd > 0, 'non-wind moves should still deal damage through Wind Rider');

const soundproofReplayLog = '|turn|1\n|switch|p1a: Volcarona|Volcarona, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Volcarona|Bug Buzz|p2a: Kommo-o\n|-immune|p2a: Kommo-o|[from] ability: Soundproof';
const soundproofReplayRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(soundproofReplayLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
assert(soundproofReplayRead.strongest?.detectiveInputs?.[0]?.label === 'Soundproof blocked Bug Buzz', 'replay clues should keep the actual sound move name for Soundproof');

const bulletproofReplayLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Dragapult|Shadow Ball|p2a: Kommo-o\n|-immune|p2a: Kommo-o|[from] ability: Bulletproof';
const bulletproofReplayRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bulletproofReplayLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
assert(bulletproofReplayRead.strongest?.detectiveInputs?.[0]?.label === 'Bulletproof blocked Shadow Ball', 'replay clues should keep the actual projectile move name for Bulletproof');

const windRiderReplayLog = '|turn|1\n|switch|p1a: Tornadus-Therian|Tornadus-Therian, L80\n|switch|p2a: Brambleghast|Brambleghast, L80\n|move|p1a: Tornadus-Therian|Bleakwind Storm|p2a: Brambleghast\n|-boost|p2a: Brambleghast|atk|1|[from] ability: Wind Rider';
const windRiderReplayRead = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(windRiderReplayLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
assert(windRiderReplayRead.strongest?.detectiveInputs?.[0]?.label === 'Wind Rider activated on Bleakwind Storm', 'replay clues should keep the actual wind move name for Wind Rider');

console.log('[OK] move immunity reasoning passed');
