(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  const CONTROL_STATUS_BLOCKERS={
    'Aroma Veil':new Set(['Attract','Disable','Encore','Heal Block','Taunt','Torment']),
    Oblivious:new Set(['Attract','Taunt']),
    'Own Tempo':new Set(['Confuse Ray','Flatter','Supersonic','Swagger','Teeter Dance'])
  };

  if(typeof FALLBACK_ABILITIES!=='undefined'){
    if(!FALLBACK_ABILITIES.Slowbro)FALLBACK_ABILITIES.Slowbro={0:'Oblivious',1:'Own Tempo',H:'Regenerator'};
    if(!FALLBACK_ABILITIES.Aromatisse)FALLBACK_ABILITIES.Aromatisse={0:'Healer',1:'Aroma Veil'};
  }

  function moveName(move=''){
    return typeof DexAdapter!=='undefined'&&DexAdapter.resolveMoveName
      ? DexAdapter.resolveMoveName(move)
      : String(move||'').trim();
  }

  function addUnique(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }

  function controlStatusAbilityBlocksMove(ability='',move=''){
    const name=String(ability||'').trim();
    const moves=CONTROL_STATUS_BLOCKERS[name];
    if(!moves)return '';
    return moves.has(moveName(move))?name:'';
  }

  function controlStatusBlockedAbilities(species='',move=''){
    if(typeof detectiveAbilities!=='function')return [];
    const moveNameValue=moveName(move);
    if(!moveNameValue)return [];
    return detectiveAbilities(species).filter(ability=>controlStatusAbilityBlocksMove(ability,moveNameValue));
  }

  const originalMoveBlockedAbilities=typeof proto.moveBlockedAbilities==='function'?proto.moveBlockedAbilities:null;
  if(originalMoveBlockedAbilities){
    proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state,move=''){
      const base=originalMoveBlockedAbilities.call(this,state,move)||[];
      if(typeof this.abilitySuppressionActive==='function'&&this.abilitySuppressionActive(state))return base;
      if(typeof this.moveAbilityBypass==='function'&&this.moveAbilityBypass(state,move))return base;
      return addUnique([...base,...controlStatusBlockedAbilities(state?.species,move)]);
    };
  }

  const originalMoveAbilityBypassProtectedAbilities=typeof proto.moveAbilityBypassProtectedAbilities==='function'
    ? proto.moveAbilityBypassProtectedAbilities
    : null;
  if(originalMoveAbilityBypassProtectedAbilities){
    proto.moveAbilityBypassProtectedAbilities=function patchedMoveAbilityBypassProtectedAbilities(state,move='',status=''){
      const base=originalMoveAbilityBypassProtectedAbilities.call(this,state,move,status)||[];
      if(typeof this.abilitySuppressionActive==='function'&&this.abilitySuppressionActive(state))return base;
      return addUnique([...base,...controlStatusBlockedAbilities(state?.species,move)]);
    };
  }

  const originalAbilityTriggeredByMove=typeof proto.abilityTriggeredByMove==='function'?proto.abilityTriggeredByMove:null;
  if(originalAbilityTriggeredByMove){
    proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability,move=''){
      if(controlStatusAbilityBlocksMove(ability,move))return true;
      return originalAbilityTriggeredByMove.call(this,ability,move);
    };
  }

  const originalAbilityClueLabelWithProof=typeof proto.abilityClueLabelWithProof==='function'?proto.abilityClueLabelWithProof:null;
  if(originalAbilityClueLabelWithProof){
    proto.abilityClueLabelWithProof=function patchedAbilityClueLabelWithProof(ability,move='',assumeTriggered=false){
      if(move&&(assumeTriggered||controlStatusAbilityBlocksMove(ability,move))){
        return `${String(ability||'').trim()} blocked ${moveName(move)}`;
      }
      return originalAbilityClueLabelWithProof.call(this,ability,move,assumeTriggered);
    };
  }

  const originalAbilityRewardText=typeof proto.abilityRewardText==='function'?proto.abilityRewardText:null;
  if(originalAbilityRewardText){
    proto.abilityRewardText=function patchedAbilityRewardText(ability){
      const name=String(ability||'').trim();
      if(name==='Own Tempo')return 'blocking confusion-based control';
      if(name==='Oblivious')return 'blanking Taunt and infatuation control';
      if(name==='Aroma Veil')return 'blanking Taunt and lockout control';
      return originalAbilityRewardText.call(this,ability);
    };
  }

  const originalReactiveAbilityProof=typeof proto.reactiveAbilityProof==='function'?proto.reactiveAbilityProof:null;
  if(originalReactiveAbilityProof){
    proto.reactiveAbilityProof=function patchedReactiveAbilityProof(ability){
      return !!CONTROL_STATUS_BLOCKERS[String(ability||'').trim()]||originalReactiveAbilityProof.call(this,ability);
    };
  }
})();