(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const DexRef=typeof DexAdapter!=='undefined'?DexAdapter:(root.DexAdapter||host.DexAdapter);
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  if(!DexRef)return;

  const EXTRA_SPECIES={
    Farigiraf:{
      name:'Farigiraf',
      types:['Normal','Psychic'],
      baseStats:[120,90,70,110,70,60],
      abilities:{0:'Cud Chew',1:'Armor Tail'}
    },
    Bruxish:{
      name:'Bruxish',
      types:['Water','Psychic'],
      baseStats:[68,105,70,70,70,92],
      abilities:{0:'Dazzling',1:'Strong Jaw',H:'Wonder Skin'}
    },
    Tsareena:{
      name:'Tsareena',
      types:['Grass'],
      baseStats:[72,120,98,50,98,72],
      abilities:{0:'Leaf Guard',1:'Queenly Majesty',H:'Sweet Veil'}
    }
  };
  const PRIORITY_BLOCKING_ABILITIES=new Set(['Armor Tail','Dazzling','Queenly Majesty']);
  const EXTRA_SPECIES_BY_ID=Object.fromEntries(
    Object.entries(EXTRA_SPECIES).map(([name,data])=>[DexRef.id?DexRef.id(name):String(name||'').toLowerCase(),data])
  );

  function moveName(move=''){
    return DexRef.resolveMoveName?DexRef.resolveMoveName(move):String(move||'').trim();
  }
  function movePriorityValue(move=''){
    const name=moveName(move);
    if(typeof movePriority==='function')return movePriority(name);
    return typeof moveMeta==='function'?(moveMeta(name)?.[4]||0):0;
  }
  function addUnique(list=[]){return [...new Set((list||[]).filter(Boolean))]}
  function priorityBlockingAbility(ability='', move=''){
    const name=String(ability||'').trim();
    if(!PRIORITY_BLOCKING_ABILITIES.has(name))return '';
    return movePriorityValue(move)>0?name:'';
  }
  function detectiveAbilityPool(species=''){
    if(typeof detectiveAbilities==='function')return detectiveAbilities(species)||[];
    const data=DexRef.getSpecies?DexRef.getSpecies(species):null;
    return data?.abilities?Object.values(data.abilities).filter(Boolean):[];
  }

  const originalGetSpecies=DexRef.getSpecies.bind(DexRef);
  DexRef.getSpecies=function patchedGetSpecies(name){
    const resolved=this.resolveSpeciesName?this.resolveSpeciesName(name):String(name||'').trim();
    const existing=originalGetSpecies(name);
    if(existing)return existing;
    return EXTRA_SPECIES[resolved]||EXTRA_SPECIES_BY_ID[this.id?this.id(resolved):String(resolved||'').toLowerCase()]||null;
  };

  if(typeof moveBlockingAbility==='function'){
    const originalMoveBlockingAbility=moveBlockingAbility;
    moveBlockingAbility=function patchedMoveBlockingAbility(moveType, category, ability, move=''){
      const blocker=priorityBlockingAbility(ability,move);
      if(blocker)return blocker;
      return originalMoveBlockingAbility(moveType,category,ability,move);
    };
  }

  if(typeof dmg==='function'){
    const originalDmg=dmg;
    dmg=function patchedDmg(att, def, mv, opt={}){
      const roll=originalDmg(att,def,mv,opt);
      const blocker=moveBlockingAbility(roll.moveType,roll.move?.[1],roll.def?.ability,mv);
      if(!blocker)return roll;
      return {
        ...roll,
        blockedBy:blocker,
        eff:0,
        rolls:new Array(16).fill(0),
        min:0,
        maxd:0,
        minp:0,
        maxp:0,
        ko:0,
        two:0,
        three:0
      };
    };
  }

  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  const originalAbilityRewardText=proto.abilityRewardText;
  proto.abilityRewardText=function patchedAbilityRewardText(ability){
    if(PRIORITY_BLOCKING_ABILITIES.has(String(ability||'').trim()))return 'priority immunity against opposing attacks';
    return originalAbilityRewardText.call(this,ability);
  };

  const originalAbilityTriggeredByMove=proto.abilityTriggeredByMove;
  proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability, move=''){
    if(priorityBlockingAbility(ability,move))return true;
    return originalAbilityTriggeredByMove.call(this,ability,move);
  };

  const originalAbilityClueLabel=proto.abilityClueLabel;
  proto.abilityClueLabel=function patchedAbilityClueLabel(ability, move=''){
    if(priorityBlockingAbility(ability,move))return `${ability} blocked ${move}`;
    return originalAbilityClueLabel.call(this,ability,move);
  };

  if(typeof proto.abilityClueLabelWithProof==='function'){
    const originalAbilityClueLabelWithProof=proto.abilityClueLabelWithProof;
    proto.abilityClueLabelWithProof=function patchedAbilityClueLabelWithProof(ability, move='', assumeTriggered=false){
      if(move&&(assumeTriggered||priorityBlockingAbility(ability,move)))return `${ability} blocked ${move}`;
      return originalAbilityClueLabelWithProof.call(this,ability,move,assumeTriggered);
    };
  }

  if(typeof proto.reactiveAbilityProof==='function'){
    const originalReactiveAbilityProof=proto.reactiveAbilityProof;
    proto.reactiveAbilityProof=function patchedReactiveAbilityProof(ability){
      return PRIORITY_BLOCKING_ABILITIES.has(String(ability||'').trim())||originalReactiveAbilityProof.call(this,ability);
    };
  }

  if(typeof proto.moveBlockedAbilities==='function'){
    const originalMoveBlockedAbilities=proto.moveBlockedAbilities;
    proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state, move=''){
      const base=originalMoveBlockedAbilities.call(this,state,move)||[];
      const moveNameValue=String(move||'').trim();
      if(!moveNameValue)return base;
      if(typeof this.abilitySuppressionActive==='function'&&this.abilitySuppressionActive(state))return base;
      if(typeof this.moveAbilityBypass==='function'&&this.moveAbilityBypass(state,moveNameValue))return base;
      const extra=detectiveAbilityPool(state?.species).filter(ability=>priorityBlockingAbility(ability,moveNameValue));
      return addUnique([...base,...extra]);
    };
  }
})();
