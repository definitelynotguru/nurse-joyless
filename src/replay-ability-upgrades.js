(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  if(typeof REPLAY_MOVE_HINTS!=='undefined'){
    REPLAY_MOVE_HINTS.Nuzzle=['Electric','Physical',0];
    REPLAY_MOVE_HINTS.Glare=['Normal','Status',0];
    REPLAY_MOVE_HINTS['Stun Spore']=['Grass','Status',0];
    REPLAY_MOVE_HINTS['Poison Powder']=['Poison','Status',0];
    REPLAY_MOVE_HINTS['Sleep Powder']=['Grass','Status',0];
    REPLAY_MOVE_HINTS.Hypnosis=['Psychic','Status',0];
    REPLAY_MOVE_HINTS['Lovely Kiss']=['Normal','Status',0];
    REPLAY_MOVE_HINTS.Sing=['Normal','Status',0];
  }

  proto.reactiveAbilityProof=function reactiveAbilityProof(ability){
    return ['Water Absorb','Volt Absorb','Dry Skin','Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Earth Eater','Well-Baked Body','Flash Fire','Good as Gold','Magic Bounce'].includes(ability);
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

  proto.knownPureStatusMove=function knownPureStatusMove(move=''){
    return [
      'Glare',
      'Hypnosis',
      'Lovely Kiss',
      'Poison Powder',
      'Sing',
      'Sleep Powder',
      'Stun Spore'
    ].includes(String(move||'').trim());
  };

  proto.replaySafeMoveCategory=function replaySafeMoveCategory(move=''){
    const meta=moveMeta(move);
    if(meta?.[1])return meta[1];
    if(this.knownStatusStartMove(move)||this.knownPureStatusMove(move))return 'Status';
    return '';
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
    const moveCategory=this.replaySafeMoveCategory(moveEvent?.move);
    if(moveEvent?.move&&(moveCategory==='Status'||this.knownStatusStartMove(moveEvent.move)))return moveEvent.move;
    return '';
  };

  proto.landedMoveContradictionNote=function landedMoveContradictionNote(state, move=''){
    const moveName=String(move||'').trim();
    const abilities=this.moveBlockedAbilities(state,moveName);
    if(!moveName||!abilities.length)return '';
    return `${moveName} successfully landed, ruling out ${this.joinWithOr(abilities)} as the current ability explanation.`;
  };

  proto.statusLabel=function statusLabel(status=''){
    const value=String(status||'').trim();
    return ({
      brn:'burn',
      psn:'poison',
      tox:'bad poison',
      par:'paralysis',
      slp:'sleep',
      frz:'freeze'
    })[value]||'status';
  };

  proto.toxicSpikesBlockedByExistingStatus=function toxicSpikesBlockedByExistingStatus(state){
    return !!String(state?.currentStatus||'').trim();
  };

  proto.postItemLossStatusBlockNote=function postItemLossStatusBlockNote(state, hazard=''){
    const label=this.normalizedHazardName(hazard)||String(hazard||'hazards').trim()||'hazards';
    if(label!=='Toxic Spikes'||!this.toxicSpikesBlockedByExistingStatus(state))return '';
    const status=this.statusLabel(state.currentStatus);
    return `Later switched through ${label} after ${state?.removedItem||'the old item'} left the slot without getting poisoned, but the standing ${status} already explains that outcome without implying fresh protection.`;
  };

  proto.abilityClueLabelWithProof=function abilityClueLabelWithProof(ability, move='', assumeTriggered=false){
    if(!move||(!assumeTriggered&&!this.abilityTriggeredByMove(ability, move)))return `${ability} revealed`;
    if(['Water Absorb','Volt Absorb','Dry Skin','Earth Eater'].includes(ability))return `${ability} absorbed ${move}`;
    if(['Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Well-Baked Body'].includes(ability))return `${ability} activated on ${move}`;
    if(ability==='Magic Bounce')return `${ability} reflected ${move}`;
    if(['Flash Fire','Good as Gold'].includes(ability))return `${ability} blocked ${move}`;
    return `${ability} revealed`;
  };

  const originalAbilityTriggeredByMove=proto.abilityTriggeredByMove;
  proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability, move=''){
    const category=this.replaySafeMoveCategory(move);
    if(ability==='Magic Bounce'||ability==='Good as Gold')return category==='Status';
    return originalAbilityTriggeredByMove.call(this,ability,move);
  };

  proto.abilitySuppressionEffect=function abilitySuppressionEffect(effect=''){
    const label=this.startEffectName(effect);
    return label==='Gastro Acid'?label:'';
  };

  proto.abilitySuppressionActive=function abilitySuppressionActive(state){
    return !!state?.abilitySuppressed;
  };

  proto.abilitySuppressionNote=function abilitySuppressionNote(effect=''){
    const label=this.abilitySuppressionEffect(effect);
    if(!label)return '';
    return `${label} suppressed the target's ability for part of the replay, so landed move and status clues from that window do not rule out the base ability.`;
  };

  proto.applyAbilitySuppression=function applyAbilitySuppression(state, turn, effect=''){
    const label=this.abilitySuppressionEffect(effect);
    if(!state||!label)return;
    state.abilitySuppressed=true;
    state.abilitySuppressionEffect=label;
    this.addEvidence(state,turn||0,'reveal',`${state.species} had its ability suppressed by ${label}`,'Ability suppression active',2.5,{soft:true});
    this.addClueObservation(state,{turn:turn||0,label:`${label} landed`});
    this.addAbilityContradictionNote(state,this.abilitySuppressionNote(label));
  };

  proto.clearAbilitySuppression=function clearAbilitySuppression(state, effect=''){
    const label=this.abilitySuppressionEffect(effect)||String(effect||'').trim();
    if(!state)return;
    if(label&&state.abilitySuppressionEffect&&label!==state.abilitySuppressionEffect)return;
    state.abilitySuppressed=false;
    state.abilitySuppressionEffect='';
  };

  const originalMoveBlockedAbilities=proto.moveBlockedAbilities;
  proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state, move=''){
    if(this.abilitySuppressionActive(state))return [];
    return originalMoveBlockedAbilities.call(this,state,move);
  };

  proto.majorStatusBlockingAbilities=function majorStatusBlockingAbilities(state, status=''){
    const statusId=String(status||'').trim();
    if(!statusId)return [];
    if(this.abilitySuppressionActive(state))return [];
    return detectiveAbilities(state?.species).filter(ability=>{
      if(ability==='Purifying Salt')return true;
      if(statusId==='par'&&ability==='Limber')return true;
      if((statusId==='psn'||statusId==='tox')&&['Immunity','Pastel Veil'].includes(ability))return true;
      if(statusId==='brn'&&['Water Veil','Water Bubble'].includes(ability))return true;
      if(statusId==='slp'&&['Insomnia','Vital Spirit','Sweet Veil'].includes(ability))return true;
      if(statusId==='frz'&&ability==='Magma Armor')return true;
      return false;
    });
  };

  proto.statusImmunityContradictionLabel=function statusImmunityContradictionLabel(status='', move=''){
    const effect=this.statusLabel(status);
    const moveName=String(move||'').trim();
    if(moveName&&effect!=='status')return `${moveName} caused ${effect}`;
    if(moveName)return `${moveName} landed`;
    return effect==='status'?'status landed':`${effect} landed`;
  };

  proto.statusImmunityContradictionNote=function statusImmunityContradictionNote(state, status='', move=''){
    const abilities=this.majorStatusBlockingAbilities(state,status);
    const effect=this.statusLabel(status);
    const moveName=String(move||'').trim();
    if(!abilities.length)return '';
    if(moveName&&effect!=='status'){
      return `${moveName} successfully caused ${effect}, ruling out ${this.joinWithOr(abilities)} as the current ability explanation.`;
    }
    if(effect!=='status'){
      return `Actually becoming ${effect} rules out ${this.joinWithOr(abilities)} as the current ability explanation.`;
    }
    return `The landed status rules out ${this.joinWithOr(abilities)} as the current ability explanation.`;
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

  const originalMarkPostItemLossProtection=proto.markPostItemLossProtection;
  proto.markPostItemLossProtection=function patchedMarkPostItemLossProtection(state, hazard=''){
    if(this.normalizedHazardName(hazard)==='Toxic Spikes'&&this.toxicSpikesBlockedByExistingStatus(state)){
      this.addPostItemLossNote(state,this.postItemLossStatusBlockNote(state,hazard));
      return;
    }
    return originalMarkPostItemLossProtection.call(this,state,hazard);
  };

  const originalResolvePendingEntryChecksForEvent=proto.resolvePendingEntryChecksForEvent;
  proto.resolvePendingEntryChecksForEvent=function patchedResolvePendingEntryChecksForEvent(turn, event){
    if(!this.pendingEntryChecks?.length)return originalResolvePendingEntryChecksForEvent.call(this,turn,event);
    const remaining=[];
    const eventSlot=event?.target?this.slotId(event.target):'';
    const eventHazard=event?.type==='-damage'||event?.type==='-status'
      ? this.normalizedHazardName(event.from)
      : event?.type==='-activate'
        ? this.normalizedHazardName(event.effect||event.from)
        : '';
    this.pendingEntryChecks.forEach(check=>{
      if((check.turn||0)>turn){
        remaining.push(check);
        return;
      }
      if((check.turn||0)<turn){
        const state=this.speciesState[check.key];
        (check.hazards||[]).forEach(hazard=>this.markPostItemLossProtection(state,hazard));
        return;
      }
      if(eventSlot===check.slot&&eventHazard&&check.hazards.includes(eventHazard)){
        const hazards=(check.hazards||[]).filter(hazard=>hazard!==eventHazard);
        if(hazards.length)remaining.push({...check,hazards});
        return;
      }
      remaining.push(check);
    });
    this.pendingEntryChecks=remaining;
  };

  const originalExtractEvidence=proto.extractEvidence;
  proto.extractEvidence=function patchedExtractEvidence(event, turn){
    if((event?.type==='switch'||event?.type==='drag')&&event?.pokemon){
      this.clearAbilitySuppression(this.ensureState(event.pokemon,event.details));
    }
    if(event?.type==='-status'&&event.target&&!this.normalizedHazardName(event.from)){
      const state=this.ensureState(event.target);
      state.currentStatus=event.status||state.currentStatus||'';
    }else if(event?.type==='-curestatus'){
      const parts=String(event.raw||'').split('|').filter(Boolean);
      const target=event.target||parts[1]||'';
      if(target){
        const state=this.ensureState(target);
        state.currentStatus='';
      }
    }
    if(event?.type==='-status'&&event.target){
      const hazard=this.normalizedHazardName(event.from);
      const state=this.ensureState(event.target);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
      const duplicateHazardAbilities=hazard==='Toxic Spikes'?this.hazardAbilityContradictions(state,hazard):[];
      const statusAbilities=this.majorStatusBlockingAbilities(state,event.status).filter(ability=>!duplicateHazardAbilities.includes(ability));
      if(statusAbilities.length){
        this.ruleOutAbilities(
          state,
          turn,
          statusAbilities,
          this.statusImmunityContradictionNote(state,event.status,moveEvent?.move),
          this.statusImmunityContradictionLabel(event.status,moveEvent?.move)
        );
      }
      if(hazard!=='Toxic Spikes'&&!this.abilitySource(event.from)&&!this.itemSource(event.from)){
        const landedMove=moveEvent?.move&&this.replaySafeMoveCategory(moveEvent.move)==='Status'?moveEvent.move:'';
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
    if(event?.type==='-curestatus'){
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
        this.applyAbilitySuppression(state,turn,effect);
      }
      return;
    }
    if(event?.type==='-end'){
      const parts=String(event.raw||'').split('|').filter(Boolean);
      const target=event.target||parts[1]||'';
      const effect=event.effect||parts[2]||'';
      if(target&&effect){
        this.clearAbilitySuppression(this.ensureState(target),effect);
      }
      return originalExtractEvidence.call(this,event,turn);
    }
    return originalExtractEvidence.call(this,event,turn);
  };
})();
