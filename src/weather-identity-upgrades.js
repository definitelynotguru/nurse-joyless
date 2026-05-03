(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Sun Room':30,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const SUN_MOVES=['Weather Ball','Solar Beam','Solar Blade'];
  const SUN_SETTER_MOVES=['Sunny Day'];
  const RAIN_SIGNAL_MOVES=['Hurricane','Thunder'];
  const RAIN_SETTER_MOVES=['Rain Dance'];
  const ROOM_SERVICE_ITEM='Room Service';
  const SETUP_MOVES=['Dragon Dance','Swords Dance','Nasty Plot','Calm Mind','Bulk Up','Quiver Dance','Curse'];
  const OFFENSIVE_ITEMS=['Choice Specs','Choice Band','Choice Scarf','Life Orb','Expert Belt','Booster Energy','Black Glasses','Charcoal','Flame Orb'];
  const RECOVERY_MOVES=['Recover','Roost','Soft-Boiled','Slack Off','Moonlight','Morning Sun','Shore Up','Strength Sap','Wish','Rest','Milk Drink','Synthesis','Heal Order'];
  const ATTRITION_MOVES=['Toxic','Toxic Spikes','Thunder Wave','Will-O-Wisp','Glare','Leech Seed','Salt Cure','Ruination','Whirlwind','Dragon Tail','Roar','Haze','Knock Off','Yawn','Encore'];
  const PIVOT_MOVES=['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport'];

  function offensiveTypes(mon){
    if(typeof root.offensiveMoveTypes==='function')return root.offensiveMoveTypes(mon)||[];
    return [];
  }

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function moveCount(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return 0;
    return (Array.isArray(mon?.moves)?mon.moves:[]).filter(move=>wanted.has(String(move||'').trim())).length;
  }

  function baseSpeed(mon){
    const raw=Number(mon?.baseStats?.spe);
    return Number.isFinite(raw)?raw:null;
  }

  function isOffensiveMon(mon){
    const attackStat=Math.max(Number(mon?.baseStats?.atk)||0,Number(mon?.baseStats?.spa)||0);
    return offensiveTypes(mon).length>=2||attackStat>=105;
  }

  function externalWeatherPayoffs(payoffs=[],setters=[]){
    const setterIds=new Set((setters||[]).map(name=>String(name||'').trim()).filter(Boolean));
    return root.unique((payoffs||[]).filter(name=>name&&!setterIds.has(String(name||'').trim())));
  }

  function isSlowRoomPayoff(mon){
    const speed=baseSpeed(mon);
    if(speed===null)return false;
    if(String(mon?.item||'').trim()===ROOM_SERVICE_ITEM)return true;
    return speed<=70&&isOffensiveMon(mon);
  }

  function isFastAttacker(mon){
    const speed=baseSpeed(mon);
    if(speed===null)return false;
    return speed>=85&&isOffensiveMon(mon);
  }

  function isHazardPayoffAttacker(mon){
    if(!isOffensiveMon(mon))return false;
    const item=String(mon?.item||'').trim();
    if(OFFENSIVE_ITEMS.includes(item))return true;
    if(hasAnyMove(mon,SETUP_MOVES))return true;
    return offensiveTypes(mon).length>=2;
  }

  function isHazardCloser(mon){
    if(!isHazardPayoffAttacker(mon))return false;
    const attackStat=Math.max(Number(mon?.baseStats?.atk)||0,Number(mon?.baseStats?.spa)||0);
    const item=String(mon?.item||'').trim();
    return hasAnyMove(mon,SETUP_MOVES)||OFFENSIVE_ITEMS.includes(item)||attackStat>=120;
  }

  function isStallAnchor(mon){
    const speed=baseSpeed(mon);
    const bulky=Math.max(Number(mon?.baseStats?.def)||0,Number(mon?.baseStats?.spd)||0)>=95;
    return !!mon?.isDefensiveAnchor||(bulky&&hasAnyMove(mon,RECOVERY_MOVES)&&(speed===null||speed<=90));
  }

  function isStallProgressPiece(mon){
    return hasAnyMove(mon,ATTRITION_MOVES)||hasAnyMove(mon,RECOVERY_MOVES);
  }

  function isStallCloser(mon){
    if(!isOffensiveMon(mon))return false;
    if(hasAnyMove(mon,SETUP_MOVES))return true;
    if(OFFENSIVE_ITEMS.includes(String(mon?.item||'').trim()))return true;
    return (baseSpeed(mon)||0)>=95;
  }

  function isStallPivot(mon){
    return hasAnyMove(mon,PIVOT_MOVES);
  }

  function weatherTension(profile){
    return {
      mixedWeatherPenalty:profile?.weatherConflict?30:0,
      rainFirePenalty:Math.max(0,(profile?.fireTypes||[]).length-1)*8,
      sunWaterPenalty:Math.max(0,(profile?.waterTypes||[]).length-2)*6,
    };
  }

  function fakeRainShell(profile){
    if((profile?.rainSetters||[]).length)return false;
    const fireAttackers=(profile?.fireAttackers||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    const waterTypes=(profile?.waterTypes||[]).length;
    const swiftSwim=(profile?.rainSpeedAbusers||[]).length;
    const rainSignals=(profile?.rainSignalAttackers||[]).length;
    return fireAttackers>=3&&waterAttackers<=1&&waterTypes<=1&&swiftSwim===0&&rainSignals>=2;
  }

  function fakeRainPenalty(profile){
    if(!fakeRainShell(profile))return 0;
    const fireAttackers=(profile?.fireAttackers||[]).length;
    const rainSignals=(profile?.rainSignalAttackers||[]).length;
    return 24+Math.max(0,fireAttackers-3)*4+Math.max(0,rainSignals-2)*3;
  }

  function shallowRainShell(profile){
    if(!profile?.drizzle?.length||profile?.weatherConflict)return false;
    const fireAttackers=(profile.fireAttackers||[]).length;
    const waterTypes=(profile.waterTypes||[]).length;
    const swiftSwim=(profile.rainSpeedAbusers||[]).length;
    return fireAttackers>=4&&swiftSwim===0&&waterTypes<=1;
  }

  function shallowRainPenalty(profile){
    if(!shallowRainShell(profile))return 0;
    const fireTypes=(profile.fireTypes||[]).length;
    const fireAttackers=(profile.fireAttackers||[]).length;
    const waterAttackers=(profile.waterAttackers||[]).length;
    return 22+Math.max(0,fireTypes-3)*5+Math.max(0,fireAttackers-waterAttackers)*4;
  }

  function thinManualRainShell(profile){
    if(profile?.drizzle?.length||profile?.weatherConflict)return false;
    const setters=(profile?.rainSetters||[]).length;
    const dedicatedPayoffs=(profile?.rainDedicatedPayoffs||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    const swiftSwim=(profile?.rainSpeedAbusers||[]).length;
    return setters===1&&dedicatedPayoffs<=2&&waterAttackers<=1&&swiftSwim===0;
  }

  function thinManualRainPenalty(profile){
    if(!thinManualRainShell(profile))return 0;
    const dedicatedPayoffs=(profile?.rainDedicatedPayoffs||[]).length;
    return 18+Math.max(0,2-dedicatedPayoffs)*4;
  }

  function overstretchedManualRainShell(profile){
    if(profile?.drizzle?.length||profile?.weatherConflict)return false;
    const setters=(profile?.rainSetters||[]).length;
    const dedicatedPayoffs=(profile?.rainDedicatedPayoffs||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    const swiftSwim=(profile?.rainSpeedAbusers||[]).length;
    const externalPayoffs=(profile?.rainExternalPayoffs||[]).length;
    return setters>=2&&dedicatedPayoffs<=Math.max(2,setters)&&waterAttackers<=1&&swiftSwim===0
      || setters>=2&&externalPayoffs<setters&&waterAttackers<=1&&swiftSwim===0;
  }

  function overstretchedManualRainPenalty(profile){
    if(!overstretchedManualRainShell(profile))return 0;
    const setters=(profile?.rainSetters||[]).length;
    const dedicatedPayoffs=(profile?.rainDedicatedPayoffs||[]).length;
    const externalPayoffs=(profile?.rainExternalPayoffs||[]).length;
    return 18+Math.max(0,setters-2)*4+Math.max(0,Math.max(2,setters)-dedicatedPayoffs)*4+Math.max(0,setters-externalPayoffs)*4;
  }

  function shallowSunShell(profile){
    if(!profile?.drought?.length||profile?.weatherConflict)return false;
    const waterAttackers=(profile.waterAttackers||[]).length;
    const waterTypes=(profile.waterTypes||[]).length;
    const fireAttackers=(profile.fireAttackers||[]).length;
    const sunPayoffs=(profile.sunPayoffAttackers||[]).length;
    return waterAttackers>=3&&waterTypes>=2&&fireAttackers<=2&&sunPayoffs<=1;
  }

  function shallowSunPenalty(profile){
    if(!shallowSunShell(profile))return 0;
    const waterTypes=(profile.waterTypes||[]).length;
    const waterAttackers=(profile.waterAttackers||[]).length;
    const fireAttackers=(profile.fireAttackers||[]).length;
    return 18+Math.max(0,waterTypes-3)*5+Math.max(0,waterAttackers-fireAttackers)*4;
  }

  function fakeSunShell(profile){
    if((profile?.sunSetters||[]).length)return false;
    const fireAttackers=(profile?.fireAttackers||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    const waterTypes=(profile?.waterTypes||[]).length;
    const sunSignals=(profile?.sunSignalAttackers||[]).length;
    return fireAttackers>=2&&waterAttackers<=1&&waterTypes<=1&&sunSignals>=2;
  }

  function fakeSunPenalty(profile){
    if(!fakeSunShell(profile))return 0;
    const fireAttackers=(profile?.fireAttackers||[]).length;
    const sunSignals=(profile?.sunSignalAttackers||[]).length;
    return 20+Math.max(0,fireAttackers-2)*4+Math.max(0,sunSignals-2)*3;
  }

  function thinManualSunShell(profile){
    if(profile?.drought?.length||profile?.weatherConflict)return false;
    const setters=(profile?.sunSetters||[]).length;
    const dedicatedPayoffs=(profile?.sunDedicatedPayoffs||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    return setters===1&&dedicatedPayoffs<=2&&waterAttackers>=1;
  }

  function thinManualSunPenalty(profile){
    if(!thinManualSunShell(profile))return 0;
    const dedicatedPayoffs=(profile?.sunDedicatedPayoffs||[]).length;
    return 16+Math.max(0,2-dedicatedPayoffs)*4;
  }

  function overstretchedManualSunShell(profile){
    if(profile?.drought?.length||profile?.weatherConflict)return false;
    const setters=(profile?.sunSetters||[]).length;
    const dedicatedPayoffs=(profile?.sunDedicatedPayoffs||[]).length;
    const waterAttackers=(profile?.waterAttackers||[]).length;
    const externalPayoffs=(profile?.sunExternalPayoffs||[]).length;
    return setters>=2&&dedicatedPayoffs<=Math.max(2,setters)&&waterAttackers>=1
      || setters>=2&&externalPayoffs<setters&&waterAttackers>=1;
  }

  function overstretchedManualSunPenalty(profile){
    if(!overstretchedManualSunShell(profile))return 0;
    const setters=(profile?.sunSetters||[]).length;
    const dedicatedPayoffs=(profile?.sunDedicatedPayoffs||[]).length;
    const externalPayoffs=(profile?.sunExternalPayoffs||[]).length;
    return 16+Math.max(0,setters-2)*4+Math.max(0,Math.max(2,setters)-dedicatedPayoffs)*4+Math.max(0,setters-externalPayoffs)*4;
  }

  function shallowTrickRoomShell(profile){
    const setters=(profile?.trickRoomSetters||[]).length;
    const slowPayoffs=(profile?.trickRoomPayoffs||[]).length;
    const fastAttackers=(profile?.fastAttackers||[]).length;
    return setters>=2&&slowPayoffs<=1&&fastAttackers>=3;
  }

  function shallowTrickRoomPenalty(profile){
    if(!shallowTrickRoomShell(profile))return 0;
    const setters=(profile?.trickRoomSetters||[]).length;
    const slowPayoffs=(profile?.trickRoomPayoffs||[]).length;
    const fastAttackers=(profile?.fastAttackers||[]).length;
    return 20+Math.max(0,setters-2)*4+Math.max(0,fastAttackers-2)*5+Math.max(0,1-slowPayoffs)*6;
  }

  function stagnantHazardShell(profile){
    const hazards=(profile?.hazards||[]).length;
    const layers=(profile?.layers||[]).length;
    const denial=(profile?.removalDenial||[]).length;
    const anchors=(profile?.defensiveAnchors||[]).length;
    const payoffs=(profile?.hazardPayoffAttackers||[]).length;
    return hazards>=2&&(layers>=1||denial>=1)&&anchors>=4&&payoffs<=1;
  }

  function thinHazardConversionShell(profile){
    const hazards=(profile?.hazards||[]).length;
    const layers=(profile?.layers||[]).length;
    const denial=(profile?.removalDenial||[]).length;
    const anchors=(profile?.defensiveAnchors||[]).length;
    const payoffs=(profile?.hazardPayoffAttackers||[]).length;
    const closers=(profile?.hazardClosers||[]).length;
    return hazards>=2&&(layers>=1||denial>=1)&&anchors>=4&&payoffs<=2&&closers<=1;
  }

  function stagnantHazardPenalty(profile){
    if(!stagnantHazardShell(profile))return 0;
    const anchors=(profile?.defensiveAnchors||[]).length;
    const payoffs=(profile?.hazardPayoffAttackers||[]).length;
    return 22+Math.max(0,anchors-4)*4+Math.max(0,1-payoffs)*8;
  }

  function thinHazardConversionPenalty(profile){
    if(!thinHazardConversionShell(profile)||stagnantHazardShell(profile))return 0;
    const anchors=(profile?.defensiveAnchors||[]).length;
    const payoffs=(profile?.hazardPayoffAttackers||[]).length;
    const closers=(profile?.hazardClosers||[]).length;
    return 16+Math.max(0,anchors-4)*3+Math.max(0,2-payoffs)*4+Math.max(0,1-closers)*6;
  }

  function falseStallShell(profile){
    const anchors=(profile?.stallAnchors||[]).length;
    const progress=(profile?.stallProgressPieces||[]).length;
    const closers=(profile?.stallClosers||[]).length;
    const fastAttackers=(profile?.fastAttackers||[]).length;
    const pivots=(profile?.stallPivots||[]).length;
    return anchors>=3&&progress>=3&&(closers>=2||fastAttackers>=2||(closers>=1&&pivots>=2));
  }

  function falseStallPenalty(profile){
    if(!falseStallShell(profile))return 0;
    const closers=(profile?.stallClosers||[]).length;
    const fastAttackers=(profile?.fastAttackers||[]).length;
    const pivots=(profile?.stallPivots||[]).length;
    return 18+Math.max(0,closers-2)*5+Math.max(0,fastAttackers-2)*4+Math.max(0,pivots-2)*3;
  }

  function cloneIdentityRow(row={}){
    return {...row,evidence:[...(row.evidence||[])]};
  }

  function addEvidence(row,label=''){
    const text=String(label||'').trim();
    if(!row||!text)return;
    row.evidence=root.unique([...(row.evidence||[]),text]).slice(0,5);
  }

  root.profileTeam=function patchedProfileTeam(t=root.team,a=root.analysis){
    const profile=originalProfileTeam.call(this,t,a);
    const teamList=Array.isArray(t)?t:[];
    profile.fireTypes=teamList.filter(mon=>root.types(mon).includes('Fire')).map(mon=>mon.species);
    profile.waterTypes=teamList.filter(mon=>root.types(mon).includes('Water')).map(mon=>mon.species);
    profile.fireAttackers=teamList.filter(mon=>offensiveTypes(mon).includes('Fire')).map(mon=>mon.species);
    profile.waterAttackers=teamList.filter(mon=>offensiveTypes(mon).includes('Water')).map(mon=>mon.species);
    profile.rainSpeedAbusers=teamList.filter(mon=>String(mon?.ability||'').trim()==='Swift Swim').map(mon=>mon.species);
    profile.rainSetters=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      return ability==='Drizzle'||hasAnyMove(mon,RAIN_SETTER_MOVES);
    }).map(mon=>mon.species);
    profile.rainSignalAttackers=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      if(ability==='Swift Swim')return true;
      return hasAnyMove(mon,RAIN_SIGNAL_MOVES);
    }).map(mon=>mon.species);
    profile.rainDedicatedPayoffs=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      if(ability==='Swift Swim')return true;
      if(offensiveTypes(mon).includes('Water'))return true;
      return isOffensiveMon(mon)&&!offensiveTypes(mon).includes('Fire')&&hasAnyMove(mon,RAIN_SIGNAL_MOVES);
    }).map(mon=>mon.species);
    profile.rainExternalPayoffs=externalWeatherPayoffs(profile.rainDedicatedPayoffs,profile.rainSetters);
    profile.sunSetters=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      return ability==='Drought'||hasAnyMove(mon,SUN_SETTER_MOVES);
    }).map(mon=>mon.species);
    profile.sunSignalAttackers=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      if(['Chlorophyll','Solar Power'].includes(ability))return true;
      if(hasAnyMove(mon,SUN_MOVES))return true;
      return ability==='Protosynthesis'&&(offensiveTypes(mon).includes('Fire')||hasAnyMove(mon,['Hydro Steam']));
    }).map(mon=>mon.species);
    profile.sunPayoffAttackers=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      if(['Chlorophyll','Solar Power'].includes(ability))return true;
      if(hasAnyMove(mon,SUN_MOVES))return true;
      return ability==='Protosynthesis'&&(offensiveTypes(mon).includes('Fire')||hasAnyMove(mon,['Hydro Steam']));
    }).map(mon=>mon.species);
    profile.sunDedicatedPayoffs=[...(profile.sunPayoffAttackers||[])];
    profile.sunExternalPayoffs=externalWeatherPayoffs(profile.sunDedicatedPayoffs,profile.sunSetters);
    profile.weatherConflict=!!((profile?.drought?.length||profile?.sunSetters?.length)&&(profile?.drizzle?.length||profile?.rainSetters?.length));
    profile.trickRoomSetters=teamList.filter(mon=>hasAnyMove(mon,['Trick Room'])).map(mon=>mon.species);
    profile.fastAttackers=teamList.filter(isFastAttacker).map(mon=>mon.species);
    profile.trickRoomPayoffs=teamList.filter(mon=>isSlowRoomPayoff(mon)&&!hasAnyMove(mon,['Trick Room'])).map(mon=>mon.species);
    profile.trickRoomPayoffMoves=teamList.filter(mon=>moveCount(mon,['Trick Room'])===0&&isSlowRoomPayoff(mon)).map(mon=>mon.species);
    profile.hazardPayoffAttackers=teamList.filter(isHazardPayoffAttacker).map(mon=>mon.species);
    profile.hazardClosers=teamList.filter(isHazardCloser).map(mon=>mon.species);
    profile.stallAnchors=teamList.filter(isStallAnchor).map(mon=>mon.species);
    profile.stallProgressPieces=teamList.filter(isStallProgressPiece).map(mon=>mon.species);
    profile.stallClosers=teamList.filter(isStallCloser).map(mon=>mon.species);
    profile.stallPivots=teamList.filter(isStallPivot).map(mon=>mon.species);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!profile?.weatherConflict&&!fakeRainShell(profile)&&!shallowRainShell(profile)&&!thinManualRainShell(profile)&&!overstretchedManualRainShell(profile)&&!fakeSunShell(profile)&&!shallowSunShell(profile)&&!thinManualSunShell(profile)&&!overstretchedManualSunShell(profile)&&!shallowTrickRoomShell(profile)&&!stagnantHazardShell(profile)&&!thinHazardConversionShell(profile)&&!falseStallShell(profile))return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const {mixedWeatherPenalty,rainFirePenalty,sunWaterPenalty}=weatherTension(profile);
    const fakeRainShellPenalty=fakeRainPenalty(profile);
    const shallowRainShellPenalty=shallowRainPenalty(profile);
    const thinManualRainShellPenalty=thinManualRainPenalty(profile);
    const overstretchedManualRainShellPenalty=overstretchedManualRainPenalty(profile);
    const fakeSunShellPenalty=fakeSunPenalty(profile);
    const shallowSunShellPenalty=shallowSunPenalty(profile);
    const thinManualSunShellPenalty=thinManualSunPenalty(profile);
    const overstretchedManualSunShellPenalty=overstretchedManualSunPenalty(profile);
    const shallowRoomShellPenalty=shallowTrickRoomPenalty(profile);
    const stagnantHazardShellPenalty=stagnantHazardPenalty(profile);
    const thinHazardShellPenalty=thinHazardConversionPenalty(profile);
    const falseStallShellPenalty=falseStallPenalty(profile);
    const rain=rows.find(row=>row.name==='Rain Offense');
    const sun=rows.find(row=>row.name==='Sun Offense');
    const sunRoom=rows.find(row=>row.name==='Sun Room');
    const trickRoom=rows.find(row=>row.name==='Trick Room Offense');
    const hazard=rows.find(row=>row?.name==='Hazard Stack Fat Balance');
    const stall=rows.find(row=>row?.name==='Stall');

    if(rain){
      rain.score=root.njCap((rain.score||0)-mixedWeatherPenalty-rainFirePenalty-fakeRainShellPenalty-shallowRainShellPenalty-thinManualRainShellPenalty-overstretchedManualRainShellPenalty,96);
      if(profile.weatherConflict)addEvidence(rain,'conflicting rain and sun setters');
      if(fakeRainShell(profile)){
        addEvidence(rain,'no real rain setter is present');
        addEvidence(rain,'weatherless Hurricane pressure is not a real rain plan');
      }
      if(rainFirePenalty)addEvidence(rain,`${(profile.fireTypes||[]).length} Fire-type member(s) pulling against rain`);
      if(shallowRainShell(profile)){
        addEvidence(rain,'fire-heavy shell undercuts rain turns');
        if(!(profile.rainSpeedAbusers||[]).length)addEvidence(rain,'no Swift Swim payoff to justify the rain slot');
      }
      if(thinManualRainShell(profile)){
        addEvidence(rain,'only one thin manual rain setter is carrying the weather plan');
        addEvidence(rain,'too few dedicated rain payoffs to justify the Rain Dance slot');
      }
      if(overstretchedManualRainShell(profile)){
        addEvidence(rain,'multiple manual rain setters are spending slots without enough real payoffs');
        addEvidence(rain,'the team is using extra Rain Dance support to prop up a thin rain backbone');
        addEvidence(rain,'most of the rain payoff load is still sitting on the setters themselves');
      }
    }
    if(sun){
      sun.score=root.njCap((sun.score||0)-mixedWeatherPenalty-sunWaterPenalty-fakeSunShellPenalty-shallowSunShellPenalty-thinManualSunShellPenalty-overstretchedManualSunShellPenalty,92);
      if(profile.weatherConflict)addEvidence(sun,'conflicting rain and sun setters');
      if(fakeSunShell(profile)){
        addEvidence(sun,'no real sun setter is present');
        addEvidence(sun,'weatherless solar payoffs are not a real sun plan');
      }
      if(shallowSunShell(profile)){
        addEvidence(sun,'water-heavy shell undercuts sun turns');
        if((profile.sunPayoffAttackers||[]).length<=1)addEvidence(sun,'too few dedicated sun payoffs to justify Drought');
      }
      if(thinManualSunShell(profile)){
        addEvidence(sun,'only one thin manual sun setter is carrying the weather plan');
        addEvidence(sun,'too few dedicated sun payoffs to justify the Sunny Day slot');
      }
      if(overstretchedManualSunShell(profile)){
        addEvidence(sun,'multiple manual sun setters are spending slots without enough real payoffs');
        addEvidence(sun,'the team is using extra Sunny Day support to prop up a thin sun backbone');
        addEvidence(sun,'most of the sun payoff load is still sitting on the setters themselves');
      }
    }
    if(sunRoom){
      sunRoom.score=root.njCap((sunRoom.score||0)-mixedWeatherPenalty-sunWaterPenalty-fakeSunShellPenalty-shallowSunShellPenalty-thinManualSunShellPenalty-overstretchedManualSunShellPenalty-shallowRoomShellPenalty,96);
      if(profile.weatherConflict)addEvidence(sunRoom,'conflicting rain and sun setters');
      if(fakeSunShell(profile)){
        addEvidence(sunRoom,'no real sun setter is present');
        addEvidence(sunRoom,'weatherless solar payoffs are not a real sun plan');
      }
      if(shallowSunShell(profile))addEvidence(sunRoom,'water-heavy shell undercuts sun turns');
      if(thinManualSunShell(profile))addEvidence(sunRoom,'only one thin manual sun setter is carrying the weather plan');
      if(overstretchedManualSunShell(profile)){
        addEvidence(sunRoom,'multiple manual sun setters are spending slots without enough real payoffs');
        addEvidence(sunRoom,'most of the sun payoff load is still sitting on the setters themselves');
      }
      if(shallowTrickRoomShell(profile)){
        addEvidence(sunRoom,'multiple Trick Room setters but almost no slow payoff');
        addEvidence(sunRoom,'fast attackers waste most Room turns');
      }
    }
    if(trickRoom){
      trickRoom.score=root.njCap((trickRoom.score||0)-shallowRoomShellPenalty,96);
      if(shallowTrickRoomShell(profile)){
        addEvidence(trickRoom,'multiple Trick Room setters but almost no slow payoff');
        if((profile.trickRoomPayoffs||[]).length<=1)addEvidence(trickRoom,'too few dedicated slow breakers to justify Room support');
        addEvidence(trickRoom,'fast attackers waste most Room turns');
      }
    }
    if(hazard){
      hazard.score=root.njCap((hazard.score||0)-stagnantHazardShellPenalty-thinHazardShellPenalty,94);
      if(stagnantHazardShell(profile)){
        addEvidence(hazard,'hazard shell lacks enough payoff attackers');
        addEvidence(hazard,'passive anchors make it hard to punish removal attempts');
      }else if(thinHazardConversionShell(profile)){
        addEvidence(hazard,'hazard shell leans on too few real closers');
        addEvidence(hazard,'chip plan is too thin to convert long games into a finish');
      }
    }
    if(stall){
      stall.score=root.njCap((stall.score||0)-falseStallShellPenalty,94);
      if(falseStallShell(profile)){
        addEvidence(stall,'too many proactive closers for a true stall shell');
        addEvidence(stall,'fast breakers keep this closer to balance than hard attrition');
        if((profile.stallPivots||[]).length>=2)addEvidence(stall,'multiple pivots point to a momentum shell, not pure stall');
      }
    }

    rows.sort((left,right)=>(right.score-left.score)||((priority[right.name]||0)-(priority[left.name]||0)));
    return {
      primary:rows[0],
      secondary:rows.slice(1,5).filter(row=>row.score>=35),
      all:rows,
    };
  };

  root.evaluateSynergy=function patchedEvaluateSynergy(t=root.team,a=root.analysis,p=root.profileTeam(t,a),identity=root.detectIdentities(t,a,p)){
    const profile=p||root.profileTeam(t,a);
    const synergy=originalEvaluateSynergy.call(this,t,a,profile,identity);
    const next={...synergy,scores:{...(synergy?.scores||{})},issues:[...(synergy?.issues||[])]};

    if(profile?.weatherConflict){
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-12,94);
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-12,92);
      if(!next.issues.some(issue=>issue?.title==='Conflicting weather plan')){
        next.issues.push({severity:'bad',title:'Conflicting weather plan',detail:'Rain and sun setters fight each other, so the team often boosts the wrong attackers or weakens its own damage plan.'});
      }
    }

    if(fakeRainShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-9,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      if(!next.issues.some(issue=>issue?.title==='Rain read lacks a real setter')){
        next.issues.push({severity:'bad',title:'Rain read lacks a real setter',detail:'The team borrows Hurricane-style rain signals, but it has no Drizzle or Rain Dance support, so a Rain Offense label would be describing fake weather rather than the real game plan.'});
      }
    }
    if(shallowRainShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      if(!next.issues.some(issue=>issue?.title==='Rain plan clashes with Fire core')){
        next.issues.push({severity:'bad',title:'Rain plan clashes with Fire core',detail:'Pelipper is creating rain turns for a roster that is still mostly trying to click Fire attacks, so the weather slot is not producing a coherent closing plan.'});
      }
    }
    if(thinManualRainShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Manual rain support is too thin')){
        next.issues.push({severity:'bad',title:'Manual rain support is too thin',detail:'One Rain Dance slot is doing too much work. The team does not have enough dedicated rain payoffs to treat that one manual setter as a real Rain Offense backbone.'});
      }
    }
    if(overstretchedManualRainShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      if(!next.issues.some(issue=>issue?.title==='Manual rain support is overstretched')){
        next.issues.push({severity:'bad',title:'Manual rain support is overstretched',detail:'The team is burning multiple Rain Dance slots without enough real weather conversion behind them. Too much of the rain payoff is still trapped on the setters themselves, so the setter burden is larger than the actual reward.'});
      }
    }
    if(shallowSunShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      if(!next.issues.some(issue=>issue?.title==='Sun plan clashes with Water core')){
        next.issues.push({severity:'bad',title:'Sun plan clashes with Water core',detail:'Drought is supporting a roster that is still mostly trying to click Water attacks, so the weather slot is not producing a coherent closing plan.'});
      }
    }
    if(fakeSunShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      if(!next.issues.some(issue=>issue?.title==='Sun read lacks a real setter')){
        next.issues.push({severity:'bad',title:'Sun read lacks a real setter',detail:'The team borrows Solar Beam-, Weather Ball-, or Protosynthesis-style sun signals, but it has no Drought or Sunny Day support, so a Sun Offense label would be describing fake weather rather than the real game plan.'});
      }
    }
    if(thinManualSunShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Manual sun support is too thin')){
        next.issues.push({severity:'bad',title:'Manual sun support is too thin',detail:'One Sunny Day slot is doing too much work. The team does not have enough dedicated sun payoffs to treat that one manual setter as a real Sun Offense backbone.'});
      }
    }
    if(overstretchedManualSunShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      if(!next.issues.some(issue=>issue?.title==='Manual sun support is overstretched')){
        next.issues.push({severity:'bad',title:'Manual sun support is overstretched',detail:'The team is burning multiple Sunny Day slots without enough real weather conversion behind them. Too much of the sun payoff is still trapped on the setters themselves, so the setter burden is larger than the actual reward.'});
      }
    }
    if(shallowTrickRoomShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-10,92);
      next.scores.speedControl=root.njCap((next.scores.speedControl||0)-8,92);
      if(!next.issues.some(issue=>issue?.title==='Trick Room plan lacks slow closers')){
        next.issues.push({severity:'bad',title:'Trick Room plan lacks slow closers',detail:'The team spends slots on Trick Room support, but most of the attackers are still too fast to exploit those turns, so the Room plan rarely converts into a real closing sequence.'});
      }
    }
    if(stagnantHazardShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      next.scores.offensiveCoverage=root.njCap((next.scores.offensiveCoverage||0)-10,92);
      next.scores.fieldControl=root.njCap((next.scores.fieldControl||0)-6,92);
      if(!next.issues.some(issue=>issue?.title==='Hazard plan lacks payoff attackers')){
        next.issues.push({severity:'bad',title:'Hazard plan lacks payoff attackers',detail:'The team can set hazards and sometimes deny removal, but too few attackers actually convert that chip into forced progress or a closing sequence.'});
      }
    }else if(thinHazardConversionShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.offensiveCoverage=root.njCap((next.scores.offensiveCoverage||0)-8,92);
      next.scores.fieldControl=root.njCap((next.scores.fieldControl||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Hazard plan leans on too few closers')){
        next.issues.push({severity:'bad',title:'Hazard plan leans on too few closers',detail:'The team has hazard support and one serious closer, but the rest of the shell is too passive to keep forcing progress once that single payoff line gets checked.'});
      }
    }
    if(falseStallShell(profile)){
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-6,92);
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      if(!next.issues.some(issue=>issue?.title==='Stall read overstates a balance shell')){
        next.issues.push({severity:'warn',title:'Stall read overstates a balance shell',detail:'The team has some recovery-and-status anchors, but it still leans on proactive breakers and pivot tempo too heavily to call the whole structure true stall.'});
      }
    }
    return next;
  };
})();