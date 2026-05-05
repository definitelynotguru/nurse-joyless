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
  const ITEM_TRANSFER_SOURCES=new Set([
    'move: Bestow',
    'move: Covet',
    'move: Recycle',
    'move: Refurbish',
    'move: Switcheroo',
    'move: Thief',
    'move: Trick',
    'ability: Harvest',
    'ability: Magician',
    'ability: Pickup',
    'ability: Pickpocket',
    'ability: Symbiosis'
  ]);
  const SOURCE_LABEL_OVERRIDES={
    'move: Bestow':'Bestow',
    'move: Covet':'Covet',
    'move: Recycle':'Recycle',
    'move: Refurbish':'Refurbish',
    'move: Switcheroo':'Switcheroo',
    'move: Thief':'Thief',
    'move: Trick':'Trick',
    'ability: Harvest':'Harvest',
    'ability: Magician':'Magician',
    'ability: Pickup':'Pickup',
    'ability: Pickpocket':'Pickpocket',
    'ability: Symbiosis':'Symbiosis'
  };

  function itemName(value=''){
    return String(value||'').trim();
  }

  function isChoiceItem(value=''){
    return CHOICE_ITEMS.has(itemName(value));
  }

  function normalizeSourceTag(value=''){
    return String(value||'').trim().replace(/^\[from\]\s*/,'');
  }

  function itemSourceTag(event={}){
    const rawParts=String(event?.raw||'').split('|').filter(Boolean);
    const rawFrom=rawParts.find(part=>part.startsWith('[from]'))||'';
    return normalizeSourceTag(event?.from||rawFrom);
  }

  function trackedItemSource(event={}){
    const source=itemSourceTag(event);
    return ITEM_TRANSFER_SOURCES.has(source)?source:'';
  }

  function trackedSourceLabel(source=''){
    return SOURCE_LABEL_OVERRIDES[source]||source.replace(/^(move|ability): /,'').trim();
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
    const source=trackedSourceLabel(itemName(input?.itemTransferSource))||itemName(input?.itemTransferMove)||'a replay item event';
    const removed=itemName(input?.removedItem)||'the old item';
    const gained=currentTransferredItem(input)||itemName(input?.revealedItem)||'the new item';
    if(itemName(input?.removedItem)){
      return `${source} replaced ${removed} with ${gained} as the current item, so the detective now treats the received item as live instead of leaving the slot stuck on the old timeline.`;
    }
    return `${source} revealed ${gained} as the current item, so the detective now reopens the slot instead of leaving it anchored to the old empty-item timeline.`;
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
        if(input?.itemTransferSource)read.input.itemTransferSource=input.itemTransferSource;
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
    const source=trackedItemSource(event);
    if(!source||!event?.target)return result;
    const state=this.ensureState?.(event.target,event.details);
    const item=transferredItemName(event);
    if(!state||!item)return result;
    if(event.type==='-enditem'){
      state.removedItem=item;
      state.itemGone=true;
      state.itemTransferMove=trackedSourceLabel(source);
      state.itemTransferSource=source;
      state.lastTransferredOutItem=item;
    }else if(event.type==='-item'){
      state.acquiredItem=item;
      state.revealedItem=item;
      state.itemGone=false;
      state.itemTransferMove=trackedSourceLabel(source);
      state.itemTransferSource=source;
      if(typeof this.addEvidence==='function'){
        this.addEvidence(state,turn||0,'reveal',`${state.species} received ${item} from ${trackedSourceLabel(source)}`,'Transferred item confirmed',4,{hard:true,revealedItem:item});
      }
      if(typeof this.addClueObservation==='function'){
        this.addClueObservation(state,{turn:turn||0,label:`${trackedSourceLabel(source)} revealed ${item} as the new item`});
      }
    }
    return result;
  };

  proto.__itemTransferTimelinePatch=true;
})();