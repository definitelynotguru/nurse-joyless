const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const rows=[
    {name:'Balance',score:84,evidence:['base read']},
    {name:'Stall',score:78,evidence:['base read']},
    {name:'Bulky Offense',score:70,evidence:['base read']},
    {name:'Hyper Offense',score:58,evidence:['base read']},
  ];
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
      const cloned=rows.map(row=>({...row,evidence:[...(row.evidence||[])]}));
      return {
        primary:cloned[0],
        secondary:cloned.slice(1,4),
        all:cloned,
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
  vm.runInContext(fs.readFileSync('src/balance-identity-upgrades.js','utf8'),ctx,{filename:'balance-identity-upgrades.js'});
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
  def=95,
  spa=95,
  spd=95,
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
    baseStats:{spe:baseSpeed,atk,def,spa,spd},
    isDefensiveAnchor,
    isRemovalDenial,
  };
}

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const ctx=makeContext();

const falseBalanceTeam=[
  mon('Alomomola',{moves:['Wish','Protect','Flip Turn','Scald'],types:['Water'],offensiveTypes:['Water'],baseSpeed:65,atk:75,def:80,spa:40,spd:45,isDefensiveAnchor:true}),
  mon('Blissey',{moves:['Soft-Boiled','Seismic Toss','Thunder Wave','Flamethrower'],types:['Normal'],offensiveTypes:['Normal','Fire'],baseSpeed:55,atk:10,def:10,spa:75,spd:135,isDefensiveAnchor:true}),
  mon('Corviknight',{moves:['Roost','U-turn','Defog','Body Press'],types:['Flying','Steel'],offensiveTypes:['Fighting'],baseSpeed:67,atk:87,def:105,spa:53,spd:85,isDefensiveAnchor:true}),
  mon('Garganacl',{moves:['Salt Cure','Recover','Protect','Stealth Rock'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,def:130,spa:45,spd:90,isDefensiveAnchor:true}),
  mon('Toxapex',{moves:['Recover','Surf','Haze','Toxic'],types:['Water','Poison'],offensiveTypes:['Water'],baseSpeed:35,atk:63,def:152,spa:53,spd:142,isDefensiveAnchor:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,def:120,spa:60,spd:85}),
];

const falseBalanceProfile=ctx.profileTeam(falseBalanceTeam,{});
assert(falseBalanceProfile.stallAnchors.length>=4,'expected the semistall shell to have several stall anchors');
assert(falseBalanceProfile.stallProgressPieces.length>=4,'expected the semistall shell to rely on attrition progress');
assert(falseBalanceProfile.recoveryAnchors.length>=4,'expected the semistall shell to have a recovery glut');
assert(falseBalanceProfile.bulkyOffenseClosers.length===1,'expected the semistall shell to have only one real closer');
const falseBalanceIdentity=ctx.detectIdentities(falseBalanceTeam,{},falseBalanceProfile);
const falseBalanceRow=falseBalanceIdentity.all.find(row=>row.name==='Balance');
const stallRow=falseBalanceIdentity.all.find(row=>row.name==='Stall');
assert(falseBalanceIdentity.primary.name==='Stall','semistall shell should fall back to Stall instead of keeping Balance');
assert(falseBalanceRow&&stallRow&&falseBalanceRow.score<stallRow.score,'false balance score should fall below the stall read');
assert(falseBalanceRow.evidence.some(line=>/only one real closer/.test(line)),'false balance shell should explain the token-closer problem');
const falseBalanceSynergy=ctx.evaluateSynergy(falseBalanceTeam,{},falseBalanceProfile,falseBalanceIdentity);
assert(falseBalanceSynergy.scores.winReliability<81,'false balance shell should lose some reliability');
assert(falseBalanceSynergy.scores.offensiveCoverage<78,'false balance shell should lose offensive coverage');
assert(falseBalanceSynergy.scores.roleCompression<76,'false balance shell should lose role compression');
assert(falseBalanceSynergy.issues.some(issue=>issue.title==='Balance read overstates a semistall shell'),'false balance shell should surface the semistall warning');

const realBalanceTeam=[
  mon('Deoxys-Speed',{item:'Life Orb',moves:['Nasty Plot','Psycho Boost','Focus Blast','Shadow Ball'],types:['Psychic'],offensiveTypes:['Psychic','Fighting','Ghost'],baseSpeed:180,atk:95,def:90,spa:95,spd:90}),
  mon('Dondozo',{moves:['Waterfall','Curse','Rest','Sleep Talk'],types:['Water'],offensiveTypes:['Water'],baseSpeed:35,atk:100,def:115,spa:65,spd:65,isDefensiveAnchor:true}),
  mon('Landorus-Therian',{item:'Choice Scarf',moves:['Earthquake','Stone Edge','U-turn','Grass Knot'],types:['Ground','Flying'],offensiveTypes:['Ground','Rock','Bug','Grass'],baseSpeed:91,atk:145,def:90,spa:105,spd:80}),
  mon('Zapdos',{moves:['Hurricane','Volt Switch','Thunder Wave','Roost'],types:['Electric','Flying'],offensiveTypes:['Flying','Electric'],baseSpeed:100,atk:90,def:85,spa:125,spd:90,isDefensiveAnchor:true}),
  mon('Walking Wake',{moves:['Surf','Draco Meteor','Knock Off','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Dark'],baseSpeed:109,atk:83,def:91,spa:125,spd:83}),
  mon('Garganacl',{moves:['Stealth Rock','Salt Cure','Recover','Protect'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,def:130,spa:45,spd:90,isDefensiveAnchor:true}),
];

const realBalanceProfile=ctx.profileTeam(realBalanceTeam,{});
assert(realBalanceProfile.bulkyOffenseClosers.length>=3,'expected the active balance shell to keep several ways to force progress');
const realBalanceIdentity=ctx.detectIdentities(realBalanceTeam,{},realBalanceProfile);
const realBalanceRow=realBalanceIdentity.all.find(row=>row.name==='Balance');
assert(realBalanceIdentity.primary.name==='Balance','active balance shell should keep Balance as the primary read');
assert(realBalanceRow&&realBalanceRow.score===84,'active balance shell should preserve its base balance confidence');
const realBalanceSynergy=ctx.evaluateSynergy(realBalanceTeam,{},realBalanceProfile,realBalanceIdentity);
assert(!realBalanceSynergy.issues.some(issue=>issue.title==='Balance read overstates a semistall shell'),'active balance shell should not get the semistall warning');

console.log('[OK] balance identity upgrades passed');
