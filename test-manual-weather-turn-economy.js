const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const ctx={
    console,
    unique(values=[]){return [...new Set(values)];},
    njCap:clampScore,
    offensiveMoveTypes(mon){return mon.offensiveTypes||[];},
    types(mon){return mon.types||[];},
    profileTeam(team=[]){
      return {
        drought:team.filter(mon=>mon.ability==='Drought').map(mon=>mon.species),
        drizzle:team.filter(mon=>mon.ability==='Drizzle').map(mon=>mon.species),
        hazards:team.filter(mon=>mon.moves.some(move=>['Stealth Rock','Spikes','Toxic Spikes','Sticky Web'].includes(move))).map(mon=>mon.species),
        layers:team.filter(mon=>mon.moves.some(move=>['Spikes','Toxic Spikes','Sticky Web'].includes(move))).map(mon=>mon.species),
        removalDenial:team.filter(mon=>mon.isRemovalDenial).map(mon=>mon.species),
        pivot:team.filter(mon=>mon.moves.some(move=>['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport'].includes(move))).map(mon=>mon.species),
        defensiveAnchors:team.filter(mon=>mon.isDefensiveAnchor).map(mon=>mon.species),
      };
    },
    detectIdentities(){
      return {
        primary:{name:'Rain Offense',score:86,evidence:['base read']},
        secondary:[],
        all:[
          {name:'Rain Offense',score:86,evidence:['base read']},
          {name:'Sun Offense',score:84,evidence:['base read']},
          {name:'Sun Room',score:80,evidence:['base read']},
          {name:'Trick Room Offense',score:82,evidence:['base read']},
          {name:'Balance',score:73,evidence:['base read']},
          {name:'Bulky Offense',score:70,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:81,speedControl:79,roleCompression:76,offensiveCoverage:78,fieldControl:79},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/weather-identity-upgrades.js','utf8'),ctx,{filename:'weather-identity-upgrades.js'});
  vm.runInContext(fs.readFileSync('src/weather-turn-economy-upgrades.js','utf8'),ctx,{filename:'weather-turn-economy-upgrades.js'});
  return ctx;
}

function mon(species,{
  ability='',
  item='Leftovers',
  moves=[],
  offensiveTypes=[],
  types=[],
  baseSpeed=80,
  atk=95,
  spa=95,
  isDefensiveAnchor=false,
  isRemovalDenial=false,
}={}){
  return {
    species,
    ability,
    item,
    moves,
    offensiveTypes,
    types,
    baseStats:{spe:baseSpeed,atk,spa},
    isDefensiveAnchor,
    isRemovalDenial,
  };
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=makeContext();

const clunkyManualRainTeam=[
  mon('Jirachi',{moves:['Rain Dance','Wish','Iron Head','Stealth Rock'],types:['Steel','Psychic'],offensiveTypes:['Steel','Psychic'],baseSpeed:100,atk:100,spa:100}),
  mon('Bronzong',{moves:['Rain Dance','Body Press','Earthquake','Explosion'],types:['Steel','Psychic'],offensiveTypes:['Fighting','Ground'],baseSpeed:33,atk:89,spa:79,isDefensiveAnchor:true}),
  mon('Barraskewda',{ability:'Swift Swim',item:'Choice Band',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Weather Ball','Roost','Heat Wave'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal','Fire'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const cleanManualRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Whimsicott',{moves:['Rain Dance','Encore','Memento','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Barraskewda',{ability:'Swift Swim',item:'Choice Band',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Weather Ball','Roost','Volt Switch'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const clunkyManualSunTeam=[
  mon('Cresselia',{moves:['Sunny Day','Moonlight','Lunar Dance','Ice Beam'],types:['Psychic'],offensiveTypes:['Ice'],baseSpeed:85,atk:70,spa:75,isDefensiveAnchor:true}),
  mon('Charizard',{moves:['Sunny Day','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Sludge Bomb','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Poison'],baseSpeed:80,atk:82,spa:100}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const cleanManualSunTeam=[
  mon('Whimsicott',{moves:['Sunny Day','Encore','Memento','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Charizard',{moves:['Sunny Day','Weather Ball','Solar Beam','U-turn'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Weather Ball','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Normal'],baseSpeed:80,atk:82,spa:100}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const clunkyRainProfile=ctx.profileTeam(clunkyManualRainTeam,{});
assert(clunkyRainProfile.rainSetters.length===2,'clunky rain team should have two manual setters');
assert(clunkyRainProfile.rainExternalPayoffs.length>=2,'clunky rain team should still have multiple external payoffs');
assert(clunkyRainProfile.rainHandoffSetters.length===0,'clunky rain team should have no clean handoff setter');
const clunkyRainIdentity=ctx.detectIdentities(clunkyManualRainTeam,{},clunkyRainProfile);
const clunkyRainRow=clunkyRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(clunkyRainIdentity.primary.name!=='Rain Offense','clunky manual rain shell should not keep Rain Offense as the primary read');
assert(clunkyRainRow.score<clunkyRainIdentity.all.find(row=>row.name==='Balance').score,'clunky manual rain score should fall below the balance read');
assert(clunkyRainRow.evidence.some(line=>/cannot hand weather turns cleanly/i.test(line)),'clunky manual rain shell should explain the handoff problem');
const clunkyRainSynergy=ctx.evaluateSynergy(clunkyManualRainTeam,{},clunkyRainProfile,clunkyRainIdentity);
assert(clunkyRainSynergy.scores.winReliability<81,'clunky manual rain shell should lose win reliability');
assert(clunkyRainSynergy.issues.some(issue=>issue.title==='Manual rain turns are hard to hand off'),'clunky manual rain shell should surface the turn-economy issue');

const cleanRainProfile=ctx.profileTeam(cleanManualRainTeam,{});
assert(cleanRainProfile.rainHandoffSetters.length===2,'clean rain team should keep two handoff-capable setters');
const cleanRainIdentity=ctx.detectIdentities(cleanManualRainTeam,{},cleanRainProfile);
assert(cleanRainIdentity.all.find(row=>row.name==='Rain Offense').score===86,'clean manual rain team should keep its base rain confidence');
const cleanRainSynergy=ctx.evaluateSynergy(cleanManualRainTeam,{},cleanRainProfile,cleanRainIdentity);
assert(!cleanRainSynergy.issues.some(issue=>issue.title==='Manual rain turns are hard to hand off'),'clean manual rain team should not get the handoff issue');

const clunkySunProfile=ctx.profileTeam(clunkyManualSunTeam,{});
assert(clunkySunProfile.sunSetters.length===2,'clunky sun team should have two manual setters');
assert(clunkySunProfile.sunExternalPayoffs.length>=2,'clunky sun team should still have multiple external payoffs');
assert(clunkySunProfile.sunHandoffSetters.length===0,'clunky sun team should have no clean handoff setter');
const clunkySunIdentity=ctx.detectIdentities(clunkyManualSunTeam,{},clunkySunProfile);
const clunkySunRow=clunkySunIdentity.all.find(row=>row.name==='Sun Offense');
assert(clunkySunIdentity.primary.name!=='Sun Offense','clunky manual sun shell should not keep Sun Offense as the primary read');
assert(clunkySunRow.score<clunkySunIdentity.all.find(row=>row.name==='Balance').score,'clunky manual sun score should fall below the balance read');
assert(clunkySunRow.evidence.some(line=>/cannot hand weather turns cleanly/i.test(line)),'clunky manual sun shell should explain the handoff problem');
const clunkySunSynergy=ctx.evaluateSynergy(clunkyManualSunTeam,{},clunkySunProfile,clunkySunIdentity);
assert(clunkySunSynergy.scores.winReliability<81,'clunky manual sun shell should lose win reliability');
assert(clunkySunSynergy.issues.some(issue=>issue.title==='Manual sun turns are hard to hand off'),'clunky manual sun shell should surface the turn-economy issue');

const cleanSunProfile=ctx.profileTeam(cleanManualSunTeam,{});
assert(cleanSunProfile.sunHandoffSetters.length===2,'clean sun team should keep two handoff-capable setters');
const cleanSunIdentity=ctx.detectIdentities(cleanManualSunTeam,{},cleanSunProfile);
assert(cleanSunIdentity.all.find(row=>row.name==='Sun Offense').score===84,'clean manual sun team should keep its base sun confidence');
const cleanSunSynergy=ctx.evaluateSynergy(cleanManualSunTeam,{},cleanSunProfile,cleanSunIdentity);
assert(!cleanSunSynergy.issues.some(issue=>issue.title==='Manual sun turns are hard to hand off'),'clean manual sun team should not get the handoff issue');

console.log('[OK] manual weather turn-economy regression passed');
