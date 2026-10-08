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

const setterHeavyRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Zapdos',{moves:['Rain Dance','Thunder','Weather Ball','Roost'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Stealth Rock','Headlong Rush','Knock Off'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Heatran',{moves:['Magma Storm','Earth Power','Protect','Taunt'],types:['Fire','Steel'],offensiveTypes:['Fire','Ground'],baseSpeed:77,atk:90,spa:130}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const setterHeavyRainProfile=ctx.profileTeam(setterHeavyRainTeam,{});
assert(setterHeavyRainProfile.rainSetters.length===2,'setter-heavy rain team should have two rain setters');
assert(setterHeavyRainProfile.rainDedicatedPayoffs.length===3,'setter-heavy rain team should still show three total rain payoffs');
assert(setterHeavyRainProfile.rainExternalPayoffs.length===1,'only one rain payoff should exist outside the setters');
const setterHeavyRainIdentity=ctx.detectIdentities(setterHeavyRainTeam,{},setterHeavyRainProfile);
const setterHeavyRainRow=setterHeavyRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(setterHeavyRainIdentity.primary.name!=='Rain Offense','setter-heavy rain shell should not keep Rain Offense as the primary read');
assert(setterHeavyRainRow.score<setterHeavyRainIdentity.all.find(row=>row.name==='Balance').score,'setter-heavy rain score should fall below the balance read');
assert(setterHeavyRainRow.evidence.some(line=>/setters themselves/i.test(line)),'setter-heavy rain shell should explain that too much payoff load sits on the setters');
const setterHeavyRainSynergy=ctx.evaluateSynergy(setterHeavyRainTeam,{},setterHeavyRainProfile,setterHeavyRainIdentity);
assert(setterHeavyRainSynergy.scores.winReliability<81,'setter-heavy rain shell should lose win reliability');
assert(setterHeavyRainSynergy.issues.some(issue=>issue.title==='Manual rain support is overstretched'),'setter-heavy rain shell should surface the overstretched manual-rain issue');

const realRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Zapdos',{moves:['Rain Dance','Thunder','Weather Ball','Roost'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal'],baseSpeed:100,atk:90,spa:125}),
  mon('Barraskewda',{ability:'Swift Swim',item:'Choice Band',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Raging Bolt',{moves:['Thunderclap','Thunder','Dragon Pulse','Calm Mind'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
  mon('Great Tusk',{moves:['Rapid Spin','Stealth Rock','Headlong Rush','Knock Off'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const realRainProfile=ctx.profileTeam(realRainTeam,{});
assert(realRainProfile.rainSetters.length===2,'real rain team should keep two setters');
assert(realRainProfile.rainExternalPayoffs.length>=3,'real rain team should have several payoffs beyond the setters');
const realRainIdentity=ctx.detectIdentities(realRainTeam,{},realRainProfile);
assert(realRainIdentity.all.find(row=>row.name==='Rain Offense').score===86,'real multi-setter rain team should keep its base rain score');
const realRainSynergy=ctx.evaluateSynergy(realRainTeam,{},realRainProfile,realRainIdentity);
assert(!realRainSynergy.issues.some(issue=>issue.title==='Manual rain support is overstretched'),'real multi-setter rain team should not get the setter-burden issue');

const setterHeavySunTeam=[
  mon('Charizard',{moves:['Sunny Day','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Sunny Day','Hydro Steam','Draco Meteor','Flamethrower'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Sludge Bomb','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Poison'],baseSpeed:80,atk:82,spa:100}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Primarina',{moves:['Surf','Moonblast','Calm Mind','Psychic Noise'],types:['Water','Fairy'],offensiveTypes:['Water','Fairy','Psychic'],baseSpeed:60,atk:74,spa:126}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const setterHeavySunProfile=ctx.profileTeam(setterHeavySunTeam,{});
assert(setterHeavySunProfile.sunSetters.length===2,'setter-heavy sun team should have two sun setters');
assert(setterHeavySunProfile.sunDedicatedPayoffs.length===3,'setter-heavy sun team should still show three total sun payoffs');
assert(setterHeavySunProfile.sunExternalPayoffs.length===1,'only one sun payoff should exist outside the setters');
const setterHeavySunIdentity=ctx.detectIdentities(setterHeavySunTeam,{},setterHeavySunProfile);
const setterHeavySunRow=setterHeavySunIdentity.all.find(row=>row.name==='Sun Offense');
assert(setterHeavySunIdentity.primary.name!=='Sun Offense','setter-heavy sun shell should not keep Sun Offense as the primary read');
assert(setterHeavySunRow.score<setterHeavySunIdentity.all.find(row=>row.name==='Balance').score,'setter-heavy sun score should fall below the balance read');
assert(setterHeavySunRow.evidence.some(line=>/setters themselves/i.test(line)),'setter-heavy sun shell should explain that too much payoff load sits on the setters');
const setterHeavySunSynergy=ctx.evaluateSynergy(setterHeavySunTeam,{},setterHeavySunProfile,setterHeavySunIdentity);
assert(setterHeavySunSynergy.scores.winReliability<81,'setter-heavy sun shell should lose win reliability');
assert(setterHeavySunSynergy.issues.some(issue=>issue.title==='Manual sun support is overstretched'),'setter-heavy sun shell should surface the overstretched manual-sun issue');

const realSunTeam=[
  mon('Charizard',{moves:['Sunny Day','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Sunny Day','Hydro Steam','Draco Meteor','Flamethrower'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Weather Ball','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Normal'],baseSpeed:80,atk:82,spa:100}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Roaring Moon',{ability:'Protosynthesis',moves:['Dragon Dance','Crunch','Acrobatics','Earthquake'],types:['Dragon','Dark'],offensiveTypes:['Dragon','Dark','Flying','Ground'],baseSpeed:119,atk:139,spa:55}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const realSunProfile=ctx.profileTeam(realSunTeam,{});
assert(realSunProfile.sunSetters.length===2,'real sun team should keep two setters');
assert(realSunProfile.sunExternalPayoffs.length>=2,'real sun team should have multiple payoffs beyond the setters');
const realSunIdentity=ctx.detectIdentities(realSunTeam,{},realSunProfile);
assert(realSunIdentity.all.find(row=>row.name==='Sun Offense').score===84,'real multi-setter sun team should keep its base sun score');
const realSunSynergy=ctx.evaluateSynergy(realSunTeam,{},realSunProfile,realSunIdentity);
assert(!realSunSynergy.issues.some(issue=>issue.title==='Manual sun support is overstretched'),'real multi-setter sun team should not get the setter-burden issue');

console.log('[OK] manual weather setter burden regression passed');
