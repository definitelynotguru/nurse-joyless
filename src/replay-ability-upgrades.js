(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

  if(typeof P!=='undefined'&&!P.Leafeon){
    P.Leafeon=[['Grass'],[65,110,130,60,65,95]];
  }
  if(typeof P!=='undefined'&&!P.Slurpuff){
    P.Slurpuff=[['Fairy'],[82,80,86,85,75,72]];
  }
  if(typeof P!=='undefined'&&!P['Rapidash-Galar']){
    P['Rapidash-Galar']=[['Psychic','Fairy'],[65,100,70,80,80,105]];
  }
  if(typeof P!=='undefined'&&!P.Wailord){
    P.Wailord=[['Water'],[170,90,45,90,45,60]];
  }
  if(typeof P!=='undefined'&&!P.Magmar){
    P.Magmar=[['Fire'],[65,95,57,100,85,93]];
  }
  if(typeof P!=='undefined'&&!P.Camerupt){
    P.Camerupt=[['Fire','Ground'],[70,100,70,105,75,40]];
  }
  if(typeof P!=='undefined'&&!P.Banette){
    P.Banette=[['Ghost'],[64,115,65,83,63,65]];
  }

  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Leafeon){
    FALLBACK_ABILITIES.Leafeon={0:'Leaf Guard',H:'Chlorophyll'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Slurpuff){
    FALLBACK_ABILITIES.Slurpuff={0:'Sweet Veil',1:'Unburden'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES['Rapidash-Galar']){
    FALLBACK_ABILITIES['Rapidash-Galar']={0:'Run Away',1:'Pastel Veil',H:'Anticipation'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Wailord){
    FALLBACK_ABILITIES.Wailord={0:'Water Veil',1:'Oblivious',H:'Pressure'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Magmar){
    FALLBACK_ABILITIES.Magmar={0:'Flame Body',1:'Vital Spirit',H:'Vital Spirit'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Camerupt){
    FALLBACK_ABILITIES.Camerupt={0:'Magma Armor',1:'Solid Rock',H:'Anger Point'};
  }
  if(typeof FALLBACK_ABILITIES!=='undefined'&&!FALLBACK_ABILITIES.Banette){
    FALLBACK_ABILITIES.Banette={0:'Insomnia',1:'Frisk',H:'Cursed Body'};
  }

  if(typeof REPLAY_MOVE_HINTS!=='undefined'){
    REPLAY_MOVE_HINTS.Nuzzle=['Electric','Physical',0];
    REPLAY_MOVE_HINTS.Glare=['Normal','Status',0];
    REPLAY_MOVE_HINTS.Powder=['Bug','Status',0];
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
    return String(effect||'').replace(/^(move|ability): /,'').trim();
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
      'Powder',
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

  proto.singleEffectMove=function singleEffectMove(event={}, moveEvent=null){
    const raw=String(event?.raw||'');
    const parts=raw?raw.split('|').filter(Boolean):[];
    const effect=this.startEffectName(event?.effect||parts[2]||'');
    const from=String(event?.from||parts.find(part=>part.startsWith('[from]'))?.replace('[from] ','')||'');
    const fromMove=from.match(/^move: (.+)$/)?.[1]||'';
    if(effect&&fromMove&&DexAdapter.id(effect)===DexAdapter.id(fromMove))return fromMove;
    if(effect&&moveEvent?.move&&DexAdapter.id(effect)===DexAdapter.id(moveEvent.move))return moveEvent.move;
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

  proto.toxicSpikesBlockedByExistingStatus=function toxicSpikesBlockedByExistingStatus(state, statusOverride=''){
    return !!String(statusOverride||state?.currentStatus||'').trim();
  };

  proto.postItemLossStatusBlockNote=function postItemLossStatusBlockNote(state, hazard='', statusOverride=''){
    const label=this.normalizedHazardName(hazard)||String(hazard||'hazards').trim()||'hazards';
    if(label!=='Toxic Spikes'||!this.toxicSpikesBlockedByExistingStatus(state,statusOverride))return '';
    const status=this.statusLabel(statusOverride||state?.currentStatus||'');
    return `Later switched through ${label} after ${state?.removedItem||'the old item'} left the slot without getting poisoned, but the standing ${status} already explains that outcome without implying fresh protection.`;
  };

  proto.entryStatusForCheck=function entryStatusForCheck(check={}){
    return String(check?.entryStatus||'').trim();
  };

  proto.markPostItemLossProtectionFromCheck=function markPostItemLossProtectionFromCheck(state, hazard='', check={}){
    const entryStatus=this.entryStatusForCheck(check);
    if(this.normalizedHazardName(hazard)==='Toxic Spikes'&&entryStatus){
      this.addPostItemLossNote(state,this.postItemLossStatusBlockNote(state,hazard,entryStatus));
      return;
    }
    this.markPostItemLossProtection(state,hazard);
  };

  proto.markPostItemLossSuppressedProtectionFromCheck=function markPostItemLossSuppressedProtectionFromCheck(state, hazard='', source='', check={}){
    const entryStatus=this.entryStatusForCheck(check);
    if(this.normalizedHazardName(hazard)==='Toxic Spikes'&&entryStatus){
      this.addPostItemLossNote(state,this.postItemLossStatusBlockNote(state,hazard,entryStatus));
      return;
    }
    this.markPostItemLossSuppressedProtection(state,hazard,source);
  };

  proto.abilityClueLabelWithProof=function abilityClueLabelWithProof(ability, move='', assumeTriggered=false){
    if(!move||(!assumeTriggered&&!this.abilityTriggeredByMove(ability, move)))return `${ability} revealed`;
    if(['Water Absorb','Volt Absorb','Dry Skin','Earth Eater'].includes(ability))return `${ability} absorbed ${move}`;
    if(['Storm Drain','Lightning Rod','Motor Drive','Sap Sipper','Well-Baked Body'].includes(ability))return `${ability} activated on ${move}`;
    if(ability==='Magic Bounce')return `${ability} reflected ${move}`;
    if(['Flash Fire','Good as Gold'].includes(ability))return `${ability} blocked ${move}`;
    return `${ability} revealed`;
  };

  proto.stillPossibleProtectionAbilities=function stillPossibleProtectionAbilities(state, abilities=[]){
    const ruledOut=new Set((state?.ruledOutAbilities||[]).map(ability=>String(ability||'').trim()).filter(Boolean));
    return (abilities||[]).filter(ability=>ability&&!ruledOut.has(String(ability||'').trim()));
  };

  proto.abilityBypassMode=function abilityBypassMode(ability=''){
    const name=String(ability||'').trim();
    if(['Mold Breaker','Teravolt','Turboblaze'].includes(name))return 'all';
    if(name==='Mycelium Might')return 'status';
    return '';
  };

  proto.abilityBypassAbility=function abilityBypassAbility(ability=''){
    return !!this.abilityBypassMode(ability);
  };

  proto.findRecentOpponentMoveEvent=function findRecentOpponentMoveEvent(state, move=''){
    const moveName=String(move||'').trim();
    if(!moveName||!state?.slot||!Array.isArray(this.turnMoves))return null;
    return [...this.turnMoves].reverse().find(entry=>{
      if(!entry?.move||DexAdapter.id(entry.move)!==DexAdapter.id(moveName))return false;
      return entry.slot&&entry.slot!==state.slot;
    })||null;
  };

  proto.moveAbilityBypass=function moveAbilityBypass(state, move=''){
    const moveEvent=this.findRecentOpponentMoveEvent(state, move);
    const ability=String(moveEvent?.abilityBypass||'').trim();
    const mode=this.abilityBypassMode(ability);
    if(!mode)return '';
    if(mode==='all')return ability;
    if(mode==='status'&&this.replaySafeMoveCategory(move)==='Status')return ability;
    return '';
  };

  proto.majorStatusBlockingAbilitiesWithoutBypass=function majorStatusBlockingAbilitiesWithoutBypass(state, status=''){
    const statusId=String(status||'').trim();
    if(!statusId)return [];
    return detectiveAbilities(state?.species).filter(ability=>{
      if(ability==='Purifying Salt')return true;
      if(ability==='Leaf Guard'&&this.sunWeatherActive())return true;
      if(statusId==='par'&&ability==='Limber')return true;
      if((statusId==='psn'||statusId==='tox')&&['Immunity','Pastel Veil'].includes(ability))return true;
      if(statusId==='brn'&&['Water Veil','Water Bubble'].includes(ability))return true;
      if(statusId==='slp'&&['Insomnia','Vital Spirit','Sweet Veil'].includes(ability))return true;
      if(statusId==='frz'&&ability==='Magma Armor')return true;
      return false;
    });
  };

  proto.groundMoveProtectedAbilities=function groundMoveProtectedAbilities(state, move=''){
    if(!this.isGroundProtectionMove(move))return [];
    return detectiveAbilities(state?.species).filter(ability=>['Levitate','Earth Eater'].includes(ability));
  };

  proto.moveAbilityBypassProtectedAbilities=function moveAbilityBypassProtectedAbilities(state, move='', status=''){
    if(this.abilitySuppressionActive(state))return [];
    const moveName=String(move||'').trim();
    const sideConditionAbility=this.normalizedHazardName(moveName)?['Magic Bounce']:[];
    return this.stillPossibleProtectionAbilities(state,unique([
      ...sideConditionAbility,
      ...detectiveAbilities(state?.species).filter(candidate=>!sideConditionAbility.length&&this.abilityTriggeredByMove(candidate,moveName)),
      ...this.majorStatusBlockingAbilitiesWithoutBypass(state,status),
      ...this.groundMoveProtectedAbilities(state,moveName)
    ]));
  };

  proto.moveAbilityBypassNote=function moveAbilityBypassNote(state, move='', status=''){
    const ability=this.moveAbilityBypass(state, move);
    const moveName=String(move||'').trim();
    const abilities=this.moveAbilityBypassProtectedAbilities(state,moveName,status);
    if(!ability||!moveName||!abilities.length)return '';
    return `${ability} let ${moveName} bypass ${this.joinWithOr(abilities)}, so that landed move does not rule out the base ability.`;
  };

  proto.recordMoveAbilityBypass=function recordMoveAbilityBypass(state, turn, move='', status=''){
    const note=this.moveAbilityBypassNote(state, move, status);
    const ability=this.moveAbilityBypass(state, move);
    const moveName=String(move||'').trim();
    if(!state||!note||!ability||!moveName)return;
    if((state.abilityContradictionNotes||[]).includes(note))return;
    this.addAbilityContradictionNote(state,note);
    this.addEvidence(state,turn||0,'reveal',`${ability} bypassed the target ability checks for ${moveName}`,'Ability bypass window active',2,{soft:true});
    this.addClueObservation(state,{turn:turn||0,move:moveName,label:`${ability} bypassed ${moveName}`});
  };

  const originalAbilityTriggeredByMove=proto.abilityTriggeredByMove;
  proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability, move=''){
    const category=this.replaySafeMoveCategory(move);
    if(ability==='Magic Bounce')return category==='Status';
    if(ability==='Good as Gold')return category==='Status'&&!this.normalizedHazardName(move);
    return originalAbilityTriggeredByMove.call(this,ability,move);
  };

  proto.abilitySuppressionEffect=function abilitySuppressionEffect(effect=''){
    const label=this.startEffectName(effect);
    return label==='Gastro Acid'?label:'';
  };

  proto.ensureFieldSuppressionState=function ensureFieldSuppressionState(){
    if(!this.fieldAbilitySuppressionSlots)this.fieldAbilitySuppressionSlots={};
    return this.fieldAbilitySuppressionSlots;
  };

  proto.fieldAbilitySuppressionSource=function fieldAbilitySuppressionSource(state){
    const slots=this.ensureFieldSuppressionState();
    const suppressedSlot=String(state?.slot||'').trim();
    const sourceSlot=Object.keys(slots).find(slot=>slot&&slot!==suppressedSlot);
    return sourceSlot?String(slots[sourceSlot]||'').trim():'';
  };

  proto.fieldAbilitySuppressionActive=function fieldAbilitySuppressionActive(state){
    return !!this.fieldAbilitySuppressionSource(state);
  };

  proto.abilitySuppressionActive=function abilitySuppressionActive(state){
    return !!state?.abilitySuppressed||this.fieldAbilitySuppressionActive(state);
  };

  proto.abilitySuppressionNote=function abilitySuppressionNote(effect=''){
    const label=this.abilitySuppressionEffect(effect);
    if(!label)return '';
    return `${label} suppressed the target's ability for part of the replay, so landed move and status clues from that window do not rule out the base ability.`;
  };

  proto.fieldAbilitySuppressionNote=function fieldAbilitySuppressionNote(state){
    const source=this.fieldAbilitySuppressionSource(state);
    if(!source)return '';
    return `Neutralizing Gas from ${source} suppressed the target's ability for part of the replay, so landed move, hazard, and status clues from that window do not rule out the base ability.`;
  };

  proto.postItemLossSuppressedProtectionNote=function postItemLossSuppressedProtectionNote(state, hazard='', source=''){
    const label=this.normalizedHazardName(hazard)||String(hazard||'hazards').trim()||'hazards';
    const missedEffect=label==='Toxic Spikes'
      ? 'without getting poisoned'
      : label==='Sticky Web'
        ? 'without getting slowed'
        : 'without taking chip';
    const itemText=this.joinWithOr(this.protectionRecoveryItemsForHazard(label))||'item-based protection';
    const sourceText=String(source||'').trim()||'another source';
    if(state?.removedItem==='Air Balloon'){
      return `Later switched through ${label} after Air Balloon popped ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
    }
    if(state?.removedItem==='Heavy-Duty Boots'){
      return `Later switched through ${label} after Heavy-Duty Boots were removed ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
    }
    return `Later switched through ${label} after ${state?.removedItem||'the old item'} left the slot ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
  };

  proto.markPostItemLossSuppressedProtection=function markPostItemLossSuppressedProtection(state, hazard='', source=''){
    if(!state)return;
    state.postItemLossProtectionRecovered=true;
    this.addPostItemLossProtectionHints(state,hazard,{includeAbilities:false});
    this.addPostItemLossNote(state,this.postItemLossSuppressedProtectionNote(state,hazard,source));
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

  proto.applyFieldAbilitySuppression=function applyFieldAbilitySuppression(state, turn, ability=''){
    const label=String(ability||'').trim();
    if(!state?.slot||label!=='Neutralizing Gas')return;
    this.ensureFieldSuppressionState()[state.slot]=state.species||label;
  };

  proto.recordFieldAbilitySuppression=function recordFieldAbilitySuppression(state, turn){
    const note=this.fieldAbilitySuppressionNote(state);
    if(!state||!note)return;
    if((state.abilityContradictionNotes||[]).includes(note))return;
    this.addAbilityContradictionNote(state,note);
    this.addEvidence(state,turn||0,'reveal',`Neutralizing Gas was active while ${state.species} took this interaction`,'Field-wide ability suppression active',2.5,{soft:true});
    this.addClueObservation(state,{turn:turn||0,label:'Neutralizing Gas active'});
  };

  proto.clearAbilitySuppression=function clearAbilitySuppression(state, effect=''){
    const label=this.abilitySuppressionEffect(effect)||String(effect||'').trim();
    if(!state)return;
    if(label&&state.abilitySuppressionEffect&&label!==state.abilitySuppressionEffect)return;
    state.abilitySuppressed=false;
    state.abilitySuppressionEffect='';
  };

  proto.clearFieldAbilitySuppression=function clearFieldAbilitySuppression(slot=''){
    const key=String(slot||'').trim();
    if(!key)return;
    delete this.ensureFieldSuppressionState()[key];
  };

  const originalMoveBlockedAbilities=proto.moveBlockedAbilities;
  proto.moveBlockedAbilities=function patchedMoveBlockedAbilities(state, move=''){
    if(this.abilitySuppressionActive(state))return [];
    if(this.moveAbilityBypass(state,move))return [];
    return originalMoveBlockedAbilities.call(this,state,move);
  };

  const originalHazardAbilityContradictions=proto.hazardAbilityContradictions;
  proto.hazardAbilityContradictions=function patchedHazardAbilityContradictions(state, hazard=''){
    if(this.abilitySuppressionActive(state))return [];
    return originalHazardAbilityContradictions.call(this,state,hazard);
  };

  const originalProtectionRecoveryAbilitiesForHazard=proto.protectionRecoveryAbilitiesForHazard;
  proto.protectionRecoveryAbilitiesForHazard=function patchedProtectionRecoveryAbilitiesForHazard(state, hazard=''){
    return this.stillPossibleProtectionAbilities(state,originalProtectionRecoveryAbilitiesForHazard.call(this,state,hazard));
  };

  proto.addPostItemLossProtectionHints=function patchedAddPostItemLossProtectionHints(state, hazard='', options={}){
    if(!state)return;
    if(options.includeItems!==false){
      state.postItemLossProtectionItems=unique([...(state.postItemLossProtectionItems||[]),...this.protectionRecoveryItemsForHazard(hazard)]);
    }
    if(options.includeAbilities===false)return;
    state.postItemLossProtectionAbilities=unique([...(state.postItemLossProtectionAbilities||[]),...this.protectionRecoveryAbilitiesForHazard(state,hazard)]);
  };

  const originalGroundProtectionRecoveryAbilitiesForMove=proto.groundProtectionRecoveryAbilitiesForMove;
  proto.groundProtectionRecoveryAbilitiesForMove=function patchedGroundProtectionRecoveryAbilitiesForMove(state, move=''){
    return this.stillPossibleProtectionAbilities(state,originalGroundProtectionRecoveryAbilitiesForMove.call(this,state,move));
  };

  proto.majorStatusBlockingAbilities=function majorStatusBlockingAbilities(state, status='', move=''){
    const statusId=String(status||'').trim();
    if(!statusId)return [];
    if(this.abilitySuppressionActive(state))return [];
    if(this.moveAbilityBypass(state,move))return [];
    return detectiveAbilities(state?.species).filter(ability=>{
      if(ability==='Purifying Salt')return true;
      if(ability==='Leaf Guard'&&this.sunWeatherActive())return true;
      if(statusId==='par'&&ability==='Limber')return true;
      if((statusId==='psn'||statusId==='tox')&&['Immunity','Pastel Veil'].includes(ability))return true;
      if(statusId==='brn'&&['Water Veil','Water Bubble'].includes(ability))return true;
      if(statusId==='slp'&&['Insomnia','Vital Spirit','Sweet Veil'].includes(ability))return true;
      if(statusId==='frz'&&ability==='Magma Armor')return true;
      return false;
    });
  };

  proto.ensureReplayWeatherState=function ensureReplayWeatherState(){
    if(!this.replayWeatherState)this.replayWeatherState={current:''};
    return this.replayWeatherState;
  };

  proto.normalizedReplayWeather=function normalizedReplayWeather(weather=''){
    const label=String(weather||'').trim().toLowerCase();
    if(!label||label==='none')return '';
    if(label.includes('sun'))return 'sun';
    if(label.includes('rain'))return 'rain';
    if(label.includes('sand'))return 'sand';
    if(label.includes('snow')||label.includes('hail'))return 'snow';
    return '';
  };

  proto.recordReplayWeather=function recordReplayWeather(weather=''){
    this.ensureReplayWeatherState().current=this.normalizedReplayWeather(weather);
  };

  proto.currentReplayWeather=function currentReplayWeather(){
    return this.ensureReplayWeatherState().current||'';
  };

  proto.sunWeatherActive=function sunWeatherActive(){
    return this.currentReplayWeather()==='sun';
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

  proto.activeStateForSide=function activeStateForSide(side=''){
    const slot=`${this.slotSide(side)}a`;
    const key=this.slotState?.[slot];
    return key?this.speciesState?.[key]||null:null;
  };

  proto.sideConditionLandedMove=function sideConditionLandedMove(event={}, moveEvent=null){
    const hazard=this.normalizedHazardName(event?.condition||'');
    if(!hazard||!moveEvent?.move)return '';
    return DexAdapter.id(moveEvent.move)===DexAdapter.id(hazard)?moveEvent.move:'';
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

  const originalQueueEntryCheck=proto.queueEntryCheck;
  proto.queueEntryCheck=function patchedQueueEntryCheck(state, turn){
    originalQueueEntryCheck.call(this,state,turn);
    if(!state?.slot||!state?.species)return;
    const key=this.stateKey(state.slot,state.species);
    const check=(this.pendingEntryChecks||[]).find(entry=>entry.key===key&&entry.turn===turn);
    if(!check)return;
    if(!check.entryStatus)check.entryStatus=String(state.currentStatus||'').trim();
    const source=this.fieldAbilitySuppressionSource(state);
    if(source)check.abilitySuppressionSource=source;
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
        (check.hazards||[]).forEach(hazard=>{
          if(check.abilitySuppressionSource){
            this.markPostItemLossSuppressedProtectionFromCheck(state,hazard,check.abilitySuppressionSource,check);
            return;
          }
          this.markPostItemLossProtectionFromCheck(state,hazard,check);
        });
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

  const originalFlushPendingEntryChecks=proto.flushPendingEntryChecks;
  proto.flushPendingEntryChecks=function patchedFlushPendingEntryChecks(){
    if(!this.pendingEntryChecks?.length)return originalFlushPendingEntryChecks.call(this);
    this.pendingEntryChecks.forEach(check=>{
      const state=this.speciesState[check.key];
      (check.hazards||[]).forEach(hazard=>{
        if(check.abilitySuppressionSource){
          this.markPostItemLossSuppressedProtectionFromCheck(state,hazard,check.abilitySuppressionSource,check);
          return;
        }
        this.markPostItemLossProtectionFromCheck(state,hazard,check);
      });
    });
    this.pendingEntryChecks=[];
  };

  const originalExtractEvidence=proto.extractEvidence;
  proto.extractEvidence=function patchedExtractEvidence(event, turn){
    if(event?.type==='-weather'){
      this.recordReplayWeather(event.weather);
      return originalExtractEvidence.call(this,event,turn);
    }
    if((event?.type==='switch'||event?.type==='drag')&&event?.pokemon){
      const slot=this.slotId(event.pokemon);
      if(slot)this.clearFieldAbilitySuppression(slot);
      this.clearAbilitySuppression(this.ensureState(event.pokemon,event.details));
    }
    if(event?.type==='faint'&&(event?.target||event?.pokemon)){
      const slot=this.slotId(event.target||event.pokemon);
      if(slot)this.clearFieldAbilitySuppression(slot);
    }
    if(event?.type==='-ability'&&event.target&&this.abilityBypassAbility(event.ability)){
      const state=this.ensureState(event.target);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.slot===state?.slot);
      if(moveEvent)moveEvent.abilityBypass=event.ability;
    }
    if(event?.type==='-ability'&&event.target&&String(event.ability||'').trim()==='Neutralizing Gas'){
      this.applyFieldAbilitySuppression(this.ensureState(event.target),turn,event.ability);
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
    if(event?.type==='-sidestart'&&event.side&&event.condition){
      const state=this.activeStateForSide(event.side);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&this.slotSide(x.slot)!==event.side);
      const landedMove=this.sideConditionLandedMove(event,moveEvent);
      if(state&&landedMove){
        this.recordFieldAbilitySuppression(state,turn);
        this.recordMoveAbilityBypass(state,turn,landedMove);
        this.ruleOutAbilities(
          state,
          turn,
          this.moveBlockedAbilities(state,landedMove),
          this.landedMoveContradictionNote(state,landedMove),
          `${landedMove} landed`
        );
      }
      return originalExtractEvidence.call(this,event,turn);
    }
    if(event?.type==='-activate'&&event.target&&this.normalizedHazardName(event.effect)){
      this.recordFieldAbilitySuppression(this.ensureState(event.target),turn);
      return originalExtractEvidence.call(this,event,turn);
    }
    if(event?.type==='-damage'&&event.target&&!this.normalizedHazardName(event.from)){
      const state=this.ensureState(event.target);
      this.recordFieldAbilitySuppression(state,turn);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
      this.recordMoveAbilityBypass(state,turn,moveEvent?.move);
      return originalExtractEvidence.call(this,event,turn);
    }
    if(event?.type==='-damage'&&event.target&&this.normalizedHazardName(event.from)){
      this.recordFieldAbilitySuppression(this.ensureState(event.target),turn);
      return originalExtractEvidence.call(this,event,turn);
    }
    if(event?.type==='-status'&&event.target){
      const hazard=this.normalizedHazardName(event.from);
      const state=this.ensureState(event.target);
      this.recordFieldAbilitySuppression(state,turn);
      const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
      const duplicateHazardAbilities=hazard==='Toxic Spikes'?this.hazardAbilityContradictions(state,hazard):[];
      const statusAbilities=this.majorStatusBlockingAbilities(state,event.status,moveEvent?.move).filter(ability=>!duplicateHazardAbilities.includes(ability));
      this.recordMoveAbilityBypass(state,turn,moveEvent?.move,event.status);
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
    if(event?.type==='-singleturn'||event?.type==='-singlemove'){
      const parts=String(event.raw||'').split('|').filter(Boolean);
      const target=event.target||parts[1]||'';
      const effect=event.effect||parts[2]||'';
      if(target&&effect){
        const state=this.ensureState(target);
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        const landedMove=this.singleEffectMove({...event,target,effect},moveEvent);
        if(landedMove){
          this.recordFieldAbilitySuppression(state,turn);
          this.recordMoveAbilityBypass(state,turn,landedMove);
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
    if(event?.type==='-start'){
      const parts=String(event.raw||'').split('|').filter(Boolean);
      const target=event.target||parts[1]||'';
      const effect=event.effect||parts[2]||'';
      if(target&&effect){
        const state=this.ensureState(target);
        const moveEvent=[...this.turnMoves].reverse().find(x=>x.species&&state.slot!==x.slot);
        const landedMove=this.startEffectMove({...event,target,effect},moveEvent);
        if(landedMove){
          this.recordFieldAbilitySuppression(state,turn);
          this.recordMoveAbilityBypass(state,turn,landedMove);
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
        const state=this.ensureState(target);
        this.clearAbilitySuppression(state,effect);
        if(this.startEffectName(effect)==='Neutralizing Gas')this.clearFieldAbilitySuppression(state?.slot);
      }
      return originalExtractEvidence.call(this,event,turn);
    }
    return originalExtractEvidence.call(this,event,turn);
  };
})();
