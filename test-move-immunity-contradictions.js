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

const soundproofDamageLog = '|turn|1\n|switch|p1a: Volcarona|Volcarona, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Volcarona|Bug Buzz|p2a: Kommo-o\n|-damage|p2a: Kommo-o|76/100';
const soundproofDamageParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(soundproofDamageLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const soundproofDamageTarget = soundproofDamageParser.targets.find(t => t.species === 'Kommo-o');
assert(soundproofDamageTarget?.ruledOutAbilities?.includes('Soundproof'), 'taking Bug Buzz should rule out Soundproof');
assert(soundproofDamageTarget?.notes?.some(note => /Bug Buzz successfully landed/i.test(note)), 'taking Bug Buzz should explain the Soundproof contradiction');

vm.runInContext(
  `team=[
    preset("Kommo-o","Leftovers","Careful",{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},["Body Press","Stealth Rock","Protect","Dragon Dance"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: soundproofDamageTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const soundproofDamageRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!soundproofDamageRead.abilityRows.some(([name]) => name === 'Soundproof'), 'taking Bug Buzz should remove Soundproof from the live detective pool');
assert(soundproofDamageRead.summary.notes.some(x => /Soundproof impossible/i.test(x)), 'taking Bug Buzz should carry the Soundproof contradiction into detective notes');

const bulletproofDamageLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Kommo-o|Kommo-o, L80\n|move|p1a: Dragapult|Shadow Ball|p2a: Kommo-o\n|-damage|p2a: Kommo-o|73/100';
const bulletproofDamageParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bulletproofDamageLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const bulletproofDamageTarget = bulletproofDamageParser.targets.find(t => t.species === 'Kommo-o');
assert(bulletproofDamageTarget?.ruledOutAbilities?.includes('Bulletproof'), 'taking Shadow Ball should rule out Bulletproof');
assert(bulletproofDamageTarget?.notes?.some(note => /Shadow Ball successfully landed/i.test(note)), 'taking Shadow Ball should explain the Bulletproof contradiction');

vm.runInContext(
  `team=[
    preset("Kommo-o","Leftovers","Careful",{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},["Body Press","Stealth Rock","Protect","Dragon Dance"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: bulletproofDamageTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const bulletproofDamageRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!bulletproofDamageRead.abilityRows.some(([name]) => name === 'Bulletproof'), 'taking Shadow Ball should remove Bulletproof from the live detective pool');
assert(bulletproofDamageRead.summary.notes.some(x => /Bulletproof impossible/i.test(x)), 'taking Shadow Ball should carry the Bulletproof contradiction into detective notes');

const windRiderDamageLog = '|turn|1\n|switch|p1a: Tornadus-Therian|Tornadus-Therian, L80\n|switch|p2a: Brambleghast|Brambleghast, L80\n|move|p1a: Tornadus-Therian|Bleakwind Storm|p2a: Brambleghast\n|-damage|p2a: Brambleghast|64/100';
const windRiderDamageParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(windRiderDamageLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const windRiderDamageTarget = windRiderDamageParser.targets.find(t => t.species === 'Brambleghast');
assert(windRiderDamageTarget?.ruledOutAbilities?.includes('Wind Rider'), 'taking Bleakwind Storm should rule out Wind Rider');
assert(windRiderDamageTarget?.notes?.some(note => /Bleakwind Storm successfully landed/i.test(note)), 'taking Bleakwind Storm should explain the Wind Rider contradiction');

vm.runInContext(
  `team=[
    preset("Brambleghast","Heavy-Duty Boots","Jolly",{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},["Power Whip","Shadow Ball","Rapid Spin","Spikes"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: windRiderDamageTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const windRiderDamageRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!windRiderDamageRead.abilityRows.some(([name]) => name === 'Wind Rider'), 'taking Bleakwind Storm should remove Wind Rider from the live detective pool');
assert(windRiderDamageRead.summary.notes.some(x => /Wind Rider impossible/i.test(x)), 'taking Bleakwind Storm should carry the Wind Rider contradiction into detective notes');

console.log('[OK] move immunity contradictions passed');
