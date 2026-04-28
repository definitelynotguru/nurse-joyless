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

const clueOnlyItemRead = vm.runInContext(
  `buildDetectiveRead({
    species:'Dragapult',
    evidence:'clue_only',
    move:'',
    observedDamage:null,
    clueLabel:'Leftovers confirmed',
    usedStatusMove:false,
    tookHazardDamage:false,
    repeatedDamagingMove:false,
    movedFirst:false,
    revealedItem:'Leftovers',
    user:${JSON.stringify(userMon)}
  })`,
  context,
  { timeout: 10000 }
);

assert(clueOnlyItemRead.itemRows[0][0] === 'Leftovers', 'clue-only revealed item should anchor item ranking without damage evidence');
assert(/replay clues/i.test(clueOnlyItemRead.summary.verdict), 'clue-only item detective verdict should explain the replay-clue reasoning path');
assert(clueOnlyItemRead.top.every(x => x.item === 'Leftovers'), 'clue-only revealed item should still prune incompatible item lines');

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

const itemOnlyLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers';
const itemOnlyParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(itemOnlyLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const itemOnlyTarget = itemOnlyParser.strongest;
assert(itemOnlyTarget?.species === 'Dragapult', 'item-only replay clues should stay attached to the revealed target');
assert(itemOnlyTarget?.detectiveBranchCount === 1, 'item-only replay clues should still create a detective-ready branch');
assert(itemOnlyTarget?.detectiveInputs?.[0]?.clueLabel === 'Leftovers confirmed', 'item-only replay clues should preserve the item-specific clue label');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: itemOnlyTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const itemOnlyRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(itemOnlyRead.top.every(x => x.item === 'Leftovers'), 'item-only replay clues should collapse the detective item pool');
assert(/replay clues/i.test(itemOnlyRead.summary.verdict), 'item-only replay clues should stay in the clue-only detective path');
assert(itemOnlyRead.summary.notes.some(x => /Leftovers confirmed/.test(x)), 'item-only replay clues should explain the revealed item consequence');

const removedItemLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|move|p1a: Great Tusk|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off';
const removedItemParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(removedItemLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const removedItemTarget = removedItemParser.targets.find(t => t.species === 'Dragapult');
assert(removedItemTarget?.removedItem === 'Leftovers', 'replay item-loss clues should keep the former item as historical context');
assert(removedItemTarget?.itemGone, 'replay item-loss clues should mark the item as no longer present');
assert(!removedItemTarget?.revealedItem, 'replay item-loss clues should stop treating the removed item as a live confirmation');
assert(removedItemTarget?.detectiveInputs?.[0]?.clueLabel === 'Leftovers was removed by Knock Off', 'replay item-loss clues should preserve the removal cause');
assert(removedItemTarget?.notes?.some(note => /Leftovers was removed/.test(note)), 'replay item-loss clues should surface the loss in summary notes');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: removedItemTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const removedItemRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(removedItemRead.summary.notes.some(x => /no longer be the current item/i.test(x)), 'removed-item replay clues should explain that the old item no longer anchors the live read');
assert(removedItemRead.itemRows[0][0] === 'No Item', 'removed-item replay clues should let the detective represent an empty current item slot');
assert(!removedItemRead.itemRows.some(([name]) => name === 'Leftovers'), 'removed-item replay clues should eliminate the lost item from the live current-item pool');

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
assert(waterAbsorbRead.summary.notes.some(x => /heal instead of damaging/i.test(x)), 'ability-heal replay clues should explain the downstream immunity reward');

const hydroPumpLog = '|turn|1\n|switch|p1a: Primarina|Primarina, L80\n|switch|p2a: Clodsire|Clodsire, L80\n|move|p1a: Primarina|Hydro Pump|p2a: Clodsire\n|-heal|p2a: Clodsire|100/100|[from] ability: Water Absorb';
const hydroPumpParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(hydroPumpLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const hydroPumpTarget = hydroPumpParser.strongest;
assert(hydroPumpTarget?.detectiveInputs?.[0]?.label.includes('Water Absorb absorbed Hydro Pump'), 'replay move hints should keep Hydro Pump ability clues move-specific even without full local move data');

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

const earthEaterRoll = vm.runInContext(
  `dmg(
    preset('Great Tusk','Leftovers','Adamant',{hp:252,atk:252,def:4,spa:0,spd:0,spe:0},['Earthquake','Close Combat','Knock Off','Rapid Spin']),
    {...preset('Orthworm','Leftovers','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Body Press','Iron Head','Stealth Rock','Rest']), ability:'Earth Eater'},
    'Earthquake',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(earthEaterRoll.blockedBy === 'Earth Eater', 'revealed Earth Eater should zero out Ground damage math');
assert(earthEaterRoll.maxd === 0, 'Earth Eater immunity should produce zero-damage rolls');

const earthEaterLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Orthworm|Orthworm, L80\n|move|p1a: Great Tusk|Earthquake|p2a: Orthworm\n|-heal|p2a: Orthworm|100/100|[from] ability: Earth Eater';
const earthEaterParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(earthEaterLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const earthEaterTarget = earthEaterParser.strongest;
assert(earthEaterTarget?.species === 'Orthworm', 'Earth Eater replay clues should stay attached to the healed target');
assert(earthEaterTarget?.detectiveInputs?.[0]?.label.includes('Earth Eater absorbed Earthquake'), 'Earth Eater replay clues should preserve the move-specific absorb label');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: earthEaterTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const earthEaterRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(earthEaterRead.top.every(x => x.ability === 'Earth Eater'), 'Earth Eater replay clues should collapse the detective ability pool');
assert(earthEaterRead.summary.notes.some(x => /Ground attacks heal instead of damaging/i.test(x)), 'Earth Eater replay clues should explain the healing consequence');

const wellBakedRoll = vm.runInContext(
  `dmg(
    preset('Volcarona','Leftovers','Timid',{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},['Flamethrower','Bug Buzz','Quiver Dance','Roost']),
    {...preset('Dachsbun','Leftovers','Impish',{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},['Body Press','Play Rough','Wish','Protect']), ability:'Well-Baked Body'},
    'Flamethrower',
    {hpPct:100}
  )`,
  context,
  { timeout: 10000 }
);

assert(wellBakedRoll.blockedBy === 'Well-Baked Body', 'revealed Well-Baked Body should zero out Fire damage math');
assert(wellBakedRoll.maxd === 0, 'Well-Baked Body immunity should produce zero-damage rolls');

const wellBakedLog = '|turn|1\n|switch|p1a: Volcarona|Volcarona, L80\n|switch|p2a: Dachsbun|Dachsbun, L80\n|move|p1a: Volcarona|Flamethrower|p2a: Dachsbun\n|-boost|p2a: Dachsbun|def|2|[from] ability: Well-Baked Body';
const wellBakedParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(wellBakedLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const wellBakedTarget = wellBakedParser.strongest;
assert(wellBakedTarget?.species === 'Dachsbun', 'Well-Baked Body replay clues should stay attached to the boosted target');
assert(wellBakedTarget?.detectiveInputs?.[0]?.label.includes('Well-Baked Body activated on Flamethrower'), 'Well-Baked Body replay clues should preserve the move-specific activation label');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: wellBakedTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const wellBakedRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(wellBakedRead.top.every(x => x.ability === 'Well-Baked Body'), 'Well-Baked Body replay clues should collapse the detective ability pool');
assert(wellBakedRead.summary.notes.some(x => /Defense boost/i.test(x)), 'Well-Baked Body replay clues should explain the boost consequence');

const speedBoostLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Blaziken|Blaziken, L80\n|move|p2a: Blaziken|Protect|p2a: Blaziken\n|-boost|p2a: Blaziken|spe|1|[from] ability: Speed Boost';
const speedBoostParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(speedBoostLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const speedBoostTarget = speedBoostParser.strongest;
assert(speedBoostTarget?.species === 'Blaziken', 'generic ability replay clues should stay attached to the revealed target');
assert(speedBoostTarget?.detectiveInputs?.[0]?.label === 'Speed Boost revealed', 'generic ability reveals should not pretend they were caused by the last move');
assert(speedBoostTarget?.notes?.includes('Speed Boost revealed'), 'generic ability reveals should stay descriptive without fake immunity text');
assert(!speedBoostTarget?.notes?.some(note => /immunity interaction/i.test(note)), 'generic ability reveals should not be mislabeled as immunity interactions');

const airBalloonLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon';
const airBalloonParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonTarget = airBalloonParser.targets.find(t => t.species === 'Gholdengo');
assert(airBalloonTarget?.detectiveInputs?.[0]?.clueLabel === 'Air Balloon popped', 'Air Balloon replay clues should keep a specific pop label instead of generic item removal wording');
assert(airBalloonTarget?.notes?.some(note => /Ground immunity is gone/i.test(note)), 'Air Balloon replay clues should explain that the old Ground immunity ended');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonRead.itemRows[0][0] === 'No Item', 'Air Balloon pop clues should anchor the current item read to an empty slot');
assert(!airBalloonRead.itemRows.some(([name]) => name === 'Air Balloon'), 'Air Balloon pop clues should remove the popped Balloon from the live pool');
assert(airBalloonRead.summary.notes.some(x => /Ground immunity is gone/i.test(x)), 'Air Balloon pop clues should carry the groundedness consequence into the detective notes');

const airBalloonHazardLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-damage|p2a: Gholdengo|88/100|[from] Spikes';
const airBalloonHazardParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonHazardLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonHazardTarget = airBalloonHazardParser.targets.find(t => t.species === 'Gholdengo');
assert(airBalloonHazardTarget?.notes?.some(note => /Later took Spikes after Air Balloon popped/i.test(note)), 'post-pop Spikes clues should explain that grounded hazard chip happened after the Balloon was gone');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonHazardTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonHazardRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonHazardRead.summary.notes.some(x => /Later took Spikes after Air Balloon popped/i.test(x)), 'post-pop Spikes clues should stay visible in detective notes');

const airBalloonProtectionReturnLog = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: Gholdengo|move: Spikes\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Ting-Lu|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80';
const airBalloonProtectionReturnParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonProtectionReturnLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonProtectionReturnTarget = airBalloonProtectionReturnParser.targets.find(t => t.species === 'Gholdengo');
assert(airBalloonProtectionReturnTarget?.postItemLossProtectionRecovered, 'post-pop no-chip hazard entries should mark that protection returned after Air Balloon was gone');
assert(airBalloonProtectionReturnTarget?.notes?.some(note => /regained entry protection/i.test(note)), 'post-pop no-chip hazard entries should explain that the later state regained entry protection');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonProtectionReturnTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonProtectionReturnRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonProtectionReturnRead.summary.notes.some(x => /empty slot is no longer the only live current-item story/i.test(x)), 'post-pop protection return should reopen the current-item story instead of locking on No Item');
assert(airBalloonProtectionReturnRead.itemRows[0][0] !== 'No Item', 'post-pop protection return should stop anchoring the current item read to an empty slot');

const airBalloonGroundLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|-item|p2a: Gholdengo|Air Balloon\n|move|p1a: Great Tusk|Knock Off|p2a: Gholdengo\n|-enditem|p2a: Gholdengo|Air Balloon\n|turn|2\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|38/100';
const airBalloonGroundParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonGroundLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonGroundTarget = airBalloonGroundParser.targets.find(t => t.species === 'Gholdengo');
assert(airBalloonGroundTarget?.notes?.some(note => /Later took Headlong Rush after Air Balloon popped/i.test(note)), 'post-pop Ground-damage clues should explain that the grounded hit happened after the Balloon was gone');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonGroundTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonGroundRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonGroundRead.summary.notes.some(x => /Later took Headlong Rush after Air Balloon popped/i.test(x)), 'post-pop Ground-damage clues should stay visible in detective notes');

const boosterLog = '|turn|1\n|switch|p2a: Raging Bolt|Raging Bolt, L80\n|-item|p2a: Raging Bolt|Booster Energy\n|-enditem|p2a: Raging Bolt|Booster Energy|[from] ability: Protosynthesis';
const boosterParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(boosterLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const boosterTarget = boosterParser.targets.find(t => t.species === 'Raging Bolt');
assert(boosterTarget?.detectiveInputs?.[0]?.clueLabel === 'Booster Energy activated Protosynthesis', 'Booster Energy replay clues should keep the activation cause instead of generic removal wording');
assert(boosterTarget?.notes?.some(note => /one-shot item/i.test(note)), 'Booster Energy replay clues should explain that the item was consumed and cannot still be current');

const bootsRemovalHazardLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Heavy-Duty Boots\n|move|p1a: Great Tusk|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Dragapult|Dragapult, L80\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock';
const bootsRemovalHazardParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bootsRemovalHazardLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const bootsRemovalHazardTarget = bootsRemovalHazardParser.targets.find(t => t.species === 'Dragapult');
assert(bootsRemovalHazardTarget?.notes?.some(note => /Later took Stealth Rock after Heavy-Duty Boots were removed/i.test(note)), 'post-removal hazard clues should explain that the chip belongs to the new post-Boots item state');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: bootsRemovalHazardTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const bootsRemovalHazardRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(bootsRemovalHazardRead.summary.notes.some(x => /Later took Stealth Rock after Heavy-Duty Boots were removed/i.test(x)), 'post-removal hazard timing should stay visible in detective notes');

const bootsProtectionReturnLog = '|turn|1\n|switch|p1a: Ting-Lu|Ting-Lu, L80\n|-sidestart|p2: Dragapult|move: Stealth Rock\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Heavy-Duty Boots\n|move|p1a: Ting-Lu|Knock Off|p2a: Dragapult\n|-enditem|p2a: Dragapult|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Dragapult|Dragapult, L80';
const bootsProtectionReturnParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bootsProtectionReturnLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const bootsProtectionReturnTarget = bootsProtectionReturnParser.targets.find(t => t.species === 'Dragapult');
assert(bootsProtectionReturnTarget?.postItemLossProtectionRecovered, 'post-Boots no-chip hazard entries should mark that protection later returned');
assert(bootsProtectionReturnTarget?.notes?.some(note => /regained hazard protection/i.test(note)), 'post-Boots no-chip hazard entries should explain that the later state regained protection');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: bootsProtectionReturnTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const bootsProtectionReturnRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(bootsProtectionReturnRead.summary.notes.some(x => /empty slot is no longer the only live current-item story/i.test(x)), 'post-Boots protection return should reopen the current-item story instead of locking on No Item');
assert(bootsProtectionReturnRead.itemRows[0][0] !== 'No Item', 'post-Boots protection return should stop anchoring the current item read to an empty slot');

const airBalloonToxicSpikesLog = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Air Balloon\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Air Balloon\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-status|p2a: Great Tusk|psn|[from] move: Toxic Spikes';
const airBalloonToxicSpikesParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonToxicSpikesLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonToxicSpikesTarget = airBalloonToxicSpikesParser.targets.find(t => t.species === 'Great Tusk');
assert(airBalloonToxicSpikesTarget?.notes?.some(note => /Later got poisoned by Toxic Spikes after Air Balloon popped/i.test(note)), 'post-pop Toxic Spikes clues should explain that the grounded poison clue happened after the Balloon was gone');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonToxicSpikesTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonToxicSpikesRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonToxicSpikesRead.summary.notes.some(x => /Later got poisoned by Toxic Spikes after Air Balloon popped/i.test(x)), 'post-pop Toxic Spikes clues should stay visible in detective notes');

const bootsToxicSpikesProtectionReturnLog = '|turn|1\n|switch|p1a: Gliscor|Gliscor, L80\n|-sidestart|p2: Great Tusk|move: Toxic Spikes\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Gliscor|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80';
const bootsToxicSpikesProtectionReturnParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bootsToxicSpikesProtectionReturnLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const bootsToxicSpikesProtectionReturnTarget = bootsToxicSpikesProtectionReturnParser.targets.find(t => t.species === 'Great Tusk');
assert(bootsToxicSpikesProtectionReturnTarget?.postItemLossProtectionRecovered, 'post-Boots no-status Toxic Spikes entries should mark that protection later returned');
assert(bootsToxicSpikesProtectionReturnTarget?.notes?.some(note => /without getting poisoned/i.test(note)), 'post-Boots no-status Toxic Spikes entries should explain that the later state regained protection');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: bootsToxicSpikesProtectionReturnTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const bootsToxicSpikesProtectionReturnRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(bootsToxicSpikesProtectionReturnRead.summary.notes.some(x => /empty slot is no longer the only live current-item story/i.test(x)), 'post-Boots Toxic Spikes protection return should reopen the current item story instead of locking on No Item');
assert(bootsToxicSpikesProtectionReturnRead.itemRows[0][0] !== 'No Item', 'post-Boots Toxic Spikes protection return should stop anchoring the current item read to an empty slot');

const airBalloonStickyWebLog = '|turn|1\n|switch|p1a: Ribombee|Ribombee, L80\n|-sidestart|p2: Great Tusk|move: Sticky Web\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Air Balloon\n|move|p1a: Ribombee|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Air Balloon\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-activate|p2a: Great Tusk|move: Sticky Web';
const airBalloonStickyWebParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(airBalloonStickyWebLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const airBalloonStickyWebTarget = airBalloonStickyWebParser.targets.find(t => t.species === 'Great Tusk');
assert(airBalloonStickyWebTarget?.notes?.some(note => /Later triggered Sticky Web after Air Balloon popped/i.test(note)), 'post-pop Sticky Web clues should explain that the grounded speed-drop clue happened after the Balloon was gone');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: airBalloonStickyWebTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const airBalloonStickyWebRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(airBalloonStickyWebRead.summary.notes.some(x => /Later triggered Sticky Web after Air Balloon popped/i.test(x)), 'post-pop Sticky Web clues should stay visible in detective notes');

const bootsStickyWebProtectionReturnLog = '|turn|1\n|switch|p1a: Ribombee|Ribombee, L80\n|-sidestart|p2: Great Tusk|move: Sticky Web\n|switch|p2a: Great Tusk|Great Tusk, L80\n|-item|p2a: Great Tusk|Heavy-Duty Boots\n|move|p1a: Ribombee|Knock Off|p2a: Great Tusk\n|-enditem|p2a: Great Tusk|Heavy-Duty Boots|[from] move: Knock Off\n|turn|2\n|switch|p2a: Great Tusk|Great Tusk, L80';
const bootsStickyWebProtectionReturnParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(bootsStickyWebProtectionReturnLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const bootsStickyWebProtectionReturnTarget = bootsStickyWebProtectionReturnParser.targets.find(t => t.species === 'Great Tusk');
assert(bootsStickyWebProtectionReturnTarget?.postItemLossProtectionRecovered, 'post-Boots no-activate Sticky Web entries should mark that protection later returned');
assert(bootsStickyWebProtectionReturnTarget?.notes?.some(note => /without getting slowed/i.test(note)), 'post-Boots no-activate Sticky Web entries should explain that the later state regained protection');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: bootsStickyWebProtectionReturnTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);

const bootsStickyWebProtectionReturnRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(bootsStickyWebProtectionReturnRead.summary.notes.some(x => /empty slot is no longer the only live current-item story/i.test(x)), 'post-Boots Sticky Web protection return should reopen the current item story instead of locking on No Item');
assert(bootsStickyWebProtectionReturnRead.itemRows[0][0] !== 'No Item', 'post-Boots Sticky Web protection return should stop anchoring the current item read to an empty slot');

const goodAsGoldEncoreLog = '|turn|1\n|switch|p1a: Grimmsnarl|Grimmsnarl, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Grimmsnarl|Encore|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
const goodAsGoldEncoreParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(goodAsGoldEncoreLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const goodAsGoldEncoreTarget = goodAsGoldEncoreParser.strongest;
assert(goodAsGoldEncoreTarget?.detectiveInputs?.[0]?.label === 'Good as Gold blocked Encore', 'replay move hints should keep blocked-status clues move-specific for unseen status moves');

const tauntLog = '|turn|1\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Taunt|p1a: Great Tusk';
const tauntParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(tauntLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const tauntTarget = tauntParser.targets.find(t => t.species === 'Dragapult');
assert(tauntTarget?.usedStatusMove, 'replay move hints should still mark unseen status moves as Assault Vest contradictions');
assert(tauntTarget?.notes?.includes('Assault Vest ruled out'), 'replay move hints should surface the status-move contradiction in replay notes');

const thunderclapSpeedLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Raging Bolt|Raging Bolt, L80\n|move|p2a: Raging Bolt|Thunderclap|p1a: Great Tusk\n|-damage|p1a: Great Tusk|78/100\n|move|p1a: Great Tusk|Earthquake|p2a: Raging Bolt\n|-damage|p2a: Raging Bolt|32/100';
const thunderclapSpeedParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(thunderclapSpeedLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const thunderclapTarget = thunderclapSpeedParser.targets.find(t => t.species === 'Raging Bolt');
const thunderclapBranch = thunderclapTarget?.detectiveInputs?.find(input => input.move === 'Thunderclap' && input.evidence === 'they_hit_me');
assert(!thunderclapBranch?.speedContext, 'priority replay move hints should prevent fake neutral-priority speed clues from Thunderclap sequences');

const switchedTargetLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Shadow Ball|p1a: Great Tusk\n|-damage|p1a: Great Tusk|57/100\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|switch|p2a: Gholdengo|Gholdengo, L80\n|turn|3\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Draco Meteor|p1a: Great Tusk\n|-damage|p1a: Great Tusk|12/100';
const switchedTargetParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(switchedTargetLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const switchedDragapult = switchedTargetParser.targets.find(t => t.species === 'Dragapult');
assert(switchedDragapult, 'ReplayParser should keep evidence for a species after it leaves the active slot');
assert(switchedDragapult.revealedItem === 'Leftovers', 'ReplayParser should preserve revealed items across later slot changes');
assert(switchedDragapult.detectiveBranchCount === 2, 'ReplayParser should keep both same-species damage branches across separate field entries');
assert(!switchedDragapult.choiceContradiction, 'ReplayParser should not fake a Choice contradiction across a real switch');
assert(switchedDragapult.detectiveInputs.some(input => input.move === 'Shadow Ball'), 'ReplayParser should keep the pre-switch damage branch');
assert(switchedDragapult.detectiveInputs.some(input => input.move === 'Draco Meteor'), 'ReplayParser should keep the post-switch damage branch');

const mirrorDragapultLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Dragapult\n|move|p2a: Dragapult|Shadow Ball|p1a: Dragapult\n|-damage|p1a: Dragapult|57/100\n|-item|p2a: Dragapult|Choice Specs';
const mirrorDragapultParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(mirrorDragapultLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const mirrorDragapults = mirrorDragapultParser.targets.filter(t => t.species === 'Dragapult');
assert(mirrorDragapults.length === 2, 'ReplayParser should keep same-species targets from opposite sides separate');
const playerDragapult = mirrorDragapults.find(t => t.side === 'p1');
const opponentDragapult = mirrorDragapults.find(t => t.side === 'p2');
assert(playerDragapult?.usedStatusMove, 'ReplayParser should keep player-side status-move evidence on the correct same-species target');
assert(!playerDragapult?.revealedItem, 'ReplayParser should not leak opponent item reveals onto the player-side same-species target');
assert(opponentDragapult?.revealedItem === 'Choice Specs', 'ReplayParser should keep opponent item reveals on the correct same-species target');
assert(!opponentDragapult?.usedStatusMove, 'ReplayParser should not leak player status-move evidence onto the opponent same-species target');
assert(opponentDragapult?.detectiveInputs?.some(input => input.move === 'Shadow Ball'), 'ReplayParser should preserve opponent-side damage branches for same-species mirror targets');

const multiSpeedLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|55/100\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|42/100\n|turn|2\n|switch|p1a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Shadow Ball|p2a: Gholdengo\n|-damage|p2a: Gholdengo|15/100\n|move|p2a: Gholdengo|Shadow Ball|p1a: Dragapult\n|-damage|p1a: Dragapult|58/100';
const multiSpeedParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(multiSpeedLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const multiSpeedTarget = multiSpeedParser.targets.find(t => t.species === 'Gholdengo');
const makeItRainBranch = multiSpeedTarget?.detectiveInputs?.find(input => input.move === 'Make It Rain' && input.evidence === 'they_hit_me');
const dragapultBranch = multiSpeedTarget?.detectiveInputs?.find(input => input.userSpecies === 'Dragapult' && input.evidence === 'i_hit_them');
assert(makeItRainBranch?.speedContext?.relation === 'fasterThan', 'ReplayParser should keep the faster-than speed clue on the Great Tusk branch');
assert(makeItRainBranch?.speedContext?.opponentSpecies === 'Great Tusk', 'ReplayParser should keep the Great Tusk opponent on the faster branch');
assert(dragapultBranch?.speedContext?.relation === 'slowerThan', 'ReplayParser should keep the slower-than speed clue on the Dragapult branch');
assert(dragapultBranch?.speedContext?.opponentSpecies === 'Dragapult', 'ReplayParser should keep the Dragapult opponent on the slower branch');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"]),
    preset("Dragapult","Choice Specs","Timid",{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},["Shadow Ball","Draco Meteor","Flamethrower","U-turn"])
  ];
  lastReplayRead=${JSON.stringify({ targets: [multiSpeedTarget], strongest: multiSpeedTarget })};
  loadReplayDetective(0, ${multiSpeedTarget.detectiveInputs.findIndex(input => input.move === 'Make It Rain' && input.evidence === 'they_hit_me')});
  `,
  context,
  { timeout: 10000 }
);
const fastReplayRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(fastReplayRead.input.speedContext?.relation === 'fasterThan', 'Replay detective handoff should preserve the faster-than speed context on the loaded branch');
assert(fastReplayRead.input.speedContext?.opponentSpecies === 'Great Tusk', 'Replay detective handoff should preserve the original faster-than opponent');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"]),
    preset("Dragapult","Choice Specs","Timid",{hp:0,atk:0,def:4,spa:252,spd:0,spe:252},["Shadow Ball","Draco Meteor","Flamethrower","U-turn"])
  ];
  lastReplayRead=${JSON.stringify({ targets: [multiSpeedTarget], strongest: multiSpeedTarget })};
  loadReplayDetective(0, ${multiSpeedTarget.detectiveInputs.findIndex(input => input.userSpecies === 'Dragapult' && input.evidence === 'i_hit_them')});
  `,
  context,
  { timeout: 10000 }
);
const slowReplayRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(slowReplayRead.input.speedContext?.relation === 'slowerThan', 'Replay detective handoff should preserve the slower-than speed context on the loaded branch');
assert(slowReplayRead.input.speedContext?.opponentSpecies === 'Dragapult', 'Replay detective handoff should preserve the original slower-than opponent');

const postLossBootsRecoveryLog = '|turn|1\n|-sidestart|p2: foe|move: Stealth Rock\n|switch|p2a: Dragapult|Dragapult, L80\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock\n|-item|p2a: Dragapult|Leftovers\n|turn|2\n|-enditem|p2a: Dragapult|Leftovers|[from] move: Knock Off\n|turn|3\n|switch|p2a: Dragapult|Dragapult, L80';
const postLossBootsRecoveryParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(postLossBootsRecoveryLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const postLossBootsRecoveryTarget = postLossBootsRecoveryParser.targets.find(t => t.species === 'Dragapult');
assert(postLossBootsRecoveryTarget?.historicalHazardDamage, 'pre-loss hazard chip should stay visible as historical context after item loss');
assert(!postLossBootsRecoveryTarget?.tookHazardDamage, 'pre-loss hazard chip alone should not rule out Boots for the current post-loss state');
assert(postLossBootsRecoveryTarget?.detectiveInputs?.[0]?.postItemLossProtectionItems?.includes('Heavy-Duty Boots'), 'post-loss missing hazards should keep Boots live as a current-state explanation');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: postLossBootsRecoveryTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const postLossBootsRecoveryRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(postLossBootsRecoveryRead.summary.notes.some(x => /Earlier hazard chip only ruled out Boots before the old item left/i.test(x)), 'post-loss current-state reads should explain that old hazard chip does not freeze the new item story');
assert(postLossBootsRecoveryRead.summary.notes.some(x => /Heavy-Duty Boots live/i.test(x)), 'post-loss current-state reads should explain that later protection keeps Boots live');
assert(postLossBootsRecoveryRead.itemRows.some(([name]) => name === 'Heavy-Duty Boots'), 'post-loss current-state reads should keep Boots in the live item pool');
assert(!postLossBootsRecoveryRead.itemRows.some(([name]) => name === 'No Item'), 'post-loss protection return should stop leaving an empty slot as the leading current-state explanation');

const clefableMagicGuardRecoveryLog = '|turn|1\n|-sidestart|p2: foe|move: Stealth Rock\n|switch|p2a: Clefable|Clefable, L80\n|-damage|p2a: Clefable|88/100|[from] Stealth Rock\n|-item|p2a: Clefable|Leftovers\n|turn|2\n|-enditem|p2a: Clefable|Leftovers|[from] move: Knock Off\n|turn|3\n|switch|p2a: Clefable|Clefable, L80';
const clefableMagicGuardRecoveryParser = vm.runInContext(`(() => {
  const parser = new ReplayParser();
  parser.parse(${JSON.stringify(clefableMagicGuardRecoveryLog)});
  return parser.replayRead;
})()`, context, { timeout: 10000 });
const clefableMagicGuardRecoveryTarget = clefableMagicGuardRecoveryParser.targets.find(t => t.species === 'Clefable');
assert(clefableMagicGuardRecoveryTarget?.detectiveInputs?.[0]?.postItemLossProtectionAbilities?.includes('Magic Guard'), 'offline replay reasoning should keep Magic Guard live when later Stealth Rock no-chip can explain the new state');

vm.runInContext(
  `team=[
    preset("Great Tusk","Heavy-Duty Boots","Impish",{hp:252,atk:4,def:252,spa:0,spd:0,spe:0},["Close Combat","Headlong Rush","Rapid Spin","Knock Off"])
  ];
  lastReplayRead=${JSON.stringify({ strongest: clefableMagicGuardRecoveryTarget })};
  loadReplayDetective();`,
  context,
  { timeout: 10000 }
);
const clefableMagicGuardRecoveryRead = vm.runInContext('lastDetectiveRead', context, { timeout: 10000 });
assert(clefableMagicGuardRecoveryRead.summary.notes.some(x => /Magic Guard/i.test(x)), 'offline replay reads should explain that Magic Guard stays live after post-loss Stealth Rock immunity');
assert(clefableMagicGuardRecoveryRead.abilityRows[0][0] === 'Magic Guard', 'offline replay reads should let Magic Guard lead the ability ranking when it fits the later hazard immunity');

console.log('[OK] hidden info detective reasoning passed');
