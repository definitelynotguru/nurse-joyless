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
    'Aura Sphere':['Fighting','Special',80,100]
  };
  const SOUND_MOVES=new Set(['Bug Buzz','Clanging Scales','Hyper Voice','Overdrive','Parting Shot','Roar','Snarl','Torch Song']);
  const BALL_OR_BOMB_MOVES=new Set(['Aura Sphere','Energy Ball','Focus Blast','Gyro Ball','Magnet Bomb','Mud Bomb','Pyro Ball','Seed Bomb','Shadow Ball','Sludge Bomb','Weather Ball']);
  const WIND_MOVES=new Set(['Air Slash','Bleakwind Storm','Defog','Heat Wave','Hurricane','Icy Wind','Tailwind','Twister','Whirlwind']);
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
  }

  if(typeof moveBlockingAbility==='function'){
    const originalMoveBlockingAbility=moveBlockingAbility;
    moveBlockingAbility=function patchedMoveBlockingAbility(moveType, category, ability, move=''){
      const name=String(ability||'').trim();
      if(name==='Soundproof'&&isSoundMove(move))return 'Soundproof';
      if(name==='Bulletproof'&&isBallOrBombMove(move))return 'Bulletproof';
      if(name==='Wind Rider'&&isWindMove(move))return 'Wind Rider';
      return originalMoveBlockingAbility(moveType,category,ability);
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
})();
