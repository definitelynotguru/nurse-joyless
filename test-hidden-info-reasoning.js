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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const userMon = vm.runInContext(
  "preset('Great Tusk','Heavy-Duty Boots','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Close Combat','Headlong Rush','Rapid Spin','Knock Off'])",
  context
);

const hardRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Dragapult',
    evidence:'they_hit_me',
    move:'Shadow Ball',
    observedDamage:43,
    usedStatusMove:true,
    tookHazardDamage:true,
    repeatedDamagingMove:false,
    movedFirst:false,
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(hardRead.summary.notes.some(x => /Assault Vest impossible/.test(x)), 'hard read should surface Assault Vest elimination');
assert(hardRead.summary.notes.some(x => /Heavy-Duty Boots impossible/.test(x)), 'hard read should surface Heavy-Duty Boots elimination');
assert(hardRead.eliminated.some(x => x.item === 'Assault Vest'), 'Assault Vest lines should be eliminated');
assert(hardRead.eliminated.some(x => x.item === 'Heavy-Duty Boots'), 'Heavy-Duty Boots lines should be eliminated');
assert(!hardRead.itemRows.some(([name]) => name === 'Assault Vest'), 'eliminated items should not survive in item ranking');
assert(!hardRead.itemRows.some(([name]) => name === 'Heavy-Duty Boots'), 'boots should be removed from the live item pool');

const softRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Dragapult',
    evidence:'they_hit_me',
    move:'Shadow Ball',
    observedDamage:43,
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:true,
    movedFirst:true,
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(softRead.summary.confidence.label !== 'High', 'soft clues alone should not produce overconfident detective reads');
assert(softRead.summary.verdict.length > 20, 'detective verdict should explain the read, not just rank candidates');

const revealedRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Dragapult',
    evidence:'they_hit_me',
    move:'Shadow Ball',
    observedDamage:43,
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:false,
    movedFirst:false,
    choiceContradiction:true,
    revealedItem:'Choice Specs',
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(revealedRead.itemRows[0][0] === 'Choice Specs', 'revealed item should anchor the live item ranking');
assert(!revealedRead.itemRows.some(([name]) => /^Choice (Band|Scarf)$/.test(name)), 'choice contradiction should remove incompatible Choice items');
assert(revealedRead.summary.notes.some(x => /Choice items impossible/.test(x)), 'choice contradiction should be surfaced in detective notes');
assert(revealedRead.summary.notes.some(x => /Choice Specs confirmed/.test(x)), 'revealed item should be surfaced in detective notes');

const dragoniteUser = vm.runInContext(
  "preset('Dragonite','Heavy-Duty Boots','Jolly',{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},['Dragon Dance','Extreme Speed','Earthquake','Fire Punch'])",
  context
);

const speedRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Gholdengo',
    evidence:'they_hit_me',
    move:'Make It Rain',
    observedDamage:45,
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:false,
    movedFirst:true,
    speedContext:{relation:'fasterThan',opponentSpecies:'Dragonite'},
    user:${JSON.stringify(dragoniteUser)}
  })`,
  context,
  { timeout: 10000 }
);

assert(speedRead.top[0].profile === 'speed physical', 'neutral-priority speed clue should push fast-enough lines to the front');
assert(speedRead.top[1].profile === 'speed physical', 'neutral-priority speed clue should keep the second fast-enough line near the front');
assert(speedRead.top[2].prob < speedRead.top[0].prob / 10, 'neutral-priority speed clue should sharply suppress clearly too-slow lines');

const oppSpeciesEl = context.document.getElementById('oppSpecies');
const evidenceEl = context.document.getElementById('evidence');
const obsMoveEl = context.document.getElementById('obsMove');
const obsPctEl = context.document.getElementById('obsPct');
const statusMoveEl = context.document.getElementById('statusMove');
const hazardTellEl = context.document.getElementById('hazardTell');
const repeatTellEl = context.document.getElementById('repeatTell');
const speedTellEl = context.document.getElementById('speedTell');
const detectiveEl = context.document.getElementById('detective');

oppSpeciesEl._items = [{ species: 'Dragapult' }];
oppSpeciesEl.value = '0';
evidenceEl.value = 'they_hit_me';
obsMoveEl._items = [{ species: 'Shadow Ball' }];
obsMoveEl.value = '0';
obsPctEl.value = '43';
statusMoveEl.checked = true;
hazardTellEl.checked = true;
repeatTellEl.checked = false;
speedTellEl.checked = false;

vm.runInContext('team=[preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])]; detect();', context, { timeout: 10000 });
assert(detectiveEl.innerHTML.includes('Hard eliminations'), 'detective panel should render the hard elimination section');
assert(detectiveEl.innerHTML.includes('Likely spreads'), 'detective panel should render spread-level reasoning');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"]),
    preset("Dragonite","Heavy-Duty Boots","Jolly",{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},["Dragon Dance","Extreme Speed","Earthquake","Fire Punch"])
  ];
  lastReplayRead={strongest:{detectiveInput:{
    species:"Gholdengo",
    move:"Make It Rain",
    observedDamage:45,
    evidence:"they_hit_me",
    targetSpecies:"Dragonite",
    movedFirst:true,
    speedContext:{relation:"fasterThan",opponentSpecies:"Dragonite"}
  }}};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const replayLoadedRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(replayLoadedRead.input.user.species === 'Dragonite', 'replay detective handoff should use the actual replay target as the reference mon');
assert(replayLoadedRead.top[0].profile === 'speed physical', 'replay detective handoff should preserve structured speed context');

console.log('[OK] hidden info detective reasoning passed');
