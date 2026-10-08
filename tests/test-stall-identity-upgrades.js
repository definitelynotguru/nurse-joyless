const fs=require('fs');
const vm=require('vm');

function clampScore(value, cap){
  const numeric=Number.isFinite(value)?value:0;
  return Math.max(0,Math.min(cap,numeric));
}

function makeContext(){
  const rows=[
    {name:'Stall',score:90,evidence:['base read']},
    {name:'Balance',score:82,evidence:['base read']},
    {name:'Bulky Offense',score:76,evidence:['base read']},
    {name:'Hyper Offense',score:60,evidence:['base read']},
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

const fakeStallTeam=[
  mon('Dondozo',{moves:['Rest','Sleep Talk','Waterfall','Curse'],types:['Water'],offensiveTypes:['Water'],baseSpeed:35,atk:100,def:115,spa:65,spd:65,isDefensiveAnchor:true}),
  mon('Garganacl',{moves:['Salt Cure','Recover','Protect','Stealth Rock'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,def:130,spa:45,spd:90,isDefensiveAnchor:true}),
  mon('Zapdos',{moves:['Volt Switch','Thunder Wave','Roost','Hurricane'],types:['Electric','Flying'],offensiveTypes:['Electric','Flying'],baseSpeed:100,atk:90,def:85,spa:125,spd:90}),
  mon('Walking Wake',{item:'Choice Specs',moves:['Hydro Steam','Draco Meteor','Flamethrower','Flip Turn'],types:['Water','Dragon'],offensiveTypes:['Water','Dragon','Fire'],baseSpeed:109,atk:83,def:91,spa:125,spd:83}),
  mon('Landorus-Therian',{item:'Choice Scarf',moves:['Earthquake','U-turn','Stone Edge','Knock Off'],types:['Ground','Flying'],offensiveTypes:['Ground','Dark','Rock'],baseSpeed:91,atk:145,def:90,spa:105,spd:80}),
  mon('Blissey',{moves:['Soft-Boiled','Thunder Wave','Seismic Toss','Teleport'],types:['Normal'],offensiveTypes:['Normal'],baseSpeed:55,atk:10,def:10,spa:75,spd:135,isDefensiveAnchor:true}),
];

const fakeStallProfile=ctx.profileTeam(fakeStallTeam,{});
assert(fakeStallProfile.stallAnchors.length>=3,'expected the false stall shell to have several anchors');
assert(fakeStallProfile.stallClosers.length>=2,'expected the false stall shell to still lean on multiple proactive closers');
const fakeStallIdentity=ctx.detectIdentities(fakeStallTeam,{},fakeStallProfile);
const fakeStallRow=fakeStallIdentity.all.find(row=>row.name==='Stall');
assert(fakeStallIdentity.primary.name!=='Stall','bulky balance shell should not keep Stall as the primary read');
assert(fakeStallRow&&fakeStallRow.score<fakeStallIdentity.all.find(row=>row.name==='Balance').score,'false stall score should fall below the balance fallback');
assert(fakeStallRow.evidence.some(line=>/too many proactive closers/.test(line)),'false stall shell should explain why it is not true stall');
const fakeStallSynergy=ctx.evaluateSynergy(fakeStallTeam,{},fakeStallProfile,fakeStallIdentity);
assert(fakeStallSynergy.scores.winReliability<81,'false stall shell should lose some reliability');
assert(fakeStallSynergy.issues.some(issue=>issue.title==='Stall read overstates a balance shell'),'false stall shell should surface the stall-overstatement issue');

const trueStallTeam=[
  mon('Dondozo',{moves:['Rest','Sleep Talk','Waterfall','Curse'],types:['Water'],offensiveTypes:['Water'],baseSpeed:35,atk:100,def:115,spa:65,spd:65,isDefensiveAnchor:true}),
  mon('Garganacl',{moves:['Salt Cure','Recover','Protect','Stealth Rock'],types:['Rock'],offensiveTypes:['Rock'],baseSpeed:35,atk:100,def:130,spa:45,spd:90,isDefensiveAnchor:true}),
  mon('Alomomola',{moves:['Wish','Protect','Flip Turn','Scald'],types:['Water'],offensiveTypes:['Water'],baseSpeed:65,atk:75,def:80,spa:40,spd:45,isDefensiveAnchor:true}),
  mon('Blissey',{moves:['Soft-Boiled','Thunder Wave','Seismic Toss','Teleport'],types:['Normal'],offensiveTypes:['Normal'],baseSpeed:55,atk:10,def:10,spa:75,spd:135,isDefensiveAnchor:true}),
  mon('Toxapex',{moves:['Recover','Toxic','Haze','Surf'],types:['Water','Poison'],offensiveTypes:['Water'],baseSpeed:35,atk:63,def:152,spa:53,spd:142,isDefensiveAnchor:true}),
  mon('Corviknight',{moves:['Roost','Defog','U-turn','Body Press'],types:['Flying','Steel'],offensiveTypes:['Fighting'],baseSpeed:67,atk:87,def:105,spa:53,spd:85,isDefensiveAnchor:true}),
];

const trueStallProfile=ctx.profileTeam(trueStallTeam,{});
assert(trueStallProfile.stallAnchors.length>=5,'expected the real stall shell to have dense anchor coverage');
assert(trueStallProfile.stallClosers.length===0,'expected the real stall shell to avoid proactive closers');
const trueStallIdentity=ctx.detectIdentities(trueStallTeam,{},trueStallProfile);
const trueStallRow=trueStallIdentity.all.find(row=>row.name==='Stall');
assert(trueStallIdentity.primary.name==='Stall','true stall shell should keep Stall as the primary read');
assert(trueStallRow&&trueStallRow.score===90,'true stall shell should preserve the base stall confidence');
const trueStallSynergy=ctx.evaluateSynergy(trueStallTeam,{},trueStallProfile,trueStallIdentity);
assert(!trueStallSynergy.issues.some(issue=>issue.title==='Stall read overstates a balance shell'),'true stall shell should not get the false stall issue');

console.log('[OK] stall identity upgrades passed');