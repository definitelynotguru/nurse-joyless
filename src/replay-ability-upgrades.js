(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  if(typeof REPLAY_MOVE_HINTS!=='undefined'){
    REPLAY_MOVE_HINTS.Nuzzle=['Electric','Physical',0];
  }

  proto.reactiveAbilityProof=function reactiveAbilityProof(ability){
    return ['Water Absorb','Volt Absorb','Dry Skin','Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Earth Eater','Well-Baked Body','Flash Fire','Good as Gold'].includes(ability);
  };

  proto.startEffectName=function startEffectName(effect=''){
    return String(effect||'').replace(/^move: /,'').trim();
  };

  proto.knownStatusStartMove=function knownStatusStartMove(move=''){
    return [
      'Attract',
      'Confuse Ray',
      'Disable',
      'Embargo',
      'Encore',
      'Flatter',
      'Gastro Acid',
      'Haze',
      'Heal Block',
      'Leech Seed',
      'Memento',
      'Parting Shot',
      'Supersonic',
      'Swagger',
      'Taunt',
      'Torment',
      'Yawn'
    ].includes(String(move||'').trim());
  };

  proto.startEffectMove=function startEffectMove(event={}, moveEvent=null){
    const raw=String(event?.raw||'');
    const parts=raw?raw.split('|').filter(Boolean):[];
    const effect=this.startEffectName(event?.effect||parts[2]||'');
    if(effect&&moveMeta(effect))return effect;
    const from=String(event?.from||parts.find(part=>part.startsWith('[from]'))?.replace('[from] ','')||'');
    const fromMove=from.match(/^move: (.+)$/)?.[1]||'';
    if(effect&&fromMove&&DexAdapter.id(effect)===DexAdapter.id(fromMove))return fromMove;
    if(effect&&moveEvent?.move&&DexAdapter.id(effect)===DexAdapter.id(moveEvent.move))return moveEvent.move;
    const moveCategory=moveMeta(moveEvent?.move)?.[1]||'';
    if(moveEvent?.move&&(moveCategory==='Status'||this.knownStatusStartMove(moveEvent.move)))return moveEvent.move;
    return '';
  };

  proto.landedMoveContradictionNote=function landedMoveContradictionNote(state, move=''){
    const moveName=String(move||'').trim();
    const abilities=this.moveBlockedAbilities(state,moveName);
    if(!moveName||!abilities.length)return '';
    return `${moveName} successfully landed, ruling out ${this.joinWithOr(abilities)} as the current ability explanation.`;
  };

  proto.abilityClueLabelWithProof=function abilityClueLabelWithProof(ability, move='', assumeTriggered=false){
    if(!move||(!assumeTriggered&&!this.abilityTriggeredByMove(ability, move)))return `${ability} revealed`;
    if(['Water Absorb','Volt Absorb','Dry Skin','Earth Eater'].includes(ability))return `${ability} absorbed ${move}`;
    if(['Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Well-Baked Body'].includes(ability))return `${ability} activated on ${move}`;
    if(['Flash Fire','Good as Gold'].includes(ability))return `${ability} blocked ${move}`;
    return `${ability} revealed`;
  };

  proto.abilityClueLabel=function patchedAbilityClueLabel(ability, move=''){
    return this.abilityClueLabelWithProof(ability, move, false);
  };

  proto.recordAbilityReveal=function patchedRecordAbilityReveal(state, turn, ability, moveEvent, text, clueLabel='', options={}){
    if(!state||!ability)return;
    if(!state.abilityHints.includes(ability))state.abilityHints.push(ability);
    this.addEvidence(state,turn,'reveal',text||`${state.species} revealed ${ability}`,'Ability revealed',3.5,{hard:true,ability});
    const assumeReactiveMove=!!options.assumeReactiveMove&&this.reactiveAbilityProof(ability);
    const reactiveMove=(assumeReactiveMove&&moveEvent?.move)?moveEvent:(this.abilityTriggeredByMove(ability, moveEvent?.move)?moveEvent:null);
    this.addClueObservation(state,{turn,move:reactiveMove?.move||'',label:clueLabel||this.abilityClueLabelWithProof(ability,reactiveMove?.move,assumeReactiveMove)});
  };

  const originalExtractEvidence=proto.extractEvidence;
  proto.extractEvidence=function patchedExtractEvidence(event, turn){
    if(event?.type==='-status'&&event.target){
      const hazard=this.normalizedHazardName(event.from);
      if(hazard!=='Toxic Spikes'&&!this.abilitySource(event.from)&&!this.itemSource(event.from)){
        const state=this.ensureState(event.target);
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        const landedMove=moveCategory(moveEvent?.move)==='Status'?moveEvent.move:'';
        if(landedMove){
          this.ruleOutAbilities(
            state,
            turn,
            this.moveBlockedAbilities(state,landedMove),
            this.landedMoveContradictionNote(state,landedMove),
            `${landedMove} landed`
          );
        }
      }
      return originalExtractEvidence.call(this,event,turn);
    }
    if(event?.type==='-heal'&&event.target&&event.from){
      const state=this.ensureState(event.target);
      const ability=this.abilitySource(event.from);
      if(ability){
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        if(state.itemGone&&this.groundProtectionRecoveryAbilitiesForMove(state,moveEvent?.move).includes(ability)){
          this.addPostItemLossGroundProtectionHints(state,moveEvent?.move,{includeItems:false});
          this.addPostItemLossGroundNote(state,this.postItemLossGroundAbilityProtectionNote(state,moveEvent?.move));
        }
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} restored HP with ${ability}`,'',{assumeReactiveMove:true});
      }
      return;
    }
    if(event?.type==='-boost'&&event.target&&event.from){
      const state=this.ensureState(event.target);
      const ability=this.abilitySource(event.from);
      if(ability){
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        if(state.itemGone&&this.groundProtectionRecoveryAbilitiesForMove(state,moveEvent?.move).includes(ability)){
          this.addPostItemLossGroundProtectionHints(state,moveEvent?.move,{includeItems:false});
          this.addPostItemLossGroundNote(state,this.postItemLossGroundAbilityProtectionNote(state,moveEvent?.move));
        }
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} gained a boost from ${ability}`,'',{assumeReactiveMove:true});
      }
      return;
    }
    if(event?.type==='-immune'&&event.target&&event.from){
      const state=this.ensureState(event.target);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
      const item=this.itemSource(event.from);
      if(item){
        state.revealedItem=item;
        this.addEvidence(state,turn,'reveal',`${state.species} was protected by ${item}`,'Item confirmed',4,{hard:true,revealedItem:item});
        this.addClueObservation(state,{turn,move:moveEvent?.move||'',label:this.blockedItemClueLabel(item,moveEvent?.move)});
        if(state.itemGone&&this.groundProtectionRecoveryItemsForMove(state,moveEvent?.move).includes(item)){
          state.postItemLossGroundProtectionRecovered=true;
          this.addPostItemLossGroundProtectionHints(state,moveEvent?.move);
          this.addPostItemLossGroundNote(state,this.postItemLossGroundProtectionNote(state,moveEvent?.move));
        }
        return;
      }
      const ability=this.abilitySource(event.from);
      if(ability){
        if(state.itemGone&&this.groundProtectionRecoveryAbilitiesForMove(state,moveEvent?.move).includes(ability)){
          this.addPostItemLossGroundProtectionHints(state,moveEvent?.move,{includeItems:false});
          this.addPostItemLossGroundNote(state,this.postItemLossGroundAbilityProtectionNote(state,moveEvent?.move));
        }
        const clueLabel=moveEvent?.move?`${ability} blocked ${moveEvent.move}`:`${ability} revealed`;
        this.recordAbilityReveal(state,turn,ability,moveEvent,`${state.species} was protected by ${ability}`,clueLabel,{assumeReactiveMove:true});
      }
      return;
    }
    if(event?.type==='-start'){
      const parts=String(event.raw||'').split('|').filter(Boolean);
      const target=event.target||parts[1]||'';
      const effect=event.effect||parts[2]||'';
      if(target&&effect){
        const state=this.ensureState(target);
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        const landedMove=this.startEffectMove({...event,target,effect},moveEvent);
        if(landedMove){
          this.ruleOutAbilities(
            state,
            turn,
            this.moveBlockedAbilities(state,landedMove),
            this.landedMoveContradictionNote(state,landedMove),
            `${landedMove} landed`
          );
        }
      }
      return;
    }
    return originalExtractEvidence.call(this,event,turn);
  };
})();
