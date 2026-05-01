(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Sun Room':30,'Trick Room Offense':24,'Hazard Stack Fat Balance':22,'Dragon Spam Offense':20,'Rain Offense':18,'Sun Offense':16,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};

  function offensiveTypes(mon){
    if(typeof root.offensiveMoveTypes==='function')return root.offensiveMoveTypes(mon)||[];
    return [];
  }

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function weatherTension(profile){
    return {
      mixedWeatherPenalty:profile?.weatherConflict?30:0,
      rainFirePenalty:Math.max(0,(profile?.fireTypes||[]).length-1)*8,
      sunWaterPenalty:Math.max(0,(profile?.waterTypes||[]).length-2)*6,
    };
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
    profile.fireAttackers=teamList.filter(mon=>offensiveTypes(mon).includes('Fire')).map(mon=>mon.species);
    profile.waterAttackers=teamList.filter(mon=>offensiveTypes(mon).includes('Water')).map(mon=>mon.species);
    profile.rainSpeedAbusers=teamList.filter(mon=>String(mon?.ability||'').trim()==='Swift Swim').map(mon=>mon.species);
    profile.sunPayoffAttackers=teamList.filter(mon=>{
      const ability=String(mon?.ability||'').trim();
      if(['Chlorophyll','Solar Power'].includes(ability))return true;
      if(hasAnyMove(mon,['Weather Ball','Solar Beam','Solar Blade']))return true;
      return ability==='Protosynthesis'&&(offensiveTypes(mon).includes('Fire')||hasAnyMove(mon,['Hydro Steam']));
    }).map(mon=>mon.species);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!profile?.weatherConflict&&!shallowRainShell(profile)&&!shallowSunShell(profile))return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const {mixedWeatherPenalty,rainFirePenalty,sunWaterPenalty}=weatherTension(profile);
    const shallowRainShellPenalty=shallowRainPenalty(profile);
    const shallowSunShellPenalty=shallowSunPenalty(profile);
    const rain=rows.find(row=>row.name==='Rain Offense');
    const sun=rows.find(row=>row.name==='Sun Offense');
    const sunRoom=rows.find(row=>row.name==='Sun Room');

    if(rain){
      rain.score=root.njCap((rain.score||0)-mixedWeatherPenalty-rainFirePenalty-shallowRainShellPenalty,96);
      if(profile.weatherConflict)addEvidence(rain,'conflicting rain and sun setters');
      if(rainFirePenalty)addEvidence(rain,`${(profile.fireTypes||[]).length} Fire-type member(s) pulling against rain`);
      if(shallowRainShell(profile)){
        addEvidence(rain,'fire-heavy shell undercuts rain turns');
        if(!(profile.rainSpeedAbusers||[]).length){
          addEvidence(rain,'no Swift Swim payoff to justify the rain slot');
        }
      }
    }
    if(sun){
      sun.score=root.njCap((sun.score||0)-mixedWeatherPenalty-sunWaterPenalty-shallowSunShellPenalty,92);
      if(profile.weatherConflict)addEvidence(sun,'conflicting rain and sun setters');
      if(shallowSunShell(profile)){
        addEvidence(sun,'water-heavy shell undercuts sun turns');
        if((profile.sunPayoffAttackers||[]).length<=1){
          addEvidence(sun,'too few dedicated sun payoffs to justify Drought');
        }
      }
    }
    if(sunRoom){
      sunRoom.score=root.njCap((sunRoom.score||0)-mixedWeatherPenalty-sunWaterPenalty-shallowSunShellPenalty,96);
      if(profile.weatherConflict)addEvidence(sunRoom,'conflicting rain and sun setters');
      if(shallowSunShell(profile))addEvidence(sunRoom,'water-heavy shell undercuts sun turns');
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
    const next={
      ...synergy,
      scores:{...(synergy?.scores||{})},
      issues:[...(synergy?.issues||[])],
    };

    if(profile?.weatherConflict){
      next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-12,94);
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-12,92);
      if(!next.issues.some(issue=>issue?.title==='Conflicting weather plan')){
        next.issues.push({
          severity:'bad',
          title:'Conflicting weather plan',
          detail:'Rain and sun setters fight each other, so the team often boosts the wrong attackers or weakens its own damage plan.'
        });
      }
    }

    if(shallowRainShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      if(!next.issues.some(issue=>issue?.title==='Rain plan clashes with Fire core')){
        next.issues.push({
          severity:'bad',
          title:'Rain plan clashes with Fire core',
          detail:'Pelipper is creating rain turns for a roster that is still mostly trying to click Fire attacks, so the weather slot is not producing a coherent closing plan.'
        });
      }
    }
    if(shallowSunShell(profile)){
      next.scores.winReliability=root.njCap((next.scores.winReliability||0)-8,92);
      if(!next.issues.some(issue=>issue?.title==='Sun plan clashes with Water core')){
        next.issues.push({
          severity:'bad',
          title:'Sun plan clashes with Water core',
          detail:'Drought is supporting a roster that is still mostly trying to click Water attacks, so the weather slot is not producing a coherent closing plan.'
        });
      }
    }
    return next;
  };
})();
