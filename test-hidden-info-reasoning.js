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

const revealedAbilityRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Dragapult',
    evidence:'they_hit_me',
    move:'Shadow Ball',
    observedDamage:43,
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:false,
    movedFirst:false,
    revealedAbility:'Infiltrator',
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(revealedAbilityRead.abilityRows[0][0] === 'Infiltrator', 'revealed ability should anchor the live ability ranking');
assert(revealedAbilityRead.summary.notes.some(x => /Infiltrator confirmed/.test(x)), 'revealed ability should be surfaced in detective notes');
assert(revealedAbilityRead.top.every(x => x.ability === 'Infiltrator'), 'revealed ability should remove incompatible ability lines from the live pool');

const clueOnlyAbilityRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Gholdengo',
    evidence:'clue_only',
    move:'Thunder Wave',
    observedDamage:null,
    clueLabel:'Good as Gold blocked Thunder Wave',
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:false,
    movedFirst:false,
    revealedAbility:'Good as Gold',
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(clueOnlyAbilityRead.abilityRows[0][0] === 'Good as Gold', 'clue-only revealed ability should anchor ability ranking without damage evidence');
assert(/replay clues/i.test(clueOnlyAbilityRead.summary.verdict), 'clue-only detective verdict should explain the replay-clue reasoning path');
assert(clueOnlyAbilityRead.top.every(x => x.ability === 'Good as Gold'), 'clue-only revealed ability should still prune incompatible ability lines');

const waterAbsorbRoll = vm.runInContext(
  `dmg(
    preset('Primarina','Leftovers','Modest',{hp:252,atk:0,def:0,spa:252,spd:4,spe:0},['Waterfall','Moonblast','Protect','Psychic Noise']),
    {...preset('Clodsire','Leftovers','Careful',{hp:252,atk:4,def:0,spa:0,spd:252,spe:0},['Recover','Earthquake','Toxic','Protect']), ability:'Water Absorb'},
    'Waterfall',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(waterAbsorbRoll.blockedBy === 'Water Absorb', 'revealed Water Absorb should zero out Water damage math');
assert(waterAbsorbRoll.maxd === 0, 'Water Absorb immunity should produce zero-damage rolls');

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

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"]),
    preset("Dragonite","Heavy-Duty Boots","Jolly",{hp:0,atk:252,def:4,spa:0,spd:0,spe:252},["Dragon Dance","Extreme Speed","Earthquake","Fire Punch"])
  ];
  lastReplayRead={strongest:{detectiveInput:{
    species:"Gholdengo",
    move:"Headlong Rush",
    observedDamage:65,
    evidence:"i_hit_them",
    userSpecies:"Great Tusk",
    revealedItem:"Leftovers"
  }}};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const defenderLoadedRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(defenderLoadedRead.input.user.species === 'Great Tusk', 'replay defender-side handoff should use the attacking teammate as the reference mon');
assert(defenderLoadedRead.input.evidence === 'i_hit_them', 'replay defender-side handoff should preserve the defensive evidence direction');

const multiBranchLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|58/100\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|29/100\n|-item|p2a: Gholdengo|Leftovers';
const multiBranchParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(multiBranchLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const multiBranchTarget = multiBranchParser.targets.find(t => t.species === 'Gholdengo');
assert(multiBranchTarget?.detectiveBranchCount === 2, 'ReplayParser should keep both detective-ready branches for the same species');
assert(multiBranchTarget?.detectiveInputs?.[0]?.label.includes('Great Tusk into Gholdengo'), 'ReplayParser should label defender-side detective branches');
assert(multiBranchTarget?.detectiveInputs?.[1]?.label.includes('Make It Rain'), 'ReplayParser should keep the alternate offensive branch');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: multiBranchTarget })};
  loadReplayDetective(1);`,
  context,
  { timeout: 10000 }
);

const alternateReplayRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(alternateReplayRead.input.evidence === 'they_hit_me', 'alternate replay detective branch should stay loadable');
assert(alternateReplayRead.input.move === 'Make It Rain', 'alternate replay detective branch should preserve its move context');

const waterAbsorbLog = '|turn|1\n|switch|p1a: Primarina|Primarina, L80\n|switch|p2a: Clodsire|Clodsire, L80\n|move|p1a: Primarina|Surf|p2a: Clodsire\n|-heal|p2a: Clodsire|100/100|[from] ability: Water Absorb';
const waterAbsorbParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(waterAbsorbLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const waterAbsorbTarget = waterAbsorbParser.strongest;
assert(waterAbsorbTarget?.species === 'Clodsire', 'ability-heal replay clues should stay attached to the revealed target');
assert(waterAbsorbTarget?.detectiveBranchCount === 1, 'ability-heal replay clues should still create a detective-ready branch');
assert(waterAbsorbTarget?.detectiveInputs?.[0]?.label.includes('Water Absorb absorbed Surf'), 'ability-heal replay clues should preserve the move-specific clue label');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: waterAbsorbTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const waterAbsorbRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(waterAbsorbRead.top.every(x => x.ability === 'Water Absorb'), 'ability-heal replay clues should collapse the detective ability pool');
assert(/replay clues/i.test(waterAbsorbRead.summary.verdict), 'ability-heal replay clues should stay in the clue-only detective path');

const lightningRodLog = '|turn|1\n|switch|p1a: Zapdos|Zapdos, L80\n|switch|p2a: Seaking|Seaking, L80\n|move|p1a: Zapdos|Thunderbolt|p2a: Seaking\n|-boost|p2a: Seaking|spa|1|[from] ability: Lightning Rod';
const lightningRodParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(lightningRodLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const lightningRodTarget = lightningRodParser.strongest;
assert(lightningRodTarget?.species === 'Seaking', 'ability-boost replay clues should stay attached to the revealed target');
assert(lightningRodTarget?.detectiveBranchCount === 1, 'ability-boost replay clues should stay detective-loadable without damage');
assert(lightningRodTarget?.detectiveInputs?.[0]?.label.includes('Lightning Rod activated on Thunderbolt'), 'ability-boost replay clues should preserve the move-specific activation label');

console.log('[OK] hidden info detective reasoning passed');
