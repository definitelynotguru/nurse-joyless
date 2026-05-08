(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const DexRef=typeof DexAdapter!=='undefined'?DexAdapter:(root.DexAdapter||host.DexAdapter);
  const legacyNormalizeBattleState=root.normalizeBattleState||host.normalizeBattleState;
  const legacySwapBattleState=root.swapBattleState||host.swapBattleState;
  const legacyBattleStateSummary=root.battleStateSummary||host.battleStateSummary;
  const legacyReadKoBattleState=root.readKoBattleState||host.readKoBattleState;
  const legacyDmg=root.dmg||host.dmg;
  const doc=root.document||host.document||(typeof document!=='undefined'?document:null);
  const byId=id=>doc?.getElementById?.(id);
  const hitChance=()=>typeof root.nHitChance==='function'?root.nHitChance:(typeof host.nHitChance==='function'?host.nHitChance:null);

  const KNOWN_SPREAD_MOVES=new Set([
    'Blizzard',
    'Bleakwind Storm',
    'Breaking Swipe',
    'Bulldoze',
    'Dazzling Gleam',
    'Discharge',
    'Earthquake',
    'Eerie Spell',
    'Electroweb',
    'Expanding Force',
    'Heat Wave',
    'Hyper Voice',
    'Icy Wind',
    'Lava Plume',
    'Make It Rain',
    'Magnitude',
    'Muddy Water',
    'Petal Blizzard',
    'Razor Leaf',
    'Rock Slide',
    'Snarl',
    'Struggle Bug',
    'Surf',
    'Twister'
  ]);
  const MULTI_TARGET_VALUES=new Set(['alladjacent','alladjacentfoes','all']);

  function resolveMoveName(move=''){
    return DexRef?.resolveMoveName?DexRef.resolveMoveName(move):String(move||'').trim();
  }
  function normalizeTargetValue(target=''){
    return String(target||'').trim().toLowerCase();
  }
  function moveHitsMultipleTargets(move=''){
    const name=resolveMoveName(move);
    if(!name)return false;
    const dexMove=DexRef?.getMove?.(name);
    if(MULTI_TARGET_VALUES.has(normalizeTargetValue(dexMove?.target)))return true;
    return KNOWN_SPREAD_MOVES.has(name);
  }
  function scalePositiveDamage(value){
    const n=Number(value)||0;
    if(n<=0)return 0;
    return Math.max(1,Math.floor(n*0.75));
  }
  function recomputeKoOdds(roll){
    const next={...roll};
    const rolls=Array.isArray(next.rolls)?next.rolls:[];
    const ehp=Math.max(1,Number(next.ehp)||1);
    const hit=Number(next.hit)||1;
    next.min=rolls.length?Math.min(...rolls):0;
    next.maxd=rolls.length?Math.max(...rolls):0;
    next.minp=next.max?next.min/next.max*100:0;
    next.maxp=next.max?next.maxd/next.max*100:0;
    next.ko=rolls.filter(value=>value>=ehp).length/16*hit;
    const chanceFn=hitChance();
    if(chanceFn){
      next.two=chanceFn(next,2);
      next.three=chanceFn(next,3);
    }
    return next;
  }
  function applySpreadPenalty(roll, move=''){
    if(!roll?.battleState?.spreadDamage)return roll;
    if(roll.blockedBy||roll.eff===0)return roll;
    if(!moveHitsMultipleTargets(move))return roll;
    const category=String(roll.move?.[1]||'');
    if(category==='Status')return roll;
    const scaledRolls=(roll.rolls||[]).map(scalePositiveDamage);
    return recomputeKoOdds({
      ...roll,
      rolls:scaledRolls,
      spreadAdjusted:true,
      spreadModifier:0.75
    });
  }

  root.spreadDamageApplies=moveHitsMultipleTargets;
  if(host!==root)host.spreadDamageApplies=moveHitsMultipleTargets;

  root.normalizeBattleState=function patchedNormalizeBattleState(opt={}){
    const battle=legacyNormalizeBattleState?legacyNormalizeBattleState(opt):{...opt};
    return {
      ...battle,
      spreadDamage:!!opt.spreadDamage
    };
  };
  if(host!==root)host.normalizeBattleState=root.normalizeBattleState;

  root.swapBattleState=function patchedSwapBattleState(state={}){
    const battle=legacySwapBattleState?legacySwapBattleState(state):{...state};
    return {
      ...battle,
      spreadDamage:false
    };
  };
  if(host!==root)host.swapBattleState=root.swapBattleState;

  root.battleStateSummary=function patchedBattleStateSummary(state={}){
    const summary=legacyBattleStateSummary?legacyBattleStateSummary(state):'Neutral';
    const battle=root.normalizeBattleState(state);
    if(!battle.spreadDamage)return summary;
    return summary==='Neutral'?'Spread hit penalty':`${summary} • Spread hit penalty`;
  };
  if(host!==root)host.battleStateSummary=root.battleStateSummary;

  root.readKoBattleState=function patchedReadKoBattleState(){
    const battle=legacyReadKoBattleState?legacyReadKoBattleState():root.normalizeBattleState({});
    return {
      ...battle,
      spreadDamage:!!byId('spreadDamage')?.checked
    };
  };
  if(host!==root)host.readKoBattleState=root.readKoBattleState;

  root.dmg=function patchedDmg(att, def, mv, opt={}){
    const roll=legacyDmg(att,def,mv,opt);
    const battle=root.normalizeBattleState({...roll?.battleState,...opt});
    return applySpreadPenalty({...roll,battleState:battle},mv);
  };
  if(host!==root)host.dmg=root.dmg;
})();