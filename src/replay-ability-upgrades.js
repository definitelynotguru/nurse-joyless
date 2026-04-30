(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(!proto)return;

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
