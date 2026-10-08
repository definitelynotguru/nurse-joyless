const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

const RAIN_SIGNAL_MOVES=['Hurricane','Thunder'];
const SUN_MOVES=['Weather Ball','Solar Beam','Solar Blade'];
const PIVOT_MOVES=['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport','Memento','Healing Wish','Baton Pass','Chilly Reception'];

function mon(species,{
  ability='',
  moves=[],
  offensiveTypes=[],
  types=[],
  baseSpeed=80,
  atk=95,
  spa=95,
}={}){
  return {
    species,
    ability,
    moves,
    offensiveTypes,
    types,
    baseStats:{spe:baseSpeed,atk,spa},
  };
}

function hasAnyMove(mon,names=[]){
  const wanted=new Set((names||[]).map(name=>String(name||'').trim()).filter(Boolean));
  return (mon.moves||[]).some(move=>wanted.has(String(move||'').trim()));
}

function isOffensiveMon(mon){
  return (mon.offensiveTypes||[]).length>=2||Math.max(mon.baseStats?.atk||0,mon.baseStats?.spa||0)>=105;
}

function makeContext(){
  const ctx={
    console,
    unique(values=[]){return [...new Set(values)];},
    njCap:clampScore,
    profileTeam(team=[]){
      const rainSetters=team.filter(mon=>mon.ability==='Drizzle'||hasAnyMove(mon,['Rain Dance'])).map(mon=>mon.species);
      const rainDedicatedPayoffs=team.filter(mon=>{
        if(mon.ability==='Swift Swim')return true;
        if((mon.offensiveTypes||[]).includes('Water'))return true;
        return isOffensiveMon(mon)&&!(mon.offensiveTypes||[]).includes('Fire')&&hasAnyMove(mon,RAIN_SIGNAL_MOVES);
      }).map(mon=>mon.species);
      const sunSetters=team.filter(mon=>mon.ability==='Drought'||hasAnyMove(mon,['Sunny Day'])).map(mon=>mon.species);
      const sunDedicatedPayoffs=team.filter(mon=>{
        if(['Chlorophyll','Solar Power'].includes(mon.ability))return true;
        if(hasAnyMove(mon,SUN_MOVES))return true;
        return mon.ability==='Protosynthesis'&&((mon.offensiveTypes||[]).includes('Fire')||hasAnyMove(mon,['Hydro Steam']));
      }).map(mon=>mon.species);
      return {
        drizzle:team.filter(mon=>mon.ability==='Drizzle').map(mon=>mon.species),
        drought:team.filter(mon=>mon.ability==='Drought').map(mon=>mon.species),
        weatherConflict:false,
        rainSetters,
        rainDedicatedPayoffs,
        rainExternalPayoffs:rainDedicatedPayoffs.filter(name=>!rainSetters.includes(name)),
        rainSpeedAbusers:team.filter(mon=>mon.ability==='Swift Swim').map(mon=>mon.species),
        waterAttackers:team.filter(mon=>(mon.offensiveTypes||[]).includes('Water')).map(mon=>mon.species),
        sunSetters,
        sunDedicatedPayoffs,
        sunExternalPayoffs:sunDedicatedPayoffs.filter(name=>!sunSetters.includes(name)),
        waterAttackersSun:team.filter(mon=>(mon.offensiveTypes||[]).includes('Water')).map(mon=>mon.species),
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
          {name:'Balance',score:73,evidence:['base read']},
        ],
      };
    },
    evaluateSynergy(){
      return {
        scores:{winReliability:81,roleCompression:76},
        issues:[],
      };
    },
  };
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/weather-turn-economy-upgrades.js','utf8'),ctx,{filename:'weather-turn-economy-upgrades.js'});
  return ctx;
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=makeContext();

