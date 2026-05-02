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
vm.runInContext(fs.readFileSync('src/priority-blocking-upgrades.js', 'utf8'), context, { filename: 'priority-blocking-upgrades.js', timeout: 10000 });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function parseReplay(log) {
  return vm.runInContext(`(() => {
    const parser = new ReplayParser();
    parser.parse(${JSON.stringify(log)});
    return parser.replayRead;
  })()`, context, { timeout: 10000 });
}

const armorTailRoll = vm.runInContext(
  `dmg(
    preset('Dragonite','Heavy-Duty Boots','Adamant',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Extreme Speed','Earthquake','Fire Punch','Dragon Dance']),
    {...preset('Farigiraf','Leftovers','Bold',{hp:252,atk:0,def:252,spa:4,spd:0,spe:0},['Hyper Voice','Psychic Noise','Calm Mind','Protect']), ability:'Armor Tail'},
    'Extreme Speed',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);
assert(armorTailRoll.blockedBy === 'Armor Tail', 'Armor Tail should zero out incoming priority damage math');
assert(armorTailRoll.maxd === 0, 'Armor Tail should produce zero-damage rolls on blocked priority moves');

const armorTailControlRoll = vm.runInContext(
  `dmg(
    preset('Dragonite','Heavy-Duty Boots','Adamant',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Extreme Speed','Earthquake','Fire Punch','Dragon Dance']),
    {...preset('Farigiraf','Leftovers','Bold',{hp:252,atk:0,def:252,spa:4,spd:0,spe:0},['Hyper Voice','Psychic Noise','Calm Mind','Protect']), ability:'Armor Tail'},
    'Earthquake',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);
assert(armorTailControlRoll.blockedBy === '', 'Armor Tail should not block normal-priority moves');
assert(armorTailControlRoll.maxd > 0, 'normal-priority moves should still deal damage through Armor Tail');

const dazzlingRoll = vm.runInContext(
  `dmg(
    preset('Barraskewda','Choice Band','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Aqua Jet','Waterfall','Close Combat','Crunch']),
    {...preset('Bruxish','Heavy-Duty Boots','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Aqua Jet','Psychic Fangs','Crunch','Swords Dance']), ability:'Dazzling'},
    'Aqua Jet',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);
assert(dazzlingRoll.blockedBy === 'Dazzling', 'Dazzling should zero out incoming priority damage math');
assert(dazzlingRoll.maxd === 0, 'Dazzling should produce zero-damage rolls on blocked priority moves');

const queenlyMajestyRoll = vm.runInContext(
  `dmg(
    preset('Dragonite','Heavy-Duty Boots','Adamant',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Extreme Speed','Earthquake','Fire Punch','Dragon Dance']),
    {...preset('Tsareena','Heavy-Duty Boots','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Power Whip','Rapid Spin','Knock Off','Trop Kick']), ability:'Queenly Majesty'},
    'Extreme Speed',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);
assert(queenlyMajestyRoll.blockedBy === 'Queenly Majesty', 'Queenly Majesty should zero out incoming priority damage math');
assert(queenlyMajestyRoll.maxd === 0, 'Queenly Majesty should produce zero-damage rolls on blocked priority moves');

const armorTailDamageLog = '|turn|1\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Farigiraf|Farigiraf, L80\n|move|p1a: Dragonite|Extreme Speed|p2a: Farigiraf\n|-damage|p2a: Farigiraf|76/100';
const armorTailDamageTarget = parseReplay(armorTailDamageLog).targets.find(t => t.species === 'Farigiraf');
assert(armorTailDamageTarget?.ruledOutAbilities?.includes('Armor Tail'), 'taking Extreme Speed should rule out Armor Tail');
assert(armorTailDamageTarget?.notes?.some(note => /Extreme Speed successfully landed/i.test(note)), 'taking Extreme Speed should explain the Armor Tail contradiction');

vm.runInContext(
  `team=[
    preset("Farigiraf","Leftovers","Bold",{hp:252,atk:0,def:252,spa:4,spd:0,spe:0},["Hyper Voice","Psychic Noise","Calm Mind","Protect"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: armorTailDamageTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const armorTailDamageRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(!armorTailDamageRead.abilityRows.some(([name]) => name === 'Armor Tail'), 'taking Extreme Speed should remove Armor Tail from the live detective pool');
assert(armorTailDamageRead.summary.notes.some(x => /Armor Tail impossible/i.test(x)), 'taking Extreme Speed should carry the Armor Tail contradiction into detective notes');

const dazzlingDamageLog = '|turn|1\n|switch|p1a: Barraskewda|Barraskewda, L80\n|switch|p2a: Bruxish|Bruxish, L80\n|move|p1a: Barraskewda|Aqua Jet|p2a: Bruxish\n|-damage|p2a: Bruxish|71/100';
const dazzlingDamageTarget = parseReplay(dazzlingDamageLog).targets.find(t => t.species === 'Bruxish');
assert(dazzlingDamageTarget?.ruledOutAbilities?.includes('Dazzling'), 'taking Aqua Jet should rule out Dazzling');
assert(dazzlingDamageTarget?.notes?.some(note => /Aqua Jet successfully landed/i.test(note)), 'taking Aqua Jet should explain the Dazzling contradiction');

const queenlyMajestyDamageLog = '|turn|1\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Tsareena|Tsareena, L80\n|move|p1a: Dragonite|Extreme Speed|p2a: Tsareena\n|-damage|p2a: Tsareena|74/100';
const queenlyMajestyDamageTarget = parseReplay(queenlyMajestyDamageLog).targets.find(t => t.species === 'Tsareena');
assert(queenlyMajestyDamageTarget?.ruledOutAbilities?.includes('Queenly Majesty'), 'taking Extreme Speed should rule out Queenly Majesty');
assert(queenlyMajestyDamageTarget?.notes?.some(note => /Extreme Speed successfully landed/i.test(note)), 'taking Extreme Speed should explain the Queenly Majesty contradiction');

const moldBreakerArmorTailLog = '|turn|1\n|switch|p1a: Haxorus|Haxorus, L80\n|switch|p2a: Farigiraf|Farigiraf, L80\n|move|p1a: Haxorus|Extreme Speed|p2a: Farigiraf\n|-ability|p1a: Haxorus|Mold Breaker\n|-damage|p2a: Farigiraf|76/100';
const moldBreakerArmorTailTarget = parseReplay(moldBreakerArmorTailLog).targets.find(t => t.species === 'Farigiraf');
assert(!moldBreakerArmorTailTarget?.ruledOutAbilities?.includes('Armor Tail'), 'Mold Breaker priority damage should not fake an Armor Tail contradiction');
assert(moldBreakerArmorTailTarget?.notes?.some(note => /Mold Breaker let Extreme Speed bypass Armor Tail/i.test(note)), 'Mold Breaker priority damage should explain why Armor Tail stayed live');

vm.runInContext(
  `team=[
    preset("Farigiraf","Leftovers","Bold",{hp:252,atk:0,def:252,spa:4,spd:0,spe:0},["Hyper Voice","Psychic Noise","Calm Mind","Protect"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: moldBreakerArmorTailTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const moldBreakerArmorTailRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(moldBreakerArmorTailRead.abilityRows[0][0] === 'Armor Tail', 'Mold Breaker priority damage should leave Armor Tail live in the detective pool');
assert(moldBreakerArmorTailRead.summary.notes.some(x => /Mold Breaker let Extreme Speed bypass Armor Tail/i.test(x)), 'Mold Breaker priority damage should carry the bypass note into detective output');

console.log('[OK] priority blocking reasoning passed');
