(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Sun Room':30,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};

  function weatherTension(profile){
    return {
      mixedWeatherPenalty:profile?.weatherConflict?30:0,
      rainFirePenalty:Math.max(0,(profile?.fireTypes||[]).length-1)*8,
      sunWaterPenalty:Math.max(0,(profile?.waterTypes||[]).length-2)*6,
    };
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
    profile.weatherConflict=!!(profile?.drought?.length&&profile?.drizzle?.length);
    profile.fireTypes=teamList.filter(mon=>root.types(mon).includes('Fire')).map(mon=>mon.species);
    profile.waterTypes=teamList.filter(mon=>root.types(mon).includes('Water')).map(mon=>mon.species);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!profile?.weatherConflict)return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const {mixedWeatherPenalty,rainFirePenalty,sunWaterPenalty}=weatherTension(profile);
    const rain=rows.find(row=>row.name==='Rain Offense');
    const sun=rows.find(row=>row.name==='Sun Offense');
    const sunRoom=rows.find(row=>row.name==='Sun Room');

    if(rain){
      rain.score=root.njCap((rain.score||0)-mixedWeatherPenalty-rainFirePenalty,96);
      addEvidence(rain,'conflicting rain and sun setters');
      if(rainFirePenalty)addEvidence(rain,`${(profile.fireTypes||[]).length} Fire-type member(s) pulling against rain`);
    }
    if(sun){
      sun.score=root.njCap((sun.score||0)-mixedWeatherPenalty-sunWaterPenalty,92);
      addEvidence(sun,'conflicting rain and sun setters');
    }
    if(sunRoom){
      sunRoom.score=root.njCap((sunRoom.score||0)-mixedWeatherPenalty-sunWaterPenalty,96);
      addEvidence(sunRoom,'conflicting rain and sun setters');
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
    if(!profile?.weatherConflict)return synergy;

    const next={
      ...synergy,
      scores:{...(synergy?.scores||{})},
      issues:[...(synergy?.issues||[])],
    };
    next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-12,94);
    next.scores.winReliability=root.njCap((next.scores.winReliability||0)-12,92);
    if(!next.issues.some(issue=>issue?.title==='Conflicting weather plan')){
      next.issues.push({
        severity:'bad',
        title:'Conflicting weather plan',
        detail:'Rain and sun setters fight each other, so the team often boosts the wrong attackers or weakens its own damage plan.'
      });
    }
    return next;
  };
})();
