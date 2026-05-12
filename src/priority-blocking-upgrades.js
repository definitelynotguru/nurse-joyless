(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const DexRef=typeof DexAdapter!=='undefined'?DexAdapter:(root.DexAdapter||host.DexAdapter);
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  if(!DexRef)return;

  const PRIORITY_BLOCKERS=new Set(['Armor Tail','Dazzling','Queenly Majesty']);
  const NON_BLOCKABLE_PRIORITY_MOVES=new Set([
    'After You',
    'Ally Switch',
    'Baneful Bunker',
    'Burning Bulwark',
    'Crafty Shield',
    'Detect',
    'Endure',
    'Follow Me',
    'Helping Hand',
    "King's Shield",
    'Magic Coat',
    'Mat Block',
    'Obstruct',
    'Protect',
    'Quick Guard',
    'Rage Powder',
    'Silk Trap',
    'Snatch',
    'Spiky Shield',
    'Spotlight',
    'Wide Guard'
  ]);
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
    'Grassy Glide':['Grass','Physical',70,100,0],
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
  function normalizedTerrain(raw=''){
    const label=String(raw||'').replace(/^(move|ability): /,'').trim().toLowerCase();
    if(!label||label==='none')return '';
    if(label.includes('electric'))return 'electric';
    if(label.includes('grassy'))return 'grassy';
    if(label.includes('misty'))return 'misty';
    if(label.includes('psychic'))return 'psychic';
    return '';
  }
  function priorityContextTerrain(context){
    return normalizedTerrain(context?.terrain||context?.battleState?.terrain);
  }
  function movePriorityValue(move='',context=null){
    let priority=0;
    if(typeof movePriority==='function'){
      const value=Number(movePriority(move));
      if(Number.isFinite(value))priority=value;
    }else if(typeof moveMeta==='function'){
      const meta=moveMeta(move);
      const value=Number(meta?.[4]);
      if(Number.isFinite(value))priority=value;
    }
    if(moveName(move)==='Grassy Glide'&&priorityContextTerrain(context)==='grassy'){
      priority=Math.max(priority,1);
    }
    return priority;
  }
  function moveCategoryValue(move=''){
    if(typeof moveCategory==='function'){
      return String(moveCategory(move)||'');
    }
    if(typeof moveMeta==='function'){
      return String(moveMeta(move)?.[1]||'');
    }
    return '';
  }
  function abilityBypassMode(ability=''){
    const name=String(ability||'').trim();
    if(['Mold Breaker','Teravolt','Turboblaze'].includes(name))return 'all';
    if(name==='Mycelium Might')return 'status';
    return '';
  }
  function attackerBypassesPriorityBlocker(ability='',move=''){
    const mode=abilityBypassMode(ability);
    if(mode==='all')return true;
    if(mode==='status')return moveCategoryValue(move)==='Status';
    return false;
  }
  function isPriorityBlockingAbility(ability=''){
    return PRIORITY_BLOCKERS.has(String(ability||'').trim());
  }
  function isBlockablePriorityMove(move='',context=null){
    const name=moveName(move);
    return movePriorityValue(name,context)>0&&!NON_BLOCKABLE_PRIORITY_MOVES.has(name);
  }
  function isDirectPriorityAttack(move='',context=null){
    return isBlockablePriorityMove(move,context)&&moveCategoryValue(move)!=='Status';
  }
  function priorityBlockingAbility(ability='',move='',context=null){
    const name=String(ability||'').trim();
    if(!isPriorityBlockingAbility(name))return '';
    return isBlockablePriorityMove(move,context)?name:'';
  }
  function detectiveAbilityPool(species=''){
    if(typeof detectiveAbilities==='function')return detectiveAbilities(species)||[];
    const data=DexRef.getSpecies?DexRef.getSpecies(species):null;
    return data?.abilities?Object.values(data.abilities).filter(Boolean):[];
  }
  function addUnique(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }
  function priorityBlockedAbilities(species='',move='',context=null){
    if(!isBlockablePriorityMove(move,context))return [];
    return detectiveAbilityPool(species).filter(ability=>priorityBlockingAbility(ability,move,context));
  }
  function normalizeAbilityLabel(raw=''){
    return String(raw||'').replace(/^(ability|move): /,'').trim();
  }
  function priorityBlockerClueLabel(ability='',move='',context=null,assumeTriggered=false){
    const blocker=assumeTriggered?String(ability||'').trim():priorityBlockingAbility(ability,move,context);
    if(!blocker||!move)return `${ability} revealed`;
    return `${blocker} blocked ${move}`;
  }
  function groundedTarget(target){
    if(typeof grounded!=='function')return false;
    try{
      return !!grounded(target);
    }catch(_error){
      return false;
    }
  }
  function psychicTerrainPriorityBlock(roll={},move=''){
    if(roll?.blockedBy)return '';
    if(priorityContextTerrain(roll)!=='psychic')return '';
    if(!isDirectPriorityAttack(move,roll?.battleState))return '';
    return groundedTarget(roll?.def)?'Psychic Terrain':'';
  }
  function zeroPriorityRoll(roll={}, blocker=''){
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
      'Grassy Glide':['Grass','Physical',0],
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
    moveBlockingAbility=function patchedMoveBlockingAbility(moveType,category,ability,move='',context=null){
      const blocker=priorityBlockingAbility(ability,move,context);
      if(blocker)return blocker;
      return originalMoveBlockingAbility(moveType,category,ability,move);
    };
  }

  if(typeof dmg==='function'){
    const originalDmg=dmg;
    root.dmg=function patchedDmg(att,def,mv,opt={}){
      const roll=originalDmg(att,def,mv,opt);
      const blocker=isDirectPriorityAttack(mv,roll?.battleState)&&!attackerBypassesPriorityBlocker(roll.att?.ability,mv)
        ? priorityBlockingAbility(roll.def?.ability,mv,roll?.battleState)
        : '';
      if(blocker)return zeroPriorityRoll(roll,blocker);
      const terrainBlocker=psychicTerrainPriorityBlock(roll,mv);
      if(terrainBlocker)return zeroPriorityRoll(roll,terrainBlocker);
      return roll;
    };
    if(host!==root)host.dmg=root.dmg;
    try{dmg=root.dmg}catch(_error){}
  }

  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  proto.ensureReplayTerrainState=function ensureReplayTerrainState(){
    if(!this.replayTerrainState)this.replayTerrainState={current:''};
    return this.replayTerrainState;
  };
  proto.recordReplayTerrain=function recordReplayTerrain(effect=''){
    const terrain=normalizedTerrain(effect);
    if(terrain)this.ensureReplayTerrainState().current=terrain;
  };
  proto.clearReplayTerrain=function clearReplayTerrain(effect=''){
    const terrain=normalizedTerrain(effect);
    if(!terrain||this.currentReplayTerrain()===terrain)this.ensureReplayTerrainState().current='';
  };
  proto.currentReplayTerrain=function currentReplayTerrain(){
    return this.ensureReplayTerrainState().current||'';
  };

  if(typeof proto.moveBlockedAbilities==='function'){
    const originalMoveBlockedAbilities=proto.moveBlockedAbilities;
    proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state,move=''){
      const base=originalMoveBlockedAbilities.call(this,state,move)||[];
      if(typeof this.abilitySuppressionActive==='function'&&this.abilitySuppressionActive(state))return base;
      if(typeof this.moveAbilityBypass==='function'&&this.moveAbilityBypass(state,move))return base;
      return addUnique([...base,...priorityBlockedAbilities(state?.species,move,{terrain:this.currentReplayTerrain()})]);
    };
  }

  if(typeof proto.moveAbilityBypassProtectedAbilities==='function'){
    const originalMoveAbilityBypassProtectedAbilities=proto.moveAbilityBypassProtectedAbilities;
    proto.moveAbilityBypassProtectedAbilities=function patchedMoveAbilityBypassProtectedAbilities(state,move='',status=''){
      const base=originalMoveAbilityBypassProtectedAbilities.call(this,state,move,status)||[];
      return addUnique([...base,...priorityBlockedAbilities(state?.species,move,{terrain:this.currentReplayTerrain()})]);
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
      if(priorityBlockingAbility(ability,move,{terrain:this.currentReplayTerrain()}))return priorityBlockerClueLabel(ability,move,{terrain:this.currentReplayTerrain()});
      return originalAbilityClueLabel.call(this,ability,move);
    };
  }

  if(typeof proto.abilityClueLabelWithProof==='function'){
    const originalAbilityClueLabelWithProof=proto.abilityClueLabelWithProof;
    proto.abilityClueLabelWithProof=function patchedAbilityClueLabelWithProof(ability,move='',assumeTriggered=false){
      if(move&&(assumeTriggered||priorityBlockingAbility(ability,move,{terrain:this.currentReplayTerrain()}))){
        const label=priorityBlockerClueLabel(ability,move,{terrain:this.currentReplayTerrain()},assumeTriggered);
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
      if(event?.type==='-fieldstart'){
        this.recordReplayTerrain(event.condition||event.effect||event.from);
      }else if(event?.type==='-fieldend'){
        this.clearReplayTerrain(event.condition||event.effect||event.from);
      }
      if(event?.type==='-activate'&&event.target){
        const ability=normalizeAbilityLabel(event.effect||event.from||'');
        if(isPriorityBlockingAbility(ability)&&typeof this.ensureState==='function'){
          const state=this.ensureState(event.target,event.details);
          const moveEvent=Array.isArray(this.turnMoves)
            ? [...this.turnMoves].reverse().find(entry=>entry?.move&&entry.slot&&entry.slot!==state?.slot)
            : null;
          const moveNameValue=String(moveEvent?.move||'').trim();
          if(state&&moveNameValue&&isBlockablePriorityMove(moveNameValue,{terrain:this.currentReplayTerrain()})&&typeof this.recordAbilityReveal==='function'){
            this.recordAbilityReveal(
              state,
              turn||0,
              ability,
              moveEvent,
              `${state.species} revealed ${ability} by blocking ${moveNameValue}`,
              priorityBlockerClueLabel(ability,moveNameValue,{terrain:this.currentReplayTerrain()},true),
              {assumeReactiveMove:true}
            );
          }
        }
      }
      return originalExtractEvidence.call(this,event,turn);
    };
  }
})();