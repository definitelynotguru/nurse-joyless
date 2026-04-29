const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = [
  fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'src/replay-ability-upgrades.js'), 'utf8'),
  fs.readFileSync(path.join(__dirname, 'src/ko-upgrades.js'), 'utf8'),
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
    classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return makeFakeElement(); },
    scrollIntoView(){},
    appendChild(){},
    click(){},
  };
}
const elements = {};
const doc = {
  addEventListener(){},
  getElementById(id) { if (!elements[id]) elements[id] = makeFakeElement(); return elements[id]; },
  querySelectorAll() { return []; },
  createElement() { return makeFakeElement(); },
};
const fakeDex = {
  species: {
    get(name) {
      const id = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const data = {
        mewtwo: { name: 'Mewtwo', id:'mewtwo', exists: true, types: ['Psychic'], baseStats: { hp:106, atk:110, def:90, spa:154, spd:90, spe:130 }, abilities: {0:'Pressure', H:'Unnerve'} },
        blastoise: { name: 'Blastoise', id:'blastoise', exists: true, types: ['Water'], baseStats: { hp:79, atk:83, def:100, spa:85, spd:105, spe:78 }, abilities: {0:'Torrent', H:'Rain Dish'} },
        dragapult: { name: 'Dragapult', id:'dragapult', exists: true, types: ['Dragon','Ghost'], baseStats: { hp:88, atk:120, def:75, spa:100, spd:75, spe:142 }, abilities: {0:'Clear Body', 1:'Infiltrator'} },
        heatran: { name: 'Heatran', id:'heatran', exists: true, types: ['Fire','Steel'], baseStats: { hp:91, atk:90, def:106, spa:130, spd:106, spe:77 }, abilities: {0:'Flash Fire'} },
      };
      return data[id] || { name, id, exists: false };
    },
    all() { return [this.get('Mewtwo'), this.get('Blastoise'), this.get('Dragapult'), this.get('Heatran')]; }
  },
  moves: {
    get(name) {
      const id = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const data = {
        aurasphere: { name: 'Aura Sphere', id:'aurasphere', exists: true, type: 'Fighting', category: 'Special', basePower: 80, accuracy: true, priority: 0 },
        shadowball: { name: 'Shadow Ball', id:'shadowball', exists: true, type: 'Ghost', category: 'Special', basePower: 80, accuracy: 100, priority: 0 },
        flamethrower: { name: 'Flamethrower', id:'flamethrower', exists: true, type: 'Fire', category: 'Special', basePower: 90, accuracy: 100, priority: 0 },
        thunderwave: { name: 'Thunder Wave', id:'thunderwave', exists: true, type: 'Electric', category: 'Status', basePower: 0, accuracy: 90, priority: 0 },
        surf: { name: 'Surf', id:'surf', exists: true, type: 'Water', category: 'Special', basePower: 90, accuracy: 100, priority: 0 },
      };
      return data[id] || { name, id, exists: false };
    },
    all() { return [this.get('Aura Sphere'), this.get('Shadow Ball'), this.get('Flamethrower'), this.get('Thunder Wave'), this.get('Surf')]; }
  },
  getLearnsets: async () => ({learnsets:{mewtwo:{learnset:{aurasphere:['9M'],shadowball:['9M']}},blastoise:{learnset:{surf:['9M']}}}}),
};
const context = {
  console,
  setTimeout(fn){ fn(); return 0; },
  alert(){},
  localStorage: { getItem(){ return ''; }, setItem(){} },
  navigator: { clipboard: { writeText(){ return Promise.resolve(); } } },
  document: doc,
  window: { pkmn: { Dex: fakeDex }, addEventListener(){} },
  URL: { createObjectURL(){return 'blob:test'}, revokeObjectURL(){} },
  Blob: function Blob(){},
  fetch: async () => { throw new Error('offline'); },
};
const tests = String.raw`
(function(){
  function assert(cond, msg){ if(!cond) throw new Error(msg); }
  const calc = window.dmg || dmg;
  const renderKoCalc = window.renderKo || renderKo;
  assert(DexAdapter.useDex === true, 'DexAdapter did not detect fake full Dex');
  assert(types({species:'Mewtwo'}).join('/') === 'Psychic', 'types() is not using DexAdapter species data');
  const mt = preset('Mewtwo','Life Orb','Timid',{hp:0,atk:0,def:0,spa:252,spd:4,spe:252},['Aura Sphere','Shadow Ball']);
  const bl = preset('Blastoise','Leftovers','Calm',{hp:252,atk:0,def:0,spa:0,spd:252,spe:4},['Surf']);
  assert(moveName('aura sphere') === 'Aura Sphere', 'moveName() is not using DexAdapter move resolver');
  const ko = calc(mt, bl, 'Aura Sphere', { hpPct: 50 });
  const abilityRead = buildDetectiveRead({
    species:'Dragapult',
    evidence:'they_hit_me',
    move:'Shadow Ball',
    observedDamage:43,
    revealedAbility:'Infiltrator',
    user:bl,
  });
  assert(abilityRead.abilityRows[0][0] === 'Infiltrator', 'detective ability ranking should honor a revealed ability');
  assert(abilityRead.top.every(x => x.ability === 'Infiltrator'), 'revealed ability should prune incompatible ability lines');

  assert(html('\"x\" & <tag>') === '&quot;x&quot; &amp; &lt;tag&gt;', 'html() must escape quotes for attribute-safe rendering');
  const teraAtt = preset('Dragapult','Life Orb','Timid',{hp:0,atk:0,def:0,spa:252,spd:4,spe:252},['Flamethrower']);
  const teraDef = preset('Corviknight','Leftovers','Impish',{hp:248,atk:0,def:252,spa:0,spd:8,spe:0},['Roost']);
  const noTeraFire = calc(teraAtt, teraDef, 'Flamethrower', { hpPct: 100 });
  const yesTeraFire = calc(teraAtt, teraDef, 'Flamethrower', { hpPct: 100, attackerTera: true, attackerTeraType: 'Fire' });
  const flashFireDef = preset('Heatran','Leftovers','Calm',{hp:252,atk:0,def:4,spa:0,spd:252,spe:0},['Flamethrower']);
  flashFireDef.ability = 'Flash Fire';
  const flashFireRoll = calc(teraAtt, flashFireDef, 'Flamethrower', { hpPct: 100 });
  const neutralSurf = calc(bl, mt, 'Surf', { hpPct: 100 });
  const rainSurf = calc(bl, mt, 'Surf', { hpPct: 100, weather: 'rain' });
  const screenSurf = calc(bl, mt, 'Surf', { hpPct: 100, defenderProtect: 'screen' });
  const stackedSurf = calc(bl, mt, 'Surf', { hpPct: 100, weather: 'rain', defenderProtect: 'screen' });
  const swappedScreenSurf = calc(bl, mt, 'Surf', { hpPct: 100, ...window.swapBattleState(window.normalizeBattleState({ weather: 'rain', defenderProtect: 'screen' })) });
  const neutralAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100 });
  const boostedAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100, attackerOffenseStage: 2 });
  const bulkedAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100, defenderBulkStage: 2 });
  const helpingHandAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100, helpingHand: true });
  const helpingHandTwoHitAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 90, helpingHand: true });
  const chipWindowAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 90, helpingHand: true, defenderEndStepDamagePct: 12.5, extraEndSteps: 1 });
  const reverseHelpingHandAuraSphere = calc(bl, mt, 'Surf', { hpPct: 100, ...window.swapBattleState(window.normalizeBattleState({ helpingHand: true, defenderEndStepDamagePct: 12.5, extraEndSteps: 1 })) });
  const electricThunderbolt = calc(mt, bl, 'Thunderbolt', { hpPct: 100, terrain: 'electric' });
  const neutralThunderbolt = calc(mt, bl, 'Thunderbolt', { hpPct: 100 });
  const grassyEarthquake = calc(preset('Great Tusk','Leftovers','Adamant',{hp:252,atk:252,def:4,spa:0,spd:0,spe:0},['Earthquake']), bl, 'Earthquake', { hpPct: 100, terrain: 'grassy' });
  const neutralEarthquake = calc(preset('Great Tusk','Leftovers','Adamant',{hp:252,atk:252,def:4,spa:0,spd:0,spe:0},['Earthquake']), bl, 'Earthquake', { hpPct: 100 });
  const burnedEarthquake = calc(preset('Great Tusk','Leftovers','Adamant',{hp:252,atk:252,def:4,spa:0,spd:0,spe:0},['Earthquake']), bl, 'Earthquake', { hpPct: 100, attackerStatus: 'burn' });
  const critAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100, criticalHit: true, defenderBulkStage: 4 });
  const boostedBulkAuraSphere = calc(mt, bl, 'Aura Sphere', { hpPct: 100, defenderBulkStage: 4 });
  assert(yesTeraFire.maxd > noTeraFire.maxd * 1.2, 'attacker Tera type should increase STAB damage for matching Tera moves');
  assert(flashFireRoll.maxd === 0 && flashFireRoll.blockedBy === 'Flash Fire', 'damage engine should respect Flash Fire immunity');
  assert(stackedSurf.maxd < rainSurf.maxd && stackedSurf.maxd > screenSurf.maxd, 'KO calc should stack weather and defender screen instead of letting one overwrite the other');
  assert(swappedScreenSurf.maxd === rainSurf.maxd, 'reverse KO math should not inherit the original defender screen onto the wrong side');
  assert(boostedAuraSphere.maxd > ko.maxd, 'attacker offense stages should increase KO damage');
  assert(bulkedAuraSphere.maxd < ko.maxd, 'defender bulk stages should reduce KO damage');
  assert(helpingHandAuraSphere.maxd > ko.maxd * 1.45, 'Helping Hand should materially boost outgoing damage');
  assert(nHitChance(chipWindowAuraSphere, 2) > nHitChance(helpingHandTwoHitAuraSphere, 2), 'extra end-step chip windows should improve multi-hit KO odds when the damage range is already in play');
  assert(reverseHelpingHandAuraSphere.maxd === neutralSurf.maxd, 'reverse KO math should drop one-sided Helping Hand and chip-window context');
  assert(electricThunderbolt.maxd > neutralThunderbolt.maxd * 1.25, 'Electric Terrain should materially boost grounded Electric attacks');
  assert(grassyEarthquake.maxd < neutralEarthquake.maxd * 0.6, 'Grassy Terrain should heavily reduce grounded Earthquake damage');
  assert(burnedEarthquake.maxd < neutralEarthquake.maxd * 0.6, 'burn should heavily reduce physical damage from non-Guts attackers');
  assert(critAuraSphere.maxd > boostedBulkAuraSphere.maxd * 1.45, 'critical hits should punch through positive defender bulk stages');
  assert(ko.rolls.length === 16 && Number.isFinite(ko.ko), 'dmg() failed with Dex-only move/species');
  assert(nHitChance(ko,2) >= ko.ko, '2HKO chance should not be below OHKO chance');

  const parsed = parseTeam('Mewtwo @ Life Orb\nAbility: Pressure\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- aura sphere\n- shadow ball');
  assert(parsed[0].species === 'Mewtwo', 'parseTeam species normalization failed with Dex-only species');
  assert(parsed[0].moves[0] === 'Aura Sphere', 'parseTeam move normalization failed with Dex-only move');

  team = parseTeam(SAMPLE); analysis = analyze(team); lastReasoning = buildReasoningReport();
  assert(/Dragon Spam/.test(lastReasoning.identity.primary.name), 'Sparring Lab failed to detect Dragon Spam Offense');
  const stallScore = lastReasoning.identity.all.find(x => x.name === 'Stall').score;
  assert(stallScore < 60, 'Sparring Lab is overclassifying dragon spam as stall');
  assert(lastReasoning.matchups.find(x => x.name === 'Hazard Stack').score >= 45, 'Hazard matchup should account for Boots/Defog counterplay');
  renderAdvancedLab(lastReasoning);
  assert(document.getElementById('archetypeResults').innerHTML.includes('Team Identity'), 'Advanced Sparring Lab did not render identity');

  const sunRoom = 'Sunflora @ Expert Belt\nAbility: Solar Power\nTera Type: Fairy\nEVs: 168 HP / 64 Def / 252 SpA / 24 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Giga Drain\n- Earth Power\n- Weather Ball\n- Dazzling Gleam\n\nHoopa-Unbound @ Room Service\nAbility: Magician\nTera Type: Ghost\nEVs: 248 HP / 176 Atk / 72 Def / 12 SpA\nBrave Nature\nIVs: 0 Spe\n- Psychic Noise\n- Hyperspace Fury\n- Drain Punch\n- Trick Room\n\nTorkoal @ Charcoal\nAbility: Drought\nTera Type: Fire\nEVs: 208 HP / 40 Def / 252 SpA / 8 SpD\nQuiet Nature\nIVs: 0 Spe\n- Eruption\n- Lava Plume\n- Rapid Spin\n- Stealth Rock\n\nHatterene @ Focus Sash\nAbility: Magic Bounce\nTera Type: Water\nEVs: 248 HP / 4 Def / 252 SpA / 4 SpD\nQuiet Nature\nIVs: 0 Atk / 0 Spe\n- Psychic Noise\n- Dazzling Gleam\n- Healing Wish\n- Trick Room\n\nUrsaluna @ Flame Orb\nAbility: Guts\nTera Type: Normal\nEVs: 252 Atk / 28 Def / 228 SpD\nBrave Nature\nIVs: 0 Spe\n- Headlong Rush\n- Facade\n- Fire Punch\n- Roar\n\nCresselia @ Mental Herb\nAbility: Levitate\nTera Type: Poison\nEVs: 252 HP / 252 Def / 4 SpD\nRelaxed Nature\nIVs: 0 Atk / 0 Spe\n- Ice Beam\n- Moonlight\n- Trick Room\n- Lunar Dance';
  team = parseTeam(sunRoom); analysis = analyze(team); lastReasoning = buildReasoningReport();
  assert(/Sun Room|Trick Room/.test(lastReasoning.identity.primary.name), 'Sparring Lab failed to detect Sun Room / Trick Room');
  assert(lastReasoning.synergy.scores.speedControl >= 60, 'Trick Room should count as speed control');

  const log = '|turn|3\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Thunder Wave|p1a: Blastoise\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock\n|move|p2a: Dragapult|Shadow Ball|p1a: Blastoise\n|-damage|p1a: Blastoise|57/100\n|turn|4\n|move|p2a: Dragapult|Draco Meteor|p1a: Blastoise\n|-damage|p1a: Blastoise|12/100\n|-item|p2a: Dragapult|Choice Specs\n';
  const parser = new ReplayParser(); const turns = parser.parse(log);
  assert(turns.length === 2, 'ReplayParser did not parse turns');
  assert(parser.evidence.some(e => e.conclusion.includes('Heavy-Duty Boots')), 'ReplayParser did not detect Boots impossible');
  assert(parser.evidence.some(e => e.conclusion.includes('Assault Vest')), 'ReplayParser did not detect AV impossible');
  assert(parser.evidence.some(e => e.conclusion.includes('Choice items contradicted')), 'ReplayParser did not detect a same-stay Choice contradiction');
  assert(parser.replayRead.strongest?.species === 'Dragapult', 'ReplayParser did not select the strongest detective target');
  assert(parser.replayRead.strongest?.revealedItem === 'Choice Specs', 'ReplayParser did not keep revealed item context');
  assert(parser.replayRead.strongest?.detectiveInput?.targetSpecies === 'Blastoise', 'ReplayParser did not keep the actual replay target for detective math');
  const speedLog = '|turn|1\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Dragonite\n|-damage|p1a: Dragonite|55/100\n|move|p1a: Dragonite|Earthquake|p2a: Gholdengo\n|-damage|p2a: Gholdengo|41/100';
  const speedParser = new ReplayParser(); speedParser.parse(speedLog);
  const gholdengoSpeedTarget = speedParser.replayRead.targets.find(t => t.species === 'Gholdengo');
  assert(gholdengoSpeedTarget?.detectiveInput?.speedContext?.opponentSpecies === 'Dragonite', 'ReplayParser did not keep neutral-priority speed context');
  assert(gholdengoSpeedTarget?.detectiveInput?.evidence === 'i_hit_them', 'ReplayParser did not preserve defender-side damage evidence direction');
  assert(gholdengoSpeedTarget?.detectiveInput?.userSpecies === 'Dragonite', 'ReplayParser did not keep the attacking teammate for defender-side detective math');
  const immunityLog = '|turn|1\n|switch|p1a: Blastoise|Blastoise, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Blastoise|Thunder Wave|p2a: Gholdengo\n|-immune|p2a: Gholdengo|[from] ability: Good as Gold';
  const immunityParser = new ReplayParser(); immunityParser.parse(immunityLog);
  const gholdengoImmunityTarget = immunityParser.replayRead.targets.find(t => t.species === 'Gholdengo');
  assert(gholdengoImmunityTarget?.revealedAbility === 'Good as Gold', 'ReplayParser did not keep the revealed immunity ability');
  assert(gholdengoImmunityTarget?.detectiveInput?.evidence === 'clue_only', 'ReplayParser did not create a clue-only detective path for immunity-only evidence');
  assert(gholdengoImmunityTarget?.detectiveInput?.clueLabel.includes('Good as Gold blocked Thunder Wave'), 'ReplayParser did not label the immunity-only detective clue');
  const itemOnlyLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|-item|p2a: Dragapult|Leftovers';
  const itemOnlyParser = new ReplayParser(); itemOnlyParser.parse(itemOnlyLog);
  const dragapultItemTarget = itemOnlyParser.replayRead.targets.find(t => t.species === 'Dragapult');
  assert(dragapultItemTarget?.revealedItem === 'Leftovers', 'ReplayParser did not keep the revealed item on an item-only clue');
  assert(dragapultItemTarget?.detectiveInput?.evidence === 'clue_only', 'ReplayParser did not create a clue-only detective path for item-only evidence');
  assert(dragapultItemTarget?.detectiveInput?.clueLabel === 'Leftovers confirmed', 'ReplayParser did not label the item-only detective clue');
  const defenseLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|35/100\n|-item|p2a: Gholdengo|Leftovers';
  const defenseParser = new ReplayParser(); defenseParser.parse(defenseLog);
  assert(defenseParser.replayRead.strongest?.species === 'Gholdengo', 'ReplayParser did not elevate defender-side evidence when it had the richest clue stack');
  assert(defenseParser.replayRead.strongest?.detectiveInput?.evidence === 'i_hit_them', 'ReplayParser strongest read did not hand defender-side evidence to the detective');
  assert(defenseParser.replayRead.strongest?.detectiveInput?.userSpecies === 'Great Tusk', 'ReplayParser strongest read lost the attacking teammate on defender-side evidence');
  document.getElementById('replayInput').value = log; analyzeReplay();
  assert(document.getElementById('replayResults').innerHTML.includes('Heavy-Duty Boots'), 'Replay Observer did not render evidence');
  assert(document.getElementById('replayResults').innerHTML.includes('Load primary read:'), 'Replay Observer did not offer a detective handoff');
  loadReplayDetective();
  assert(document.getElementById('detective').innerHTML.includes('Choice Specs'), 'Replay handoff did not anchor the detective read');
  document.getElementById('replayInput').value = immunityLog; analyzeReplay();
  assert(document.getElementById('replayResults').innerHTML.includes('Good as Gold blocked Thunder Wave'), 'Replay Observer did not surface the immunity-only detective clue');
  loadReplayDetective();
  assert(lastDetectiveRead?.input?.evidence === 'clue_only', 'Replay immunity clue did not stay detective-loadable without damage');
  assert(document.getElementById('detective').innerHTML.includes('Replay clue: Good as Gold blocked Thunder Wave'), 'detective panel did not explain the no-damage replay clue path');
  document.getElementById('replayInput').value = itemOnlyLog; analyzeReplay();
  assert(document.getElementById('replayResults').innerHTML.includes('Leftovers confirmed'), 'Replay Observer did not surface the item-only detective clue');
  loadReplayDetective();
  assert(lastDetectiveRead?.input?.revealedItem === 'Leftovers', 'Replay item clue did not carry the revealed item into the detective');
  assert(document.getElementById('detective').innerHTML.includes('Leftovers'), 'detective panel did not anchor the item-only replay clue');
  lastDetectiveRead = abilityRead; renderDetectiveRead(abilityRead);
  assert(document.getElementById('detective').innerHTML.includes('Likely abilities'), 'detective panel should render ability rankings when ability evidence exists');
  assert(document.getElementById('detective').innerHTML.includes('Infiltrator'), 'detective panel should show the revealed ability');
  const detectiveFacts = getAgentFacts('detective');
  assert(detectiveFacts.species === 'Dragapult', 'Detective agent facts did not use the live detective read');
  assert(/Choice Specs/.test(detectiveFacts.verdict || '') || detectiveFacts.topItem === 'Choice Specs', 'Detective agent facts did not carry the anchored item read');
  const branchLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|58/100\n|move|p1a: Great Tusk|Headlong Rush|p2a: Gholdengo\n|-damage|p2a: Gholdengo|29/100\n|-item|p2a: Gholdengo|Leftovers';
  document.getElementById('replayInput').value = branchLog; analyzeReplay();
  assert(document.getElementById('replayResults').innerHTML.includes('Load alternate read:'), 'Replay Observer did not surface alternate detective branches');
  loadReplayDetective(1);
  assert(lastDetectiveRead?.input?.move === 'Make It Rain', 'alternate replay detective branch did not stay loadable');
  const multiTargetLog = '|turn|1\n|switch|p1a: Great Tusk|Great Tusk, L80\n|switch|p2a: Gholdengo|Gholdengo, L80\n|move|p2a: Gholdengo|Make It Rain|p1a: Great Tusk\n|-damage|p1a: Great Tusk|58/100\n|-item|p2a: Gholdengo|Leftovers\n|turn|2\n|switch|p1a: Dragonite|Dragonite, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p2a: Dragapult|Shadow Ball|p1a: Dragonite\n|-damage|p1a: Dragonite|55/100\n|-damage|p2a: Dragapult|88/100|[from] Stealth Rock';
  document.getElementById('replayInput').value = multiTargetLog; analyzeReplay();
  assert(lastReplayRead?.targets?.length >= 2, 'Replay Observer did not keep multiple replay-backed targets');
  assert(document.getElementById('replayResults').innerHTML.includes('Other live targets'), 'Replay Observer did not render secondary replay targets');
  const secondaryReplayTarget = lastReplayRead.targets[1];
  assert(document.getElementById('replayResults').innerHTML.includes(secondaryReplayTarget.species), 'Replay Observer did not name the secondary replay target');
  loadReplayDetective(1, 0);
  assert(lastDetectiveRead?.input?.species === secondaryReplayTarget.species, 'Replay Observer did not load the secondary replay target into the detective');
  const mirrorLog = '|turn|1\n|switch|p1a: Dragapult|Dragapult, L80\n|switch|p2a: Dragapult|Dragapult, L80\n|move|p1a: Dragapult|Thunder Wave|p2a: Dragapult\n|move|p2a: Dragapult|Shadow Ball|p1a: Dragapult\n|-damage|p1a: Dragapult|57/100\n|-item|p2a: Dragapult|Choice Specs';
  document.getElementById('replayInput').value = mirrorLog; analyzeReplay();
  const mirrorTargets = lastReplayRead.targets.filter(t => t.species === 'Dragapult');
  assert(mirrorTargets.length === 2, 'Replay Observer should keep mirror-match same-species targets separate');
  assert(document.getElementById('replayResults').innerHTML.includes('Dragapult (p1)'), 'Replay Observer should label duplicate-species targets by side');
  assert(document.getElementById('replayResults').innerHTML.includes('Dragapult (p2)'), 'Replay Observer should render the opponent-side duplicate-species label');

  document.getElementById('attacker').value = '0'; document.getElementById('attacker')._items = [mt];
  document.getElementById('defender').value = '0'; document.getElementById('defender')._items = [bl];
  document.getElementById('move').value = 'Aura Sphere'; document.getElementById('hp').value = '50';
  document.getElementById('hazards').value = 'none'; document.getElementById('weather').value = 'rain'; document.getElementById('terrain').value = 'electric'; document.getElementById('helpingHand').checked = true; document.getElementById('defenderProtect').value = 'screen'; document.getElementById('attackerOffenseStage').value = '2'; document.getElementById('defenderBulkStage').value = '1'; document.getElementById('attackerStatus').value = 'burn'; document.getElementById('criticalHit').checked = true; document.getElementById('extraEndSteps').value = '1'; document.getElementById('defenderEndStepDamagePct').value = '12.5';
  document.getElementById('attackerTera').checked = false; document.getElementById('defenderTera').checked = true; document.getElementById('defenderTeraType').value = 'Dark';
  renderKoCalc(); assert(document.getElementById('ko').innerHTML.includes('3HKO odds'), 'KO panel missing 3HKO odds');
  assert(document.getElementById('ko').innerHTML.includes('Battle state: Rain'), 'KO panel should summarize the active battle state');
  assert(document.getElementById('ko').innerHTML.includes('Electric Terrain'), 'KO panel should summarize the active terrain');
  assert(document.getElementById('ko').innerHTML.includes('Helping Hand'), 'KO panel should summarize Helping Hand support');
  assert(document.getElementById('ko').innerHTML.includes('defender Light Screen'), 'KO panel should surface defender-side protection in the summary');
  assert(document.getElementById('ko').innerHTML.includes('attacker +2 offense'), 'KO panel should surface stage context in the summary');
  assert(document.getElementById('ko').innerHTML.includes('attacker Burned'), 'KO panel should summarize attacker status');
  assert(document.getElementById('ko').innerHTML.includes('critical hit'), 'KO panel should summarize critical-hit context');
  assert(document.getElementById('ko').innerHTML.includes('extra end-step window'), 'KO panel should explain extra end-step windows');

  const md = buildMarkdownReport(lastReasoning); assert(md.includes('Matchup Matrix') && md.includes('Suggested Additions'), 'Markdown report incomplete');
  const val = validateTeamAdvanced(team); assert(val.length === 6, 'Validation did not process all team members');
  console.log('[OK] smoke tests passed');
})();
`;
vm.runInNewContext(source + '\n' + tests, context, { timeout: 5000 });
