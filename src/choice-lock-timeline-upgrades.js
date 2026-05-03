(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const originalBuild=typeof buildDetectiveRead==='function'
    ? buildDetectiveRead
    : (root.buildDetectiveRead||host.buildDetectiveRead);
  if(typeof originalBuild!=='function'||originalBuild.__choiceLockTimelinePatch)return;

  const CHOICE_ITEMS=new Set(['Choice Band','Choice Specs','Choice Scarf']);

  function itemName(value=''){
    return String(value||'').trim();
  }

  function isChoiceItem(value=''){
    return CHOICE_ITEMS.has(itemName(value));
  }

  function clearsHistoricalChoiceLock(input={}){
    if(!input?.choiceContradiction||!input?.itemGone)return false;
    const removed=itemName(input.removedItem);
    const revealed=itemName(input.revealedItem);
    return isChoiceItem(removed)||isChoiceItem(revealed);
  }

  function choiceTimelineNote(input={}){
    const removed=itemName(input.removedItem)||itemName(input.revealedItem)||'the old Choice item';
    return `The earlier move-change contradiction only kills ${removed} as the old item line. Once that Choice item left the slot, it no longer constrains the current item state by itself.`;
  }

  function uniqueNotes(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }

  function patchedBuildDetectiveRead(input={}){
    const clearHistoricalLock=clearsHistoricalChoiceLock(input);
    const nextInput=clearHistoricalLock
      ? {...input,choiceContradiction:false,clearedHistoricalChoiceLock:true}
      : input;
    const read=originalBuild(nextInput);
    if(!clearHistoricalLock||!read)return read;
    const note=choiceTimelineNote(input);
    if(read.input)read.input.clearedHistoricalChoiceLock=true;
    if(read.summary){
      read.summary.notes=uniqueNotes([...(read.summary.notes||[]),note]);
    }
    return read;
  }

  patchedBuildDetectiveRead.__choiceLockTimelinePatch=true;
  patchedBuildDetectiveRead.__choiceLockTimelineOriginal=originalBuild;
  root.buildDetectiveRead=patchedBuildDetectiveRead;
  if(typeof globalThis!=='undefined')globalThis.buildDetectiveRead=patchedBuildDetectiveRead;
})();
