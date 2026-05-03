(function(){
  const root=typeof window!=='undefined'?window:globalThis;
  const host=typeof globalThis!=='undefined'?globalThis:root;
  const originalBuild=typeof buildDetectiveRead==='function'
    ? buildDetectiveRead
    : (root.buildDetectiveRead||host.buildDetectiveRead);
  const ReplayParserRef=typeof ReplayParser!=='undefined'?ReplayParser:(root.ReplayParser||host.ReplayParser);
  const proto=ReplayParserRef?.prototype;
  if(typeof originalBuild!=='function'&& !proto)return;

  const CHOICE_ITEMS=new Set(['Choice Band','Choice Specs','Choice Scarf']);
  const TRANSFER_MOVES=new Set(['Trick','Switcheroo']);

  function itemName(value=''){
    return String(value||'').trim();
  }

  function isChoiceItem(value=''){
    return CHOICE_ITEMS.has(itemName(value));
  }

  function transferMoveName(event={}){
    const raw=String(event?.raw||'');
    const rawFrom=raw
      .split('|')
      .filter(Boolean)
      .find(part=>part.startsWith('[from]'))
      ?.replace('[from] ','')||'';
    const from=String(event?.from||rawFrom).trim();
    const move=from.match(/^move: (.+)$/)?.[1]||'';
    return TRANSFER_MOVES.has(move)?move:'';
  }

  function transferredItemName(event={}){
    const rawParts=String(event?.raw||'').split('|').filter(Boolean);
    return itemName(event?.item||rawParts[2]||'');
  }

  function currentTransferredItem(input={}){
    return itemName(input?.acquiredItem||input?.currentTransferredItem||'');
  }

  function transferredChoiceLockShouldClear(input={}){
    const gained=currentTransferredItem(input);
    if(!input?.choiceContradiction||!gained||isChoiceItem(gained))return false;
    return isChoiceItem(input?.removedItem)||isChoiceItem(input?.revealedItem);
  }

  function transferTimelineNote(input={}){
    const move=itemName(input?.itemTransferMove)||'Trick';
    const removed=itemName(input?.removedItem)||'the old item';
    const gained=currentTransferredItem(input)||itemName(input?.revealedItem)||'the new item';
    return `${move} swapped away ${removed} and revealed ${gained} as the current item, so the detective now treats the received item as live instead of leaving the slot stuck on the old timeline.`;
  }

  function uniqueNotes(list=[]){
    return [...new Set((list||[]).filter(Boolean))];
  }

  function addTransferReadNote(read,input){
    if(!read?.summary)return;
    read.summary.notes=uniqueNotes([...(read.summary.notes||[]),transferTimelineNote(input)]);
  }

  if(typeof originalBuild==='function'&&!originalBuild.__itemTransferTimelinePatch){
    function patchedBuildDetectiveRead(input={}){
      const gained=currentTransferredItem(input);
      const clearHistoricalChoice=transferredChoiceLockShouldClear(input);
      const nextInput=gained
        ? {
            ...input,
            revealedItem:gained,
            itemGone:false,
            ...(clearHistoricalChoice?{choiceContradiction:false,clearedHistoricalChoiceLock:true}:null)
          }
        : input;
      const read=originalBuild(nextInput);
      if(!gained||!read)return read;
      if(read.input){
        read.input.revealedItem=gained;
        read.input.itemGone=false;
        read.input.currentTransferredItem=gained;
        if(clearHistoricalChoice)read.input.clearedHistoricalChoiceLock=true;
      }
      addTransferReadNote(read,input);
      return read;
    }

    patchedBuildDetectiveRead.__itemTransferTimelinePatch=true;
    patchedBuildDetectiveRead.__itemTransferTimelineOriginal=originalBuild;
    root.buildDetectiveRead=patchedBuildDetectiveRead;
    if(typeof globalThis!=='undefined')globalThis.buildDetectiveRead=patchedBuildDetectiveRead;
  }

  if(!proto||proto.__itemTransferTimelinePatch)return;
  const originalExtractEvidence=proto.extractEvidence;

  proto.extractEvidence=function patchedExtractEvidence(event,turn){
    const result=originalExtractEvidence.call(this,event,turn);
    const move=transferMoveName(event);
    if(!move||!event?.target)return result;
    const state=this.ensureState?.(event.target,event.details);
    const item=transferredItemName(event);
    if(!state||!item)return result;
    if(event.type==='-enditem'){
      state.removedItem=item;
      state.itemGone=true;
      state.itemTransferMove=move;
      state.lastTransferredOutItem=item;
    }else if(event.type==='-item'){
      state.acquiredItem=item;
      state.revealedItem=item;
      state.itemGone=false;
      state.itemTransferMove=move;
      if(typeof this.addEvidence==='function'){
        this.addEvidence(state,turn||0,'reveal',`${state.species} received ${item} from ${move}`,'Transferred item confirmed',4,{hard:true,revealedItem:item});
      }
      if(typeof this.addClueObservation==='function'){
        this.addClueObservation(state,{turn:turn||0,label:`${move} revealed ${item} as the new item`});
      }
    }
    return result;
  };

  proto.__itemTransferTimelinePatch=true;
})();