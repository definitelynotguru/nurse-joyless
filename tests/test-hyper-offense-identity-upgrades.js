const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const rows=[
    {name:'Hyper Offense',score:88,evidence:['base read']},
    {name:'Bulky Offense',score:82,evidence:['base read']},
    {name:'Balance',score:74,evidence:['base read']},
    {name:'Stall',score:58,evidence:['base read']},
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

const falseHyperTeam=[
  mon('Zapdos',{item:'Heavy-Duty Boots',moves:['Thunderbolt','Volt Switch','Roost','Heat Wave'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying','Fire'],baseSpeed:100,atk:90,def:85,spa:125,spd:90,isDefensiveAnchor:true}),
  mon('Gliscor',{item:'Toxic Orb',moves:['Earthquake','U-turn','Roost','Spikes'],types:['Ground','Flying'],offensiveTypes:['Ground'],baseSpeed:95,atk:95,def:125,spa:45,spd:75,isDefensiveAnchor:true}),
  mon('Gholdengo',{item:'Air Balloon',moves:['Shadow Ball','Make It Rain','Recover','Nasty Plot'],types:['Steel','Ghost'],offensiveTypes:['Steel','Ghost'],baseSpeed:84,atk:60,def:95,spa:133,spd:91}),
  mon('Kingambit',{item:'Black Glasses',moves:['Kowtow Cleave','Sucker Punch','Iron Head','Swords Dance'],types:['Dark','Steel'],offensiveTypes:['Dark','Steel'],baseSpeed:50,atk:135,def:120,spa:60,spd:85}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],types:['Fairy','Fighting'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,def:90,spa:120,spd:60}),
  mon('Dragapult',{item:'Choice Band',moves:['Dragon Darts','Phantom Force','U-turn','Sucker Punch'],types:['Dragon','Ghost'],offensiveTypes:['Dragon','Ghost','Dark'],baseSpeed:142,atk:120,def:75,spa:100,spd:75}),
];

const falseHyperProfile=ctx.profileTeam(falseHyperTeam,{});
assert(falseHyperProfile.fastAttackers.length>=3,'expected the false hyper shell to keep multiple fast attackers');
assert(falseHyperProfile.setupAttackers.length>=2,'expected the false hyper shell to keep multiple setup attackers');
assert(falseHyperProfile.recoveryAnchors.length>=2,'expected the false hyper shell to keep multiple recovery anchors');
assert(falseHyperProfile.pivot.length>=2,'expected the false hyper shell to keep multiple pivots');
const falseHyperIdentity=ctx.detectIdentities(falseHyperTeam,{},falseHyperProfile);
const falseHyperRow=falseHyperIdentity.all.find(row=>row.name==='Hyper Offense');
assert(falseHyperIdentity.primary.name!=='Hyper Offense','bulky-tempo shell should not keep Hyper Offense as the primary read');
assert(falseHyperIdentity.primary.name==='Bulky Offense','bulky-tempo shell should fall back to Bulky Offense');
assert(falseHyperRow&&falseHyperRow.score<falseHyperIdentity.all.find(row=>row.name==='Bulky Offense').score,'false hyper offense score should fall below the bulky-offense read');
assert(falseHyperRow.evidence.some(line=>/bulky recovery pivots/.test(line)),'false hyper shell should explain the bulky recovery pivot problem');
const falseHyperSynergy=ctx.evaluateSynergy(falseHyperTeam,{},falseHyperProfile,falseHyperIdentity);
assert(falseHyperSynergy.scores.winReliability<81,'false hyper shell should lose some reliability');
assert(falseHyperSynergy.scores.roleCompression<76,'false hyper shell should lose some role-compression score');
assert(falseHyperSynergy.issues.some(issue=>issue.title==='Hyper offense read overstates a bulky tempo shell'),'false hyper shell should surface the hyper-offense overstatement issue');

const realHyperTeam=[
  mon('Grimmsnarl',{item:'Light Clay',moves:['Reflect','Light Screen','Spirit Break','Parting Shot'],types:['Dark','Fairy'],offensiveTypes:['Dark','Fairy'],baseSpeed:60,atk:120,def:65,spa:95,spd:75}),
  mon('Dragonite',{item:'Lum Berry',moves:['Dragon Dance','Earthquake','Extreme Speed','Fire Punch'],types:['Dragon','Flying'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:80,atk:134,def:95,spa:100,spd:100}),
  mon('Garchomp',{item:'Life Orb',moves:['Swords Dance','Earthquake','Scale Shot','Fire Fang'],types:['Dragon','Ground'],offensiveTypes:['Dragon','Ground','Fire'],baseSpeed:102,atk:130,def:95,spa:80,spd:85}),
  mon('Iron Valiant',{item:'Booster Energy',moves:['Moonblast','Close Combat','Knock Off','Encore'],types:['Fairy','Fighting'],offensiveTypes:['Fairy','Fighting','Dark'],baseSpeed:116,atk:130,def:90,spa:120,spd:60}),
  mon('Gholdengo',{item:'Life Orb',moves:['Shadow Ball','Make It Rain','Focus Blast','Nasty Plot'],types:['Steel','Ghost'],offensiveTypes:['Steel','Ghost','Fighting'],baseSpeed:84,atk:60,def:95,spa:133,spd:91}),
  mon('Dragapult',{item:'Choice Specs',moves:['Draco Meteor','Shadow Ball','Flamethrower','U-turn'],types:['Dragon','Ghost'],offensiveTypes:['Dragon','Ghost','Fire'],baseSpeed:142,atk:120,def:75,spa:100,spd:75}),
];

const realHyperProfile=ctx.profileTeam(realHyperTeam,{});
assert(realHyperProfile.fastAttackers.length>=3,'expected the real hyper shell to stay fast');
assert(realHyperProfile.setupAttackers.length>=2,'expected the real hyper shell to keep multiple setup attackers');
assert(realHyperProfile.recoveryAnchors.length===0,'expected the real hyper shell to avoid recovery anchors');
const realHyperIdentity=ctx.detectIdentities(realHyperTeam,{},realHyperProfile);
const realHyperRow=realHyperIdentity.all.find(row=>row.name==='Hyper Offense');
assert(realHyperIdentity.primary.name==='Hyper Offense','real Hyper Offense shell should keep Hyper Offense as the primary read');
assert(realHyperRow&&realHyperRow.score===88,'real Hyper Offense shell should preserve the base hyper-offense confidence');
const realHyperSynergy=ctx.evaluateSynergy(realHyperTeam,{},realHyperProfile,realHyperIdentity);
assert(!realHyperSynergy.issues.some(issue=>issue.title==='Hyper offense read overstates a bulky tempo shell'),'real Hyper Offense shell should not get the bulky-tempo warning');

console.log('[OK] hyper offense identity upgrades passed');
