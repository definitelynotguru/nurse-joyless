const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const rows=[
    {name:'Bulky Offense',score:88,evidence:['base read']},
    {name:'Balance',score:82,evidence:['base read']},
    {name:'Stall',score:74,evidence:['base read']},
    {name:'Hyper Offense',score:62,evidence:['base read']},
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

const falseBulkyTeam=[
  mon('Alomomola',{moves:['Wish','Protect','Flip Turn','Scald'],types:['Water'],offensiveTypes:['Water'],baseSpeed:65,atk:75,def:80,spa:40,spd:45,isDefensiveAnchor:true}),
  mon('Blissey',{moves:['Soft-Boiled','Seismic Toss','Thunder Wave','Teleport'],types:['Normal'],offensiveTypes:['Normal'],baseSpeed:55,atk:10,def:10,spa:75,spd:135,isDefensiveAnchor:true}),
  mon('Corviknight',{moves:['Roost','U-turn','Defog','Body Press'],types:['Flying','Steel'],offensiveTypes:['Fighting'],baseSpeed:67,atk:87,def:105,spa:53,spd:85,isDefensiveAnchor:true}),
  mon('Garganacl',{moves:['Salt Cure','Recover','Protect','Stealth Rock'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,def:130,spa:45,spd:90,isDefensiveAnchor:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,def:120,spa:60,spd:85}),
  mon('Toxapex',{moves:['Recover','Surf','Haze','Toxic'],types:['Water','Poison'],offensiveTypes:['Water'],baseSpeed:35,atk:63,def:152,spa:53,spd:142,isDefensiveAnchor:true}),
];

const falseBulkyProfile=ctx.profileTeam(falseBulkyTeam,{});
assert(falseBulkyProfile.defensiveAnchors.length>=4,'expected the false bulky-offense shell to have a large glue core');
assert(falseBulkyProfile.recoveryAnchors.length>=3,'expected the false bulky-offense shell to have several recovery anchors');
assert(falseBulkyProfile.bulkyOffenseClosers.length===1,'expected the false bulky-offense shell to have only one real closer');
assert(falseBulkyProfile.pivot.length>=2,'expected the false bulky-offense shell to lean on pivots');
const falseBulkyIdentity=ctx.detectIdentities(falseBulkyTeam,{},falseBulkyProfile);
const falseBulkyRow=falseBulkyIdentity.all.find(row=>row.name==='Bulky Offense');
assert(falseBulkyIdentity.primary.name==='Balance','passive glue shell should fall back to Balance');
assert(falseBulkyRow&&falseBulkyRow.score<falseBulkyIdentity.all.find(row=>row.name==='Balance').score,'false bulky-offense score should fall below the balance read');
assert(falseBulkyRow.evidence.some(line=>/only one real closer/.test(line)),'false bulky-offense shell should explain the token-closer problem');
const falseBulkySynergy=ctx.evaluateSynergy(falseBulkyTeam,{},falseBulkyProfile,falseBulkyIdentity);
assert(falseBulkySynergy.scores.winReliability<81,'false bulky-offense shell should lose some reliability');
assert(falseBulkySynergy.scores.offensiveCoverage<78,'false bulky-offense shell should lose offensive-coverage score');
assert(falseBulkySynergy.scores.roleCompression<76,'false bulky-offense shell should lose role-compression score');
assert(falseBulkySynergy.issues.some(issue=>issue.title==='Bulky offense read overstates a balance shell'),'false bulky-offense shell should surface the overstatement issue');

const realBulkyTeam=[
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Volt Switch','Roost','Heat Wave','Discharge'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Fire'],baseSpeed:100,atk:90,def:85,spa:125,spd:90,isDefensiveAnchor:true}),
  mon('Great Tusk',{item:'Leftovers',moves:['Rapid Spin','Headlong Rush','Knock Off','Close Combat'],types:['Ground','Fighting'],offensiveTypes:['Ground','Dark','Fighting'],baseSpeed:87,atk:131,def:131,spa:53,spd:53,isDefensiveAnchor:true}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,def:120,spa:60,spd:85}),
  mon('Dragonite',{item:'Heavy-Duty Boots',moves:['Dragon Dance','Dragon Claw','Earthquake','Fire Punch'],types:['Dragon','Flying'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:80,atk:134,def:95,spa:100,spd:100}),
  mon('Gholdengo',{item:'Life Orb',moves:['Shadow Ball','Make It Rain','Recover','Nasty Plot'],types:['Steel','Ghost'],offensiveTypes:['Steel','Ghost'],baseSpeed:84,atk:60,def:95,spa:133,spd:91}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],types:['Fairy','Fighting'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,def:90,spa:120,spd:60}),
];

const realBulkyProfile=ctx.profileTeam(realBulkyTeam,{});
assert(realBulkyProfile.bulkyOffenseClosers.length>=4,'expected the real bulky-offense shell to keep multiple closers');
assert(realBulkyProfile.recoveryAnchors.length<=2,'expected the real bulky-offense shell to avoid a passive recovery glut');
const realBulkyIdentity=ctx.detectIdentities(realBulkyTeam,{},realBulkyProfile);
const realBulkyRow=realBulkyIdentity.all.find(row=>row.name==='Bulky Offense');
assert(realBulkyIdentity.primary.name==='Bulky Offense','real bulky offense shell should keep Bulky Offense as the primary read');
assert(realBulkyRow&&realBulkyRow.score===88,'real bulky offense shell should preserve the base bulky-offense confidence');
const realBulkySynergy=ctx.evaluateSynergy(realBulkyTeam,{},realBulkyProfile,realBulkyIdentity);
assert(!realBulkySynergy.issues.some(issue=>issue.title==='Bulky offense read overstates a balance shell'),'real bulky offense shell should not get the balance-shell warning');

console.log('[OK] bulky offense identity upgrades passed');