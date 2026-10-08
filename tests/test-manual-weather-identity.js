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

const tokenManualRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Zapdos',{moves:['Thunder','Volt Switch','Roost','Weather Ball'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying'],baseSpeed:100,atk:90,spa:125}),
  mon('Charizard',{moves:['Flamethrower','Hurricane','Roost','Defog'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying'],baseSpeed:100,atk:84,spa:109}),
  mon('Heatran',{moves:['Magma Storm','Earth Power','Protect','Stealth Rock'],types:['Fire','Steel'],offensiveTypes:['Fire','Ground'],baseSpeed:77,atk:90,spa:130}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const goodManualRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Barraskewda',{ability:'Swift Swim',item:'Choice Band',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Volt Switch','Roost','Weather Ball'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Stealth Rock','Headlong Rush','Knock Off'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunderclap','Thunder','Dragon Pulse','Calm Mind'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
];

const tokenManualSunTeam=[
  mon('Whimsicott',{moves:['Sunny Day','Encore','U-turn','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Charizard',{moves:['Flamethrower','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Primarina',{moves:['Surf','Moonblast','Calm Mind','Psychic Noise'],types:['Water','Fairy'],offensiveTypes:['Water','Fairy','Psychic'],baseSpeed:60,atk:74,spa:126}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const goodManualSunTeam=[
  mon('Whimsicott',{moves:['Sunny Day','Encore','U-turn','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Charizard',{moves:['Flamethrower','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Weather Ball','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Normal'],baseSpeed:80,atk:82,spa:100}),
  mon('Great Tusk',{moves:['Rapid Spin','Stealth Rock','Headlong Rush','Knock Off'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Kingambit',{moves:['Swords Dance','Kowtow Cleave','Sucker Punch','Iron Head'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const overstretchedManualRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Whimsicott',{moves:['Rain Dance','Encore','U-turn','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Zapdos',{moves:['Thunder','Volt Switch','Roost','Weather Ball'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying'],baseSpeed:100,atk:90,spa:125}),
  mon('Heatran',{moves:['Magma Storm','Earth Power','Protect','Stealth Rock'],types:['Fire','Steel'],offensiveTypes:['Fire','Ground'],baseSpeed:77,atk:90,spa:130}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const overstretchedManualSunTeam=[
  mon('Whimsicott',{moves:['Sunny Day','Encore','U-turn','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Talonflame',{moves:['Sunny Day','U-turn','Flare Blitz','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying'],baseSpeed:126,atk:81,spa:74}),
  mon('Charizard',{moves:['Flamethrower','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Primarina',{moves:['Surf','Moonblast','Calm Mind','Psychic Noise'],types:['Water','Fairy'],offensiveTypes:['Water','Fairy','Psychic'],baseSpeed:60,atk:74,spa:126}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Kingambit',{moves:['Sucker Punch','Kowtow Cleave','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,spa:60}),
];

const tokenRainProfile=ctx.profileTeam(tokenManualRainTeam,{});
assert(tokenRainProfile.rainSetters.length===1,'token manual rain team should have one rain setter');
assert(tokenRainProfile.rainDedicatedPayoffs.length<=2,'token manual rain team should have too few dedicated rain payoffs');
const tokenRainIdentity=ctx.detectIdentities(tokenManualRainTeam,{},tokenRainProfile);
const tokenRainRow=tokenRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(tokenRainIdentity.primary.name!=='Rain Offense','token manual rain shell should not keep Rain Offense as the primary read');
assert(tokenRainRow.score<tokenRainIdentity.all.find(row=>row.name==='Balance').score,'token manual rain score should fall below the more coherent balance read');
assert(tokenRainRow.evidence.some(line=>/thin manual rain setter/i.test(line)),'token manual rain shell should explain the thin setter problem');
const tokenRainSynergy=ctx.evaluateSynergy(tokenManualRainTeam,{},tokenRainProfile,tokenRainIdentity);
assert(tokenRainSynergy.scores.winReliability<81,'token manual rain shell should lose win reliability');
assert(tokenRainSynergy.issues.some(issue=>issue.title==='Manual rain support is too thin'),'token manual rain shell should surface a manual-rain issue');

const goodRainProfile=ctx.profileTeam(goodManualRainTeam,{});
assert(goodRainProfile.rainSetters.length===1,'good manual rain team should still have one rain setter');
assert(goodRainProfile.rainDedicatedPayoffs.length>=3,'good manual rain team should have several dedicated rain payoffs');
const goodRainIdentity=ctx.detectIdentities(goodManualRainTeam,{},goodRainProfile);
const goodRainRow=goodRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(goodRainRow&&goodRainRow.score===86,'good manual rain team should keep the base rain confidence');
const goodRainSynergy=ctx.evaluateSynergy(goodManualRainTeam,{},goodRainProfile,goodRainIdentity);
assert(!goodRainSynergy.issues.some(issue=>issue.title==='Manual rain support is too thin'),'good manual rain team should not get the thin manual rain issue');

const tokenSunProfile=ctx.profileTeam(tokenManualSunTeam,{});
assert(tokenSunProfile.sunSetters.length===1,'token manual sun team should have one sun setter');
assert(tokenSunProfile.sunDedicatedPayoffs.length<=2,'token manual sun team should have too few dedicated sun payoffs');
const tokenSunIdentity=ctx.detectIdentities(tokenManualSunTeam,{},tokenSunProfile);
const tokenSunRow=tokenSunIdentity.all.find(row=>row.name==='Sun Offense');
assert(tokenSunIdentity.primary.name!=='Sun Offense','token manual sun shell should not keep Sun Offense as the primary read');
assert(tokenSunRow.score<tokenSunIdentity.all.find(row=>row.name==='Balance').score,'token manual sun score should fall below the more coherent balance read');
assert(tokenSunRow.evidence.some(line=>/thin manual sun setter/i.test(line)),'token manual sun shell should explain the thin setter problem');
const tokenSunSynergy=ctx.evaluateSynergy(tokenManualSunTeam,{},tokenSunProfile,tokenSunIdentity);
assert(tokenSunSynergy.scores.winReliability<81,'token manual sun shell should lose win reliability');
assert(tokenSunSynergy.issues.some(issue=>issue.title==='Manual sun support is too thin'),'token manual sun shell should surface a manual-sun issue');

const goodSunProfile=ctx.profileTeam(goodManualSunTeam,{});
assert(goodSunProfile.sunSetters.length===1,'good manual sun team should still have one sun setter');
assert(goodSunProfile.sunDedicatedPayoffs.length>=3,'good manual sun team should have several dedicated sun payoffs');
const goodSunIdentity=ctx.detectIdentities(goodManualSunTeam,{},goodSunProfile);
const goodSunRow=goodSunIdentity.all.find(row=>row.name==='Sun Offense');
assert(goodSunRow&&goodSunRow.score===84,'good manual sun team should keep the base sun confidence');
const goodSunSynergy=ctx.evaluateSynergy(goodManualSunTeam,{},goodSunProfile,goodSunIdentity);
assert(!goodSunSynergy.issues.some(issue=>issue.title==='Manual sun support is too thin'),'good manual sun team should not get the thin manual sun issue');

const overstretchedRainProfile=ctx.profileTeam(overstretchedManualRainTeam,{});
assert(overstretchedRainProfile.rainSetters.length===2,'overstretched manual rain team should have two rain setters');
assert(overstretchedRainProfile.rainDedicatedPayoffs.length<=2,'overstretched manual rain team should still have too few dedicated payoffs');
const overstretchedRainIdentity=ctx.detectIdentities(overstretchedManualRainTeam,{},overstretchedRainProfile);
const overstretchedRainRow=overstretchedRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(overstretchedRainIdentity.primary.name!=='Rain Offense','overstretched manual rain shell should not keep Rain Offense as the primary read');
assert(overstretchedRainRow.score<overstretchedRainIdentity.all.find(row=>row.name==='Balance').score,'overstretched manual rain score should fall below the balance read');
assert(overstretchedRainRow.evidence.some(line=>/multiple manual rain setters/i.test(line)),'overstretched manual rain shell should explain the setter burden');
const overstretchedRainSynergy=ctx.evaluateSynergy(overstretchedManualRainTeam,{},overstretchedRainProfile,overstretchedRainIdentity);
assert(overstretchedRainSynergy.scores.winReliability<81,'overstretched manual rain shell should lose win reliability');
assert(overstretchedRainSynergy.issues.some(issue=>issue.title==='Manual rain support is overstretched'),'overstretched manual rain shell should surface the setter-burden issue');

const overstretchedSunProfile=ctx.profileTeam(overstretchedManualSunTeam,{});
assert(overstretchedSunProfile.sunSetters.length===2,'overstretched manual sun team should have two sun setters');
assert(overstretchedSunProfile.sunDedicatedPayoffs.length<=2,'overstretched manual sun team should still have too few dedicated payoffs');
const overstretchedSunIdentity=ctx.detectIdentities(overstretchedManualSunTeam,{},overstretchedSunProfile);
const overstretchedSunRow=overstretchedSunIdentity.all.find(row=>row.name==='Sun Offense');
assert(overstretchedSunIdentity.primary.name!=='Sun Offense','overstretched manual sun shell should not keep Sun Offense as the primary read');
assert(overstretchedSunRow.score<overstretchedSunIdentity.all.find(row=>row.name==='Balance').score,'overstretched manual sun score should fall below the balance read');
assert(overstretchedSunRow.evidence.some(line=>/multiple manual sun setters/i.test(line)),'overstretched manual sun shell should explain the setter burden');
const overstretchedSunSynergy=ctx.evaluateSynergy(overstretchedManualSunTeam,{},overstretchedSunProfile,overstretchedSunIdentity);
assert(overstretchedSunSynergy.scores.winReliability<81,'overstretched manual sun shell should lose win reliability');
assert(overstretchedSunSynergy.issues.some(issue=>issue.title==='Manual sun support is overstretched'),'overstretched manual sun shell should surface the setter-burden issue');

console.log('[OK] manual weather depth checks passed');