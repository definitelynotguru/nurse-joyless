(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const DexRef=typeof DexAdapter!=='undefined'?DexAdapter:(root.DexAdapter||host.DexAdapter);
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  if(!DexRef)return;

  const EXTRA_SPECIES={
    'Kommo-o':{
      name:'Kommo-o',
      types:['Dragon','Fighting'],
      baseStats:[75,110,125,100,105,85],
      abilities:{0:'Bulletproof',1:'Soundproof',H:'Overcoat'}
    },
    Brambleghast:{
      name:'Brambleghast',
      types:['Grass','Ghost'],
      baseStats:[55,115,70,80,70,90],
      abilities:{0:'Wind Rider'}
    }
  };
  const EXTRA_MOVES={
    'Hyper Voice':['Normal','Special',90,100],
    'Aura Sphere':['Fighting','Special',80,100],
    Boomburst:['Normal','Special',140,100],
    'Echoed Voice':['Normal','Special',40,100],
    'Sparkling Aria':['Water','Special',90,100],
    Round:['Normal','Special',60,100],
    'Relic Song':['Normal','Special',75,100],
    'Electro Ball':['Electric','Special',1,100],
    'Mist Ball':['Psychic','Special',70,100],
    'Fairy Wind':['Fairy','Special',40,100],
    'Ominous Wind':['Ghost','Special',60,100],
    'Petal Blizzard':['Grass','Physical',90,100],
    'Razor Wind':['Normal','Special',80,100],
    'Sandsear Storm':['Ground','Special',100,80],
    'Wildbolt Storm':['Electric','Special',100,80]
  };
  const SOUND_MOVES=new Set(['Boomburst','Bug Buzz','Clanging Scales','Echoed Voice','Hyper Voice','Overdrive','Parting Shot','Relic Song','Roar','Round','Snarl','Sparkling Aria','Torch Song']);
  const BALL_OR_BOMB_MOVES=new Set(['Aura Sphere','Electro Ball','Energy Ball','Focus Blast','Gyro Ball','Magnet Bomb','Mist Ball','Mud Bomb','Pyro Ball','Seed Bomb','Shadow Ball','Sludge Bomb','Weather Ball']);
  const WIND_MOVES=new Set(['Air Slash','Bleakwind Storm','Defog','Fairy Wind','Heat Wave','Hurricane','Icy Wind','Ominous Wind','Petal Blizzard','Razor Wind','Sandsear Storm','Tailwind','Twister','Whirlwind','Wildbolt Storm']);
  const POWDER_MOVES=new Set(['Cotton Spore','Poison Powder','Powder','Sleep Powder','Spore','Stun Spore']);
  const EXTRA_SPECIES_BY_ID=Object.fromEntries(
    Object.entries(EXTRA_SPECIES).map(([name,data])=>[DexRef.id?DexRef.id(name):String(name||'').toLowerCase(),data])
  );

  function moveName(move=''){
    return DexRef.resolveMoveName?DexRef.resolveMoveName(move):String(move||'').trim();
  }
  function isSoundMove(move=''){return SOUND_MOVES.has(moveName(move))}
  function isBallOrBombMove(move=''){return BALL_OR_BOMB_MOVES.has(moveName(move))}
  function isWindMove(move=''){return WIND_MOVES.has(moveName(move))}
  function isPowderMove(move=''){return POWDER_MOVES.has(moveName(move))}
  function addUnique(list=[]){return [...new Set((list||[]).filter(Boolean))]}
  function moveSpecificImmunityAbility(ability='', move=''){
    const name=String(ability||'').trim();
    if(name==='Soundproof'&&isSoundMove(move))return 'Soundproof';
    if(name==='Bulletproof'&&isBallOrBombMove(move))return 'Bulletproof';
    if(name==='Wind Rider'&&isWindMove(move))return 'Wind Rider';
    if(name==='Overcoat'&&isPowderMove(move))return 'Overcoat';
    return '';
  }
  function detectiveAbilityPool(species=''){
    if(typeof detectiveAbilities==='function')return detectiveAbilities(species)||[];
    const data=DexRef.getSpecies?DexRef.getSpecies(species):null;
    return data?.abilities?Object.values(data.abilities).filter(Boolean):[];
  }
  function abilityBypassMode(ability=''){
    const name=String(ability||'').trim();
    if(['Mold Breaker','Teravolt','Turboblaze'].includes(name))return 'all';
    if(name==='Mycelium Might')return 'status';
    return '';
  }
  function moveCategoryValue(move=''){
    if(typeof moveCategory==='function')return String(moveCategory(move)||'');
    if(typeof moveMeta==='function')return String(moveMeta(move)?.[1]||'');
    return '';
  }
  function attackerBypassesMoveImmunity(ability='', move=''){
    const mode=abilityBypassMode(ability);
    if(mode==='all')return true;
    if(mode==='status')return moveCategoryValue(move)==='Status';
    return false;
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

  if(typeof REPLAY_MOVE_HINTS!=='undefined'){
    REPLAY_MOVE_HINTS['Hyper Voice']=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Aura Sphere']=['Fighting','Special',0];
    REPLAY_MOVE_HINTS.Boomburst=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Echoed Voice']=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Sparkling Aria']=['Water','Special',0];
    REPLAY_MOVE_HINTS.Round=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Relic Song']=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Electro Ball']=['Electric','Special',0];
    REPLAY_MOVE_HINTS['Mist Ball']=['Psychic','Special',0];
    REPLAY_MOVE_HINTS['Fairy Wind']=['Fairy','Special',0];
    REPLAY_MOVE_HINTS['Ominous Wind']=['Ghost','Special',0];
    REPLAY_MOVE_HINTS['Petal Blizzard']=['Grass','Physical',0];
    REPLAY_MOVE_HINTS['Razor Wind']=['Normal','Special',0];
    REPLAY_MOVE_HINTS['Sandsear Storm']=['Ground','Special',0];
    REPLAY_MOVE_HINTS['Wildbolt Storm']=['Electric','Special',0];
  }

  if(typeof moveBlockingAbility==='function'){
    const originalMoveBlockingAbility=moveBlockingAbility;
    moveBlockingAbility=function patchedMoveBlockingAbility(moveType, category, ability, move=''){
      const blocker=moveSpecificImmunityAbility(ability,move);
      if(blocker)return blocker;
      return originalMoveBlockingAbility(moveType,category,ability);
    };
  }

  if(typeof dmg==='function'){
    const originalDmg=dmg;
    dmg=function patchedDmg(att, def, mv, opt={}){
      const roll=originalDmg(att,def,mv,opt);
      const blocker=moveBlockingAbility(roll.moveType,roll.move?.[1],roll.def?.ability,mv);
      if(!blocker||attackerBypassesMoveImmunity(roll.att?.ability,mv))return roll;
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
    if(ability==='Soundproof')return 'immunity to sound-based moves';
    if(ability==='Bulletproof')return 'immunity to ball and bomb moves';
    if(ability==='Wind Rider')return 'wind immunity plus an Attack boost';
    if(ability==='Overcoat')return 'immunity to powder-based moves and weather chip';
    return originalAbilityRewardText.call(this,ability);
  };

  const originalAbilityTriggeredByMove=proto.abilityTriggeredByMove;
  proto.abilityTriggeredByMove=function patchedAbilityTriggeredByMove(ability, move=''){
    if(ability==='Soundproof')return isSoundMove(move);
    if(ability==='Bulletproof')return isBallOrBombMove(move);
    if(ability==='Wind Rider')return isWindMove(move);
    if(ability==='Overcoat')return isPowderMove(move);
    return originalAbilityTriggeredByMove.call(this,ability,move);
  };

  const originalAbilityClueLabel=proto.abilityClueLabel;
  proto.abilityClueLabel=function patchedAbilityClueLabel(ability, move=''){
    if(!move||!this.abilityTriggeredByMove(ability,move))return originalAbilityClueLabel.call(this,ability,move);
    if(ability==='Wind Rider')return `${ability} activated on ${move}`;
    if(['Soundproof','Bulletproof','Overcoat'].includes(ability))return `${ability} blocked ${move}`;
    return originalAbilityClueLabel.call(this,ability,move);
  };

  if(typeof proto.abilityClueLabelWithProof==='function'){
    const originalAbilityClueLabelWithProof=proto.abilityClueLabelWithProof;
    proto.abilityClueLabelWithProof=function patchedAbilityClueLabelWithProof(ability, move='', assumeTriggered=false){
      if(move&&(assumeTriggered||this.abilityTriggeredByMove(ability,move))){
        if(ability==='Wind Rider')return `${ability} activated on ${move}`;
        if(['Soundproof','Bulletproof','Overcoat'].includes(ability))return `${ability} blocked ${move}`;
      }
      return originalAbilityClueLabelWithProof.call(this,ability,move,assumeTriggered);
    };
  }

  if(typeof proto.reactiveAbilityProof==='function'){
    const originalReactiveAbilityProof=proto.reactiveAbilityProof;
    proto.reactiveAbilityProof=function patchedReactiveAbilityProof(ability){
      return ['Soundproof','Bulletproof','Wind Rider','Overcoat'].includes(ability)||originalReactiveAbilityProof.call(this,ability);
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
      const extra=detectiveAbilityPool(state?.species).filter(ability=>moveSpecificImmunityAbility(ability,moveNameValue));
      return addUnique([...base,...extra]);
    };
  }

  if(typeof proto.moveContradictionNote==='function'){
    const originalMoveContradictionNote=proto.moveContradictionNote;
    proto.moveContradictionNote=function patchedMoveContradictionNote(state, move=''){
      const moveNameValue=String(move||'').trim();
      const abilities=this.moveBlockedAbilities(state,moveNameValue)||[];
      if(moveNameValue&&abilities.length){
        return `${moveNameValue} successfully landed, so ${this.joinWithOr(abilities)} impossible as the current ability.`;
      }
      return originalMoveContradictionNote.call(this,state,move);
    };
  }
})();