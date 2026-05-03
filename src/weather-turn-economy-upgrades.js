(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Sun Room':30,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const RAIN_SETTER_MOVES=['Rain Dance'];
  const SUN_SETTER_MOVES=['Sunny Day'];
  const HANDOFF_MOVES=['U-turn','Volt Switch','Flip Turn','Parting Shot','Teleport','Memento','Healing Wish','Baton Pass','Chilly Reception'];

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function overlap(values=[],otherValues=[]){
    const wanted=new Set((otherValues||[]).map(value=>String(value||'').trim()).filter(Boolean));
    return root.unique((values||[]).filter(value=>wanted.has(String(value||'').trim())));
  }

  function weatherHandoffSetters(teamList=[],setterMoves=[]){
    return teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      const isSetter=(setterMoves===RAIN_SETTER_MOVES&&ability==='Drizzle')
        || (setterMoves===SUN_SETTER_MOVES&&ability==='Drought')
        || hasAnyMove(mon,setterMoves);
      return isSetter&&hasAnyMove(mon,HANDOFF_MOVES);
    }).map(mon=>mon.species);
  }

  function slowManualRainHandoffShell(profile){
    if(profile?.drizzle?.length||profile?.weatherConflict)return false;
    const setters=(profile?.rainSetters||[]).length;
    const dedicatedPayoffs=(profile?.rainDedicatedPayoffs||[]).length;
    const externalPayoffs=(profile?.rainExternalPayoffs||[]).length;
    const handoffSetters=(profile?.rainHandoffSetters||[]).length;
    const selfSufficientSetters=(profile?.rainSelfSufficientSetters||[]).length;
    return setters>=2
      && dedicatedPayoffs>=2
      && externalPayoffs>=2
      && !((profile?.rainSetters||[]).length>=2&&dedicatedPayoffs<=Math.max(2,setters)&&(profile?.waterAttackers||[]).length<=1&&(profile?.rainSpeedAbusers||[]).length===0)
      && !((profile?.rainSetters||[]).length>=2&&externalPayoffs<setters&&(profile?.waterAttackers||[]).length<=1&&(profile?.rainSpeedAbusers||[]).length===0)
      && (handoffSetters+selfSufficientSetters)<setters;
  }

  function slowManualRainHandoffPenalty(profile){
    if(!slowManualRainHandoffShell(profile))return 0;
    const setters=(profile?.rainSetters||[]).length;
    return 16+Math.max(0,setters-2)*3;
  }

  function slowManualSunHandoffShell(profile){
    if(profile?.drought?.length||profile?.weatherConflict)return false;
    const setters=(profile?.sunSetters||[]).length;
    const dedicatedPayoffs=(profile?.sunDedicatedPayoffs||[]).length;
    const externalPayoffs=(profile?.sunExternalPayoffs||[]).length;
    const handoffSetters=(profile?.sunHandoffSetters||[]).length;
    const selfSufficientSetters=(profile?.sunSelfSufficientSetters||[]).length;
    return setters>=2
      && dedicatedPayoffs>=2
      && externalPayoffs>=2
      && !((profile?.sunSetters||[]).length>=2&&dedicatedPayoffs<=Math.max(2,setters)&&(profile?.waterAttackers||[]).length>=1)
      && !((profile?.sunSetters||[]).length>=2&&externalPayoffs<setters&&(profile?.waterAttackers||[]).length>=1)
      && (handoffSetters+selfSufficientSetters)<setters;
  }

  function slowManualSunHandoffPenalty(profile){
    if(!slowManualSunHandoffShell(profile))return 0;
    const setters=(profile?.sunSetters||[]).length;
    return 14+Math.max(0,setters-2)*3;
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
    profile.rainHandoffSetters=weatherHandoffSetters(teamList,RAIN_SETTER_MOVES);
    profile.rainSelfSufficientSetters=overlap(profile.rainSetters,profile.rainDedicatedPayoffs);
    profile.sunHandoffSetters=weatherHandoffSetters(teamList,SUN_SETTER_MOVES);
    profile.sunSelfSufficientSetters=overlap(profile.sunSetters,profile.sunDedicatedPayoffs);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!slowManualRainHandoffShell(profile)&&!slowManualSunHandoffShell(profile))return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const rain=rows.find(row=>row.name==='Rain Offense');
    const sun=rows.find(row=>row.name==='Sun Offense');
    const sunRoom=rows.find(row=>row.name==='Sun Room');

    if(rain&&slowManualRainHandoffShell(profile)){
      rain.score=root.njCap((rain.score||0)-slowManualRainHandoffPenalty(profile),96);
      addEvidence(rain,'manual rain setters cannot hand weather turns cleanly into the payoff core');
      addEvidence(rain,'the weather plan loses too much tempo because the setters lack pivot or sacrifice handoff tools');
    }
    if(sun&&slowManualSunHandoffShell(profile)){
      sun.score=root.njCap((sun.score||0)-slowManualSunHandoffPenalty(profile),92);
      addEvidence(sun,'manual sun setters cannot hand weather turns cleanly into the payoff core');
      addEvidence(sun,'the weather plan loses too much tempo because the setters lack pivot or sacrifice handoff tools');
    }
    if(sunRoom&&slowManualSunHandoffShell(profile)){
      sunRoom.score=root.njCap((sunRoom.score||0)-slowManualSunHandoffPenalty(profile),96);
      addEvidence(sunRoom,'manual sun setters cannot hand weather turns cleanly into the payoff core');
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

    if(slowManualRainHandoffShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-7,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Manual rain turns are hard to hand off')){
        next.issues.push({severity:'bad',title:'Manual rain turns are hard to hand off',detail:'The team has enough nominal rain payoffs, but its Rain Dance setters do not pivot, sack, or otherwise pass the weather turn cleanly into those abusers. Too many rain turns get spent rebuilding tempo instead of cashing the reward.'});
      }
    }

    if(slowManualSunHandoffShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-6,92);
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-5,92);
      if(!next.issues.some(issue=>issue?.title==='Manual sun turns are hard to hand off')){
        next.issues.push({severity:'bad',title:'Manual sun turns are hard to hand off',detail:'The team has enough nominal sun payoffs, but its Sunny Day setters do not pivot, sack, or otherwise pass the weather turn cleanly into those abusers. Too many sun turns get spent regaining board position instead of turning weather into pressure.'});
      }
    }
    return next;
  };
})();