const passiveSingleRainTeam=[
  mon('Jirachi',{moves:['Rain Dance','Wish','Stealth Rock','Iron Head'],types:['Steel','Psychic'],offensiveTypes:['Steel'],baseSpeed:100,atk:100,spa:100}),
  mon('Barraskewda',{ability:'Swift Swim',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Weather Ball','Roost','Heat Wave'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal','Fire'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunder','Draco Meteor','Calm Mind','Thunderclap'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
];

const clunkyManualRainTeam=[
  mon('Jirachi',{moves:['Rain Dance','Wish','Stealth Rock','Iron Head'],types:['Steel','Psychic'],offensiveTypes:['Steel'],baseSpeed:100,atk:100,spa:100}),
  mon('Bronzong',{moves:['Rain Dance','Body Press','Earthquake','Explosion'],types:['Steel','Psychic'],offensiveTypes:['Fighting','Ground'],baseSpeed:33,atk:89,spa:79}),
  mon('Barraskewda',{ability:'Swift Swim',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Weather Ball','Roost','Heat Wave'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal','Fire'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const passiveSingleSunTeam=[
  mon('Cresselia',{moves:['Sunny Day','Moonlight','Lunar Dance','Ice Beam'],types:['Psychic'],offensiveTypes:['Ice'],baseSpeed:85,atk:70,spa:75}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Sludge Bomb','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Poison'],baseSpeed:80,atk:82,spa:100}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
];

const clunkyManualSunTeam=[
  mon('Cresselia',{moves:['Sunny Day','Moonlight','Lunar Dance','Ice Beam'],types:['Psychic'],offensiveTypes:['Ice'],baseSpeed:85,atk:70,spa:75}),
  mon('Charizard',{moves:['Sunny Day','Weather Ball','Solar Beam','Roost'],types:['Fire','Flying'],offensiveTypes:['Fire','Flying','Grass','Normal'],baseSpeed:100,atk:84,spa:109}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Sludge Bomb','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Poison'],baseSpeed:80,atk:82,spa:100}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
];

const cleanSingleRainTeam=[
  mon('Tornadus-Therian',{moves:['Rain Dance','Hurricane','U-turn','Knock Off'],types:['Flying'],offensiveTypes:['Flying','Dark'],baseSpeed:121,atk:100,spa:110}),
  mon('Barraskewda',{ability:'Swift Swim',moves:['Waterfall','Close Combat','Flip Turn','Aqua Jet'],types:['Water'],offensiveTypes:['Water','Fighting'],baseSpeed:136,atk:123,spa:60}),
  mon('Zapdos',{moves:['Thunder','Weather Ball','Roost','Volt Switch'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Normal'],baseSpeed:100,atk:90,spa:125}),
  mon('Archaludon',{moves:['Draco Meteor','Thunder','Flash Cannon','Body Press'],types:['Steel','Dragon'],offensiveTypes:['Dragon','Electric','Steel','Fighting'],baseSpeed:85,atk:105,spa:125}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunder','Draco Meteor','Calm Mind','Thunderclap'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
];

const cleanSingleSunTeam=[
  mon('Whimsicott',{moves:['Sunny Day','Encore','Memento','Moonblast'],types:['Grass','Fairy'],offensiveTypes:['Grass','Fairy'],baseSpeed:116,atk:77,spa:77}),
  mon('Venusaur',{ability:'Chlorophyll',moves:['Growth','Giga Drain','Weather Ball','Sleep Powder'],types:['Grass','Poison'],offensiveTypes:['Grass','Normal'],baseSpeed:80,atk:82,spa:100}),
  mon('Walking Wake',{ability:'Protosynthesis',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,spa:125}),
  mon('Gouging Fire',{ability:'Protosynthesis',moves:['Flare Blitz','Dragon Dance','Morning Sun','Earthquake'],types:['Fire','Dragon'],offensiveTypes:['Fire','Dragon','Ground'],baseSpeed:91,atk:115,spa:65}),
  mon('Great Tusk',{moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,spa:53}),
  mon('Raging Bolt',{moves:['Thunderclap','Draco Meteor','Thunderbolt','Calm Mind'],types:['Electric','Dragon'],offensiveTypes:['Electric','Dragon'],baseSpeed:75,atk:73,spa:137}),
];

const clunkyRainProfile=ctx.profileTeam(clunkyManualRainTeam,{});
assert(clunkyRainProfile.rainSetters.length===2,'clunky rain team should have two manual setters');
assert(clunkyRainProfile.rainHandoffSetters.length===0,'clunky rain team should have no handoff setter');
const clunkyRainIdentity=ctx.detectIdentities(clunkyManualRainTeam,{},clunkyRainProfile);
assert(clunkyRainIdentity.primary.name!=='Rain Offense','clunky manual rain should stay downgraded');
assert(clunkyRainIdentity.all.find(row=>row.name==='Rain Offense').evidence.some(line=>/cannot hand weather turns cleanly/i.test(line)),'clunky manual rain should keep the existing handoff evidence');

const passiveRainProfile=ctx.profileTeam(passiveSingleRainTeam,{});
assert(passiveRainProfile.rainSetters.length===1,'passive rain team should have one manual setter');
assert(passiveRainProfile.rainExternalPayoffs.length>=3,'passive rain team should have multiple outside payoffs');
assert(passiveRainProfile.rainHandoffSetters.length===0,'passive rain team should have no handoff setter');
const passiveRainIdentity=ctx.detectIdentities(passiveSingleRainTeam,{},passiveRainProfile);
const passiveRainRow=passiveRainIdentity.all.find(row=>row.name==='Rain Offense');
assert(passiveRainIdentity.primary.name!=='Rain Offense','passive single-setter rain should not keep Rain Offense as the primary read');
assert(passiveRainRow.score<passiveRainIdentity.all.find(row=>row.name==='Balance').score,'passive single-setter rain should fall below the balance read');
assert(passiveRainRow.evidence.some(line=>/lone manual rain setter/i.test(line)),'passive single-setter rain should explain the lone-setter handoff problem');
const passiveRainSynergy=ctx.evaluateSynergy(passiveSingleRainTeam,{},passiveRainProfile,passiveRainIdentity);
assert(passiveRainSynergy.scores.winReliability<81,'passive single-setter rain should lose win reliability');
assert(passiveRainSynergy.issues.some(issue=>issue.title==='Single rain setter cannot hand turns off cleanly'),'passive single-setter rain should surface a dedicated synergy issue');

const passiveSunProfile=ctx.profileTeam(passiveSingleSunTeam,{});
assert(passiveSunProfile.sunSetters.length===1,'passive sun team should have one manual setter');
assert(passiveSunProfile.sunExternalPayoffs.length>=3,'passive sun team should have multiple outside payoffs');
assert(passiveSunProfile.sunHandoffSetters.length===0,'passive sun team should have no handoff setter');
const passiveSunIdentity=ctx.detectIdentities(passiveSingleSunTeam,{},passiveSunProfile);
const passiveSunRow=passiveSunIdentity.all.find(row=>row.name==='Sun Offense');
assert(passiveSunIdentity.primary.name!=='Sun Offense','passive single-setter sun should not keep Sun Offense as the primary read');
assert(passiveSunRow.score<passiveSunIdentity.all.find(row=>row.name==='Balance').score,'passive single-setter sun should fall below the balance read');
assert(passiveSunRow.evidence.some(line=>/lone manual sun setter/i.test(line)),'passive single-setter sun should explain the lone-setter handoff problem');
const passiveSunSynergy=ctx.evaluateSynergy(passiveSingleSunTeam,{},passiveSunProfile,passiveSunIdentity);
assert(passiveSunSynergy.scores.winReliability<81,'passive single-setter sun should lose win reliability');
assert(passiveSunSynergy.issues.some(issue=>issue.title==='Single sun setter cannot hand turns off cleanly'),'passive single-setter sun should surface a dedicated synergy issue');

const cleanRainProfile=ctx.profileTeam(cleanSingleRainTeam,{});
assert(cleanRainProfile.rainHandoffSetters.length===1,'clean single rain team should have one handoff setter');
const cleanRainIdentity=ctx.detectIdentities(cleanSingleRainTeam,{},cleanRainProfile);
assert(cleanRainIdentity.all.find(row=>row.name==='Rain Offense').score===86,'clean single-setter rain should keep its base rain confidence');
const cleanRainSynergy=ctx.evaluateSynergy(cleanSingleRainTeam,{},cleanRainProfile,cleanRainIdentity);
assert(!cleanRainSynergy.issues.some(issue=>issue.title==='Single rain setter cannot hand turns off cleanly'),'clean single-setter rain should avoid the lone-setter issue');

const cleanSunProfile=ctx.profileTeam(cleanSingleSunTeam,{});
assert(cleanSunProfile.sunHandoffSetters.length===1,'clean single sun team should have one handoff setter');
const cleanSunIdentity=ctx.detectIdentities(cleanSingleSunTeam,{},cleanSunProfile);
assert(cleanSunIdentity.all.find(row=>row.name==='Sun Offense').score===84,'clean single-setter sun should keep its base sun confidence');
const cleanSunSynergy=ctx.evaluateSynergy(cleanSingleSunTeam,{},cleanSunProfile,cleanSunIdentity);
assert(!cleanSunSynergy.issues.some(issue=>issue.title==='Single sun setter cannot hand turns off cleanly'),'clean single-setter sun should avoid the lone-setter issue');

const clunkySunProfile=ctx.profileTeam(clunkyManualSunTeam,{});
assert(clunkySunProfile.sunSetters.length===2,'clunky sun team should have two manual setters');
assert(clunkySunProfile.sunHandoffSetters.length===0,'clunky sun team should have no handoff setter');
const clunkySunIdentity=ctx.detectIdentities(clunkyManualSunTeam,{},clunkySunProfile);
assert(clunkySunIdentity.primary.name!=='Sun Offense','clunky manual sun should stay downgraded');
assert(clunkySunIdentity.all.find(row=>row.name==='Sun Offense').evidence.some(line=>/cannot hand weather turns cleanly/i.test(line)),'clunky manual sun should keep the existing handoff evidence');

console.log('[OK] single-setter weather turn-economy regression passed');