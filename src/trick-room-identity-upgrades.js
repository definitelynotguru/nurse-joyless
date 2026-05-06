(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  if(typeof root.profileTeam!=='function'||typeof root.detectIdentities!=='function'||typeof root.evaluateSynergy!=='function')return;

  const originalProfileTeam=root.profileTeam;
  const originalDetectIdentities=root.detectIdentities;
  const originalEvaluateSynergy=root.evaluateSynergy;
  const priority={'Sun Room':30,'Trick Room Offense':24,'Balance':12,'Bulky Offense':10,'Hyper Offense':8,'Stall':4};
  const TRICK_ROOM_MOVES=['Trick Room'];
  const HANDOFF_MOVES=['Teleport','U-turn','Volt Switch','Flip Turn','Parting Shot','Memento','Healing Wish','Lunar Dance','Baton Pass','Chilly Reception','Explosion','Final Gambit'];
  const ROOM_SERVICE_ITEM='Room Service';

  function hasAnyMove(mon,names=[]){
    const wanted=new Set((Array.isArray(names)?names:[]).map(name=>String(name||'').trim()).filter(Boolean));
    if(!wanted.size)return false;
    return (Array.isArray(mon?.moves)?mon.moves:[]).some(move=>wanted.has(String(move||'').trim()));
  }

  function overlap(values=[],otherValues=[]){
    const wanted=new Set((otherValues||[]).map(value=>String(value||'').trim()).filter(Boolean));
    return root.unique((values||[]).filter(value=>wanted.has(String(value||'').trim())));
  }

  function highestAttackStat(mon){
    return Math.max(Number(mon?.baseStats?.atk)||0,Number(mon?.baseStats?.spa)||0);
  }

  function baseSpeed(mon){
    return Number(mon?.baseStats?.spe)||0;
  }

  function offensiveTypeCount(mon){
    return Array.isArray(mon?.offensiveTypes)?mon.offensiveTypes.length:0;
  }

  function isTrickRoomSetter(mon){
    return hasAnyMove(mon,TRICK_ROOM_MOVES);
  }

  function isRoomAbuser(mon){
    if(String(mon?.item||'').trim()===ROOM_SERVICE_ITEM)return true;
    const speed=baseSpeed(mon);
    const power=highestAttackStat(mon);
    return speed<=70&&(power>=105||offensiveTypeCount(mon)>=2);
  }

  function isFastPressure(mon){
    return baseSpeed(mon)>=85&&highestAttackStat(mon)>=100;
  }

  function trickRoomHandoffSetters(teamList=[]){
    return teamList.filter(mon=>isTrickRoomSetter(mon)&&hasAnyMove(mon,HANDOFF_MOVES)).map(mon=>mon.species);
  }

  function singleSetterFragileTrickRoomShell(profile){
    const setters=(profile?.trickRoomSetters||[]).length;
    const abusers=(profile?.trickRoomAbusers||[]).length;
    const externalAbusers=(profile?.trickRoomExternalAbusers||[]).length;
    const handoffSetters=(profile?.trickRoomHandoffSetters||[]).length;
    const selfSufficientSetters=(profile?.trickRoomSelfSufficientSetters||[]).length;
    const fastPressure=(profile?.trickRoomFastPressure||[]).length;
    return setters===1
      && abusers>=2
      && externalAbusers>=2
      && !handoffSetters
      && !selfSufficientSetters
      && fastPressure>=2;
  }

  function fragileTrickRoomPenalty(profile){
    if(!singleSetterFragileTrickRoomShell(profile))return 0;
    const fastPressure=(profile?.trickRoomFastPressure||[]).length;
    const abusers=(profile?.trickRoomAbusers||[]).length;
    return 14+Math.max(0,fastPressure-2)*3+Math.max(0,abusers-2)*2;
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
    profile.trickRoomSetters=teamList.filter(isTrickRoomSetter).map(mon=>mon.species);
    profile.trickRoomAbusers=teamList.filter(isRoomAbuser).map(mon=>mon.species);
    profile.trickRoomExternalAbusers=(profile?.trickRoomAbusers||[]).filter(species=>!(profile?.trickRoomSetters||[]).includes(species));
    profile.trickRoomHandoffSetters=trickRoomHandoffSetters(teamList);
    profile.trickRoomSelfSufficientSetters=overlap(profile.trickRoomSetters,profile.trickRoomAbusers);
    profile.trickRoomFastPressure=teamList.filter(mon=>isFastPressure(mon)&&!isTrickRoomSetter(mon)).map(mon=>mon.species);
    return profile;
  };

  root.detectIdentities=function patchedDetectIdentities(t=root.team,a=root.analysis,p=root.profileTeam(t,a)){
    const profile=p||root.profileTeam(t,a);
    const result=originalDetectIdentities.call(this,t,a,profile);
    if(!singleSetterFragileTrickRoomShell(profile))return result;

    const rows=(result?.all||[]).map(cloneIdentityRow);
    const trickRoom=rows.find(row=>row.name==='Trick Room Offense');
    const sunRoom=rows.find(row=>row.name==='Sun Room');

    if(trickRoom){
      trickRoom.score=root.njCap((trickRoom.score||0)-fragileTrickRoomPenalty(profile),96);
      addEvidence(trickRoom,'the lone Trick Room setter cannot hand the room turns cleanly into the breaker core');
      addEvidence(trickRoom,'one passive Trick Room slot is carrying too much of the speed-control burden by itself');
      addEvidence(trickRoom,'too much of the remaining pressure still plays at normal speed instead of truly cashing the room turns');
    }
    if(sunRoom){
      sunRoom.score=root.njCap((sunRoom.score||0)-Math.max(0,fragileTrickRoomPenalty(profile)-4),96);
      addEvidence(sunRoom,'the lone Trick Room setter cannot hand the room turns cleanly into the breaker core');
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
    if(!singleSetterFragileTrickRoomShell(profile))return synergy;

    const next={...synergy,scores:{...(synergy?.scores||{})},issues:[...(synergy?.issues||[])]};
    next.scores.winReliability=root.njCap((next.scores.winReliability||0)-6,92);
    next.scores.speedControl=root.njCap((next.scores.speedControl||0)-7,92);
    next.scores.roleCompression=root.njCap((next.scores.roleCompression||0)-4,92);
    if(!next.issues.some(issue=>issue?.title==='Single Trick Room setter cannot hand turns off cleanly')){
      next.issues.push({
        severity:'bad',
        title:'Single Trick Room setter cannot hand turns off cleanly',
        detail:'The team has some slow breakers on paper, but one passive Trick Room slot is carrying the whole plan alone. Without pivot, sacrifice, or self-contained pressure from that setter, too many room turns disappear before the abusers can actually convert them.'
      });
    }
    return next;
  };
})();