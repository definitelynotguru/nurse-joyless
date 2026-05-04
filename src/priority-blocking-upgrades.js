(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const DexRef=typeof DexAdapter!=='undefined'?DexAdapter:(root.DexAdapter||host.DexAdapter);
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  if(!DexRef)return;

  const PRIORITY_BLOCKERS=new Set(['Armor Tail','Dazzling','Queenly Majesty']);
  const EXTRA_SPECIES={
    Farigiraf:{
      name:'Farigiraf',
      types:['Normal','Psychic'],
      baseStats:[120,90,70,110,70,60],
      abilities:{0:'Cud Chew',1:'Armor Tail',H:'Sap Sipper'}
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
  const EXTRA_MOVES={
    'Accelerock':['Rock','Physical',40,100,1],
    'Aqua Jet':['Water','Physical',40,100,1],
    'Bullet Punch':['Steel','Physical',40,100,1],
    'Extreme Speed':['Normal','Physical',80,100,2],
    'Fake Out':['Normal','Physical',40,100,3],
    'First Impression':['Bug','Physical',90,100,2],
    'Ice Shard':['Ice','Physical',40,100,1],
    'Jet Punch':['Water','Physical',60,100,1],
    'Mach Punch':['Fighting','Physical',40,100,1],
    'Shadow Sneak':['Ghost','Physical',40,100,1],
    'Sucker Punch':['Dark','Physical',70,100,1],
    'Thunderclap':['Electric','Special',70,100,1],
    'Vacuum Wave':['Fighting','Special',40,100,1]
  };
  const EXTRA_SPECIES_BY_ID=Object.fromEntries(
    Object.entries(EXTRA_SPECIES).map(([name,data])=>[DexRef.id?DexRef.id(name):String(name||'').toLowerCase(),data])
  );

  function moveName(move=''){
    return DexRef.resolveMoveName?DexRef.resolveMoveName(move):String(move||'').trim();
  }
  function movePriorityValue(move=''){
    if(typeof movePriority==='function'){
      const priority=Number(movePriority(move));
      if(Number.isFinite(priority))return priority;
    }
    if(typeof moveMeta==='function'){
      const meta=moveMeta(move);
      const priority=Number(meta?.[4]);
      if(Number.isFinite(priority))return priority;
    }
    return 0;
  }
  function isPriorityBlockingAbility(ability=''){
    return PRIORITY_BLOCKERS.has(String(ability||'').trim());
  }
  function isBlockedPriorityMove(move=''){
    return movePriorityValue(move)>0;
  }
  function priorityBlockingAbility(ability='', move=''){
    const name=String(ability||'').trim();
    if(!isPriorityBlockingAbility(name))return '';
    return isBlockedPriorityMove(move)?name:'';
  }
  function detectiveAbilityPool(species=''){
    if(typeof detectiveAbilities==='function')return detectiveAbilities(species)||[];
    const data=DexRef.getSpecies?DexRef.getSpecies(species):null;
    return data?.abilities?Object.values(data.abilities).filter(Boolean):[];
  }
  function addUnique(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }
  function priorityBlockedAbilities(species='', move=''){
    if(!isBlockedPriorityMove(move))return [];
    return detectiveAbilityPool(species).filter(ability=>priorityBlockingAbility(ability,move));
  }
  function normalizeAbilityLabel(raw=''){
    return String(raw||'').replace(/^(ability|move): /,'').trim();
  }
  function priorityBlockerClueLabel(ability='', move=''){
    const blocker=priorityBlockingAbility(ability,move);
    if(!blocker||!move)return `${ability} revealed`;
    return `${blocker} blocked ${move}`;
  }

  const originalGetSpecies=DexRef.getSpecies.bind(DexRef);
  DexRef.getSpecies=function patchedGetSpecies(name){
    const resolved=this.resolveSpeciesName?this.resolveSpeciesName(name):String(name||'').trim();
    const existing=originalGetSpecies(name);
    if(existing)return existing;
    return EXTRA_SPECIES[resolved]||EXTRA_SPECIES_BY_ID[this.id?this.id(resolved):String(resolved||'').toLowerCase()]||null;
  };

  const originalGetMove=DexRef.getMove.bind(DexRef);
  DexRef.getMove=function patchedGetMove(name){
    const existing=originalGetMove(name);
    if(existing)return existing;
    return EXTRA_MOVES[moveName(name)]||null;
  };

  if(typeof FALLBACK_ABILITIES!=='undefined'){
    if(!FALLBACK_ABILITIES.Farigiraf)FALLBACK_ABILITIES.Farigiraf={0:'Cud Chew',1:'Armor Tail',H:'Sap Sipper'};
    if(!FALLBACK_ABILITIES.Bruxish)FALLBACK_ABILITIES.Bruxish={0:'Dazzling',1:'Strong Jaw',H:'Wonder Skin'};
    if(!FALLBACK_ABILITIES.Tsareena)FALLBACK_ABILITIES.Tsareena={0:'Leaf Guard',1:'Queenly Majesty',H:'Sweet Veil'};
  }
  if(typeof REPLAY_MOVE_HINTS!=='undefined'){
    Object.assign(REPLAY_MOVE_HINTS,{
      'Accelerock':['Rock','Physical',1],
      'Aqua Jet':['Water','Physical',1],
      'Bullet Punch':['Steel','Physical',1],
      'Extreme Speed':['Normal','Physical',2],
      'Fake Out':['Normal','Physical',3],
      'First Impression':['Bug','Physical',2],
      'Ice Shard':['Ice','Physical',1],
      'Jet Punch':['Water','Physical',1],
      'Mach Punch':['Fighting','Physical',1],
      'Shadow Sneak':['Ghost','Physical',1],
      'Sucker Punch':['Dark','Physical',1],
      'Thunderclap':['Electric','Special',1],
      'Vacuum Wave':['Fighting','Special',1]
    });
  }

  if(typeof moveBlockingAbility==='function'){
    const originalMoveBlockingAbility=moveBlockingAbility;
    moveBlockingAbility=function patchedMoveBlockingAbility(moveType,category,ability,move=''){
      const blocker=priorityBlockingAbility(ability,move);
      if(blocker)return blocker;
      return originalMoveBlockingAbility(moveType,category,ability,move);
    };
  }

  if(typeof dmg==='function'){
    const originalDmg=dmg;
    dmg=function patchedDmg(att,def,mv,opt={}){
      const roll=originalDmg(att,def,mv,opt);
      const blocker=priorityBlockingAbility(roll.def?.ability,mv);
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

  if(typeof proto.moveBlockedAbilities==='function'){
    const originalMoveBlockedAbilities=proto.moveBlockedAbilities;
    proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state,move=''){
      const base=originalMoveBlockedAbilities.call(this,state,move)||[];
      if(typeof this.abilitySuppressionActive==='function'&&this.abilitySuppressionActive(state))return base;
      if(typeof this.moveAbilityBypass==='function'&&this.moveAbilityBypass(state,move))return base;
      return addUnique([...base,...priorityBlockedAbilities(state?.species,move)]);
    };
  }

  if(typeof proto.moveAbilityBypassProtectedAbilities==='function'){
    const originalMoveAbilityBypassProtectedAbilities=proto.moveAbilityBypassProtectedAbilities;
    proto.moveAbilityBypassProtectedAbilities=function patchedMoveAbilityBypassProtectedAbilities(state,move='',status=''){
      const base=originalMoveAbilityBypassProtectedAbilities.call(this,state,move,status)||[];
      return addUnique([...base,...priorityBlockedAbilities(state?.species,move)]);
    };
  }

  if(typeof proto.abilityRewardText==='function'){
    const originalAbilityRewardText=proto.abilityRewardText;
    proto.abilityRewardText=function patchedAbilityRewardText(ability){
      if(isPriorityBlockingAbility(ability))return 'blanking opposing priority attacks';
      return originalAbilityRewardText.call(this,ability);
    };
  }

  if(typeof proto.abilityTriggeredByMove==='function'){
    const originalAbilityTriggeredByMove=proto.abilityTriggeredByMove;
    proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability,move=''){
      if(priorityBlockingAbility(ability,move))return true;
      return originalAbilityTriggeredByMove.call(this,ability,move);
    };
  }

  if(typeof proto.abilityClueLabel==='function'){
    const originalAbilityClueLabel=proto.abilityClueLabel;
    proto.abilityClueLabel=function patchedAbilityClueLabel(ability,move=''){
      if(priorityBlockingAbility(ability,move))return priorityBlockerClueLabel(ability,move);
      return originalAbilityClueLabel.call(this,ability,move);
    };
  }

  if(typeof proto.abilityClueLabelWithProof==='function'){
    const originalAbilityClueLabelWithProof=proto.abilityClueLabelWithProof;
    proto.abilityClueLabelWithProof=function patchedAbilityClueLabelWithProof(ability,move='',assumeTriggered=false){
      if(move&&(assumeTriggered||priorityBlockingAbility(ability,move))){
        const label=priorityBlockerClueLabel(ability,move);
        if(label!==`${ability} revealed`)return label;
      }
      return originalAbilityClueLabelWithProof.call(this,ability,move,assumeTriggered);
    };
  }

  if(typeof proto.reactiveAbilityProof==='function'){
    const originalReactiveAbilityProof=proto.reactiveAbilityProof;
    proto.reactiveAbilityProof=function patchedReactiveAbilityProof(ability){
      return isPriorityBlockingAbility(ability)||originalReactiveAbilityProof.call(this,ability);
    };
  }

  if(typeof proto.extractEvidence==='function'){
    const originalExtractEvidence=proto.extractEvidence;
    proto.extractEvidence=function patchedExtractEvidence(event,turn){
      if(event?.type==='-activate'&&event.target){
        const ability=normalizeAbilityLabel(event.effect||event.from||'');
        if(isPriorityBlockingAbility(ability)&&typeof this.ensureState==='function'){
          const state=this.ensureState(event.target,event.details);
          const moveEvent=Array.isArray(this.turnMoves)
            ? [...this.turnMoves].reverse().find(entry=>entry?.move&&entry.slot&&entry.slot!==state?.slot)
            : null;
          const moveNameValue=String(moveEvent?.move||'').trim();
          if(state&&moveNameValue&&isBlockedPriorityMove(moveNameValue)&&typeof this.recordAbilityReveal==='function'){
            this.recordAbilityReveal(
              state,
              turn||0,
              ability,
              moveEvent,
              `${state.species} revealed ${ability} by blocking ${moveNameValue}`,
              priorityBlockerClueLabel(ability,moveNameValue),
              {assumeReactiveMove:true}
            );
          }
        }
      }
      return originalExtractEvidence.call(this,event,turn);
    };
  }
})();