/**
 * replay.ts — Showdown replay parser + evidence extractor (merged legacy layers).
 *
 * Ported from src/app.js ReplayParser with patch layers folded in, in script
 * order: replay-ability-upgrades → replay-status-control-upgrades →
 * battlelog-demo-upgrades → item-transfer-timeline-upgrades →
 * move-immunity-upgrades. DOM-free.
 */
import { unique, toId } from './types';
import {
  getSpecies,
  moveMeta,
  moveCategory,
  movePriority,
  resolveMoveName,
  resolveSpeciesName,
  id as dexId,
} from './dex';
import {
  controlStatusAbilityBlocksMove,
  controlStatusBlockedAbilities,
  moveSpecificImmunityAbility,
  isWindMove,
  isWindImmunityMove,
  isSoundMove,
  isBallOrBombMove,
  isPowderMove,
  abilityBypassMode,
  detectiveAbilities,
  trackedItemSource,
  trackedSourceLabel,
  transferredItemName,
  clearTransferredCurrentItem,
  joinWithOr,
} from './detective';
import type { DetectiveInput, DetectiveSpeedContext } from './detective';

/** Sample battle log folded from battlelog-demo-upgrades.js (BATTLELOG_DEMO). */
export const BATTLELOG_DEMO = [
  '|turn|1',
  '|switch|p1a: Dragapult|Dragapult, L80',
  '|switch|p2a: Blastoise|Blastoise, L80',
  '|move|p1a: Dragapult|Thunder Wave|p2a: Blastoise',
  '|-status|p2a: Blastoise|par',
  '|move|p1a: Dragapult|Shadow Ball|p2a: Blastoise',
  '|-damage|p2a: Blastoise|44/100',
  '|move|p1a: Dragapult|Draco Meteor|p2a: Blastoise',
  '|-damage|p2a: Blastoise|10/100',
  '|-item|p1a: Dragapult|Choice Specs|[from] move: Trick',
].join('\n');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayEvent {
  type: string;
  raw: string;
  pokemon?: string;
  details?: string;
  attacker?: string;
  move?: string;
  target?: string;
  damage?: string;
  heal?: string;
  status?: string;
  from?: string;
  item?: string;
  tags?: string[];
  ability?: string;
  effect?: string;
  stat?: string;
  amount?: string;
  weather?: string;
  side?: string;
  condition?: string;
}

export interface ReplayTurn {
  turn: number;
  events: ReplayEvent[];
}

export interface ReplayEvidence {
  turn: number;
  species: string;
  source: string;
  text: string;
  conclusion: string;
  score: number;
  hard?: boolean;
  soft?: boolean;
  ability?: string;
  ruledOutAbility?: string;
  revealedItem?: string;
  removedItem?: string;
  itemGone?: boolean;
  move?: string;
  observedDamage?: number;
  evidenceType?: string;
  targetSpecies?: string;
  userSpecies?: string;
  opponentSpecies?: string;
  [key: string]: unknown;
}

export interface DamageObservation {
  turn: number;
  move: string;
  observedDamage: number | null;
  evidence: string;
  targetSpecies?: string;
  userSpecies?: string;
  speedContext?: DetectiveSpeedContext | null;
  movedFirst?: boolean;
  movedSecond?: boolean;
}

export interface ClueObservation {
  turn: number;
  label: string;
  move?: string;
  speedContext?: DetectiveSpeedContext | null;
  movedFirst?: boolean;
  movedSecond?: boolean;
}

export interface HazardEvent {
  turn: number;
  source: string;
}

export interface EntryCheck {
  key: string;
  slot: string;
  turn: number;
  hazards: string[];
  entryStatus?: string;
  abilitySuppressionSource?: string;
}

export interface TurnMove {
  slot: string;
  species: string;
  move: string;
  priority: number;
  abilityBypass?: string;
}

export interface SpeciesState {
  slot: string;
  side: string;
  species: string;
  evidence: ReplayEvidence[];
  score: number;
  tookHazardDamage: boolean;
  usedStatusMove: boolean;
  repeatedDamagingMove: boolean;
  choiceContradiction: boolean;
  movedFirst: boolean;
  movedSecond: boolean;
  revealedItem: string;
  removedItem: string;
  itemGone: boolean;
  itemLossLabel: string;
  itemLossNote: string;
  itemLossTurn: number;
  historicalItemNotes: string[];
  hazardEvents: HazardEvent[];
  postItemLossNotes: string[];
  postItemLossProtectionRecovered: boolean;
  postItemLossProtectionItems: string[];
  postItemLossProtectionAbilities: string[];
  postItemLossGroundNotes: string[];
  postItemLossGroundProtectionRecovered: boolean;
  postItemLossGroundProtectionItems: string[];
  postItemLossGroundProtectionAbilities: string[];
  abilityHints: string[];
  ruledOutAbilities: string[];
  abilityContradictionNotes: string[];
  damageObservations: DamageObservation[];
  clueObservations: ClueObservation[];
  speedContexts: (DetectiveSpeedContext & { turn: number })[];
  speedContext: (DetectiveSpeedContext & { turn: number }) | null;
  lastMove: string;
  lastDamagingMove: string;
  lastMoveTurn: number;
  currentStatus?: string;
  abilitySuppressed?: boolean;
  abilitySuppressionEffect?: string;
  acquiredItem?: string;
  currentTransferredItem?: string;
  itemTransferMove?: string;
  itemTransferSource?: string;
  lastTransferredOutItem?: string;
}

export interface ReplayTarget {
  species: string;
  displaySpecies?: string;
  side: string;
  score: number;
  evidenceCount: number;
  detectiveBranchCount: number;
  notes: string[];
  revealedItem?: string;
  removedItem?: string;
  itemGone: boolean;
  revealedAbility?: string;
  ruledOutAbilities: string[];
  abilityContradictionNotes: string[];
  postItemLossProtectionRecovered: boolean;
  postItemLossNotes: string[];
  postItemLossGroundProtectionRecovered: boolean;
  postItemLossGroundNotes: string[];
  abilityHints: string[];
  usedStatusMove: boolean;
  tookHazardDamage: boolean;
  historicalHazardDamage: boolean;
  repeatedDamagingMove: boolean;
  choiceContradiction: boolean;
  movedFirst: boolean;
  movedSecond: boolean;
  speedContext: DetectiveSpeedContext | null;
  postItemLossProtectionItems: string[];
  postItemLossProtectionAbilities: string[];
  postItemLossGroundProtectionItems: string[];
  postItemLossGroundProtectionAbilities: string[];
  detectiveInput: DetectiveInput | null;
  detectiveInputs: DetectiveInput[];
  evidence: ReplayEvidence[];
}

export interface ReplayRead {
  targets: ReplayTarget[];
  strongest: ReplayTarget | null;
}

export interface ReplayParseResult {
  turns: ReplayTurn[];
  evidence: ReplayEvidence[];
  read: ReplayRead;
  parser: ReplayParser;
}

export interface ReplayAnalysis extends ReplayParseResult {
  targetCount: number;
  strongest: ReplayTarget | null;
  evidenceByTurn: Record<number, ReplayEvidence[]>;
}

export interface ReplaySummary {
  text: string;
  lines: string[];
  targetCount: number;
  strongest: ReplayTarget | null;
}

// ---------------------------------------------------------------------------
// ReplayParser — merged (base + replay-ability + status-control +
// item-transfer + move-immunity)
// ---------------------------------------------------------------------------

export class ReplayParser {
  turns: ReplayTurn[] = [];
  evidence: ReplayEvidence[] = [];
  slotState: Record<string, string> = {};
  speciesState: Record<string, SpeciesState> = {};
  sideConditions: Record<string, Record<string, boolean>> = {};
  pendingEntryChecks: EntryCheck[] = [];
  turnMoves: TurnMove[] = [];
  replayRead: ReplayRead = { targets: [], strongest: null };
  replayWeatherState: { current: string } = { current: '' };
  fieldAbilitySuppressionSlots: Record<string, string> = {};

  reset(): void {
    this.turns = [];
    this.evidence = [];
    this.slotState = {};
    this.speciesState = {};
    this.sideConditions = { p1: {}, p2: {} };
    this.pendingEntryChecks = [];
    this.turnMoves = [];
    this.replayRead = { targets: [], strongest: null };
    this.replayWeatherState = { current: '' };
    this.fieldAbilitySuppressionSlots = {};
  }

  parse(log: string): ReplayTurn[] {
    const lines = String(log || '').split(/\r?\n/);
    let currentTurn = 0;
    this.reset();
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('|turn|')) {
        currentTurn = parseInt(trimmed.split('|')[2], 10) || 0;
        this.turns.push({ turn: currentTurn, events: [] });
        this.turnMoves = [];
        return;
      }
      if (currentTurn <= 0) return;
      const parts = trimmed.split('|').filter(Boolean);
      if (!parts.length) return;
      const event: ReplayEvent = { type: parts[0], raw: trimmed };
      if (event.type === 'switch' || event.type === 'drag') {
        event.pokemon = parts[1];
        event.details = parts[2] || '';
      } else if (event.type === 'move') {
        event.attacker = parts[1];
        event.move = parts[2];
        event.target = parts[3] || '';
      } else if (event.type === '-damage') {
        event.target = parts[1];
        event.damage = parts[2];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
      } else if (event.type === '-heal') {
        event.target = parts[1];
        event.heal = parts[2];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
      } else if (event.type === '-status') {
        event.target = parts[1];
        event.status = parts[2];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
      } else if (event.type === '-item' || event.type === '-enditem') {
        event.target = parts[1];
        event.item = parts[2];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
        event.tags = parts.slice(3).filter((p) => /^\[[^\]]+\]$/.test(p));
      } else if (event.type === '-immune') {
        event.target = parts[1];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
      } else if (event.type === '-activate') {
        event.target = parts[1];
        const source = parts[2] || '';
        if (/^ability: /i.test(source)) event.ability = source.replace(/^ability: /i, '');
        else event.effect = source.replace(/^move: /i, '');
      } else if (event.type === '-ability') {
        event.target = parts[1];
        event.ability = (parts[2] || '').replace(/^ability: /, '');
      } else if (event.type === '-boost') {
        event.target = parts[1];
        event.stat = parts[2];
        event.amount = parts[3];
        event.from = parts.find((p) => p.startsWith('[from]'))?.replace('[from] ', '') || '';
      } else if (event.type === '-weather') {
        event.weather = parts[1];
      } else if (event.type === '-sidestart' || event.type === '-sideend') {
        event.side = parts[1];
        event.condition = (parts[2] || '').replace(/^move: /, '');
      }
      this.turns[this.turns.length - 1]?.events.push(event);
      this.extractEvidence(event, currentTurn);
    });
    this.flushPendingEntryChecks();
    this.replayRead = this.buildReplayRead();
    return this.turns;
  }

  slotId(token: string): string {
    return String(token || '').split(':')[0].trim();
  }
  slotSide(slot: string): string {
    const match = String(slot || '').match(/^(p\d+)/);
    return match ? match[1] : '';
  }
  tokenSpecies(token: string): string {
    return String(token || '').split(':').slice(1).join(':').trim() || '';
  }
  detailsSpecies(details: string): string {
    return String(details || '').split(',')[0].trim() || '';
  }
  stateKey(slot: string, species: string): string {
    const side = this.slotSide(slot);
    if (side && species) return `${side}:${species}`;
    return species || `__slot_${slot}`;
  }
  ensureState(token: string, details = ''): SpeciesState {
    const slot = this.slotId(token);
    const knownKey = this.slotState[slot];
    const knownState = knownKey ? this.speciesState[knownKey] : null;
    const species = this.detailsSpecies(details) || knownState?.species || this.tokenSpecies(token) || '';
    const key = this.stateKey(slot, species);
    if (slot && species) this.slotState[slot] = key;
    if (!this.speciesState[key]) {
      this.speciesState[key] = {
        slot,
        side: this.slotSide(slot),
        species,
        evidence: [],
        score: 0,
        tookHazardDamage: false,
        usedStatusMove: false,
        repeatedDamagingMove: false,
        choiceContradiction: false,
        movedFirst: false,
        movedSecond: false,
        revealedItem: '',
        removedItem: '',
        itemGone: false,
        itemLossLabel: '',
        itemLossNote: '',
        itemLossTurn: 0,
        historicalItemNotes: [],
        hazardEvents: [],
        postItemLossNotes: [],
        postItemLossProtectionRecovered: false,
        postItemLossProtectionItems: [],
        postItemLossProtectionAbilities: [],
        postItemLossGroundNotes: [],
        postItemLossGroundProtectionRecovered: false,
        postItemLossGroundProtectionItems: [],
        postItemLossGroundProtectionAbilities: [],
        abilityHints: [],
        ruledOutAbilities: [],
        abilityContradictionNotes: [],
        damageObservations: [],
        clueObservations: [],
        speedContexts: [],
        speedContext: null,
        lastMove: '',
        lastDamagingMove: '',
        lastMoveTurn: 0,
      };
    }
    if (slot) this.speciesState[key].slot = slot;
    if (slot) this.speciesState[key].side = this.slotSide(slot);
    if (species) this.speciesState[key].species = species;
    return this.speciesState[key];
  }

  addDamageObservation(state: SpeciesState | null, observation: DamageObservation): void {
    if (!state || !observation?.move || observation.observedDamage == null) return;
    state.damageObservations.push({ ...observation, turn: observation.turn || 0 });
    if (state.damageObservations.length > 6) state.damageObservations = state.damageObservations.slice(-6);
  }
  addClueObservation(state: SpeciesState | null, observation: ClueObservation): void {
    if (!state || !observation?.label) return;
    state.clueObservations.push({ ...observation, turn: observation.turn || 0 });
    if (state.clueObservations.length > 4) state.clueObservations = state.clueObservations.slice(-4);
  }
  addHazardEvent(state: SpeciesState | null, turn: number, source = ''): void {
    if (!state || !turn) return;
    const label = String(source || '').trim() || 'hazards';
    state.hazardEvents = [...(state.hazardEvents || []), { turn, source: label }].slice(-6);
  }
  addPostItemLossNote(state: SpeciesState | null, note = ''): void {
    const text = String(note || '').trim();
    if (!state || !text) return;
    if (!state.postItemLossNotes) state.postItemLossNotes = [];
    if (!state.postItemLossNotes.includes(text)) {
      state.postItemLossNotes = [...state.postItemLossNotes, text].slice(-4);
    }
  }
  addPostItemLossGroundNote(state: SpeciesState | null, note = ''): void {
    const text = String(note || '').trim();
    if (!state || !text) return;
    if (!state.postItemLossGroundNotes) state.postItemLossGroundNotes = [];
    if (!state.postItemLossGroundNotes.includes(text)) {
      state.postItemLossGroundNotes = [...state.postItemLossGroundNotes, text].slice(-4);
    }
  }
  addHistoricalItemNote(state: SpeciesState | null, note = ''): void {
    const text = String(note || '').trim();
    if (!state || !text) return;
    if (!state.historicalItemNotes) state.historicalItemNotes = [];
    if (!state.historicalItemNotes.includes(text)) {
      state.historicalItemNotes = [...state.historicalItemNotes, text].slice(-4);
    }
  }
  addAbilityContradictionNote(state: SpeciesState | null, note = ''): void {
    const text = String(note || '').trim();
    if (!state || !text) return;
    if (!state.abilityContradictionNotes) state.abilityContradictionNotes = [];
    if (!state.abilityContradictionNotes.includes(text)) {
      state.abilityContradictionNotes = [...state.abilityContradictionNotes, text].slice(-4);
    }
  }
  ruleOutAbilities(state: SpeciesState | null, turn: number, abilities: string[] = [], note = '', label = ''): void {
    if (!state) return;
    const legalAbilities = detectiveAbilities(state.species);
    const targets = unique((abilities || []).filter((ability) => ability && legalAbilities.includes(ability)));
    if (!targets.length) return;
    state.ruledOutAbilities = unique([...(state.ruledOutAbilities || []), ...targets]);
    this.addAbilityContradictionNote(state, note);
    if (label) this.addClueObservation(state, { turn, label });
    targets.forEach((ability) => {
      this.addEvidence(state, turn, 'reveal', `${state.species} cannot be ${ability}`, 'Ability contradicted', 4, { hard: true, ruledOutAbility: ability });
    });
  }
  joinWithOr(list: string[] = []): string {
    return joinWithOr(list);
  }
  currentStateHazardEvents(state: SpeciesState): HazardEvent[] {
    const events = [...(state?.hazardEvents || [])];
    if (state?.itemGone && state.itemLossTurn) return events.filter((event) => (event.turn || 0) >= state.itemLossTurn);
    return events;
  }
  historicalHazardEvents(state: SpeciesState): HazardEvent[] {
    if (!state?.itemGone || !state.itemLossTurn) return [];
    return [...(state?.hazardEvents || [])].filter((event) => (event.turn || 0) < state.itemLossTurn);
  }
  currentStateTookHazardDamage(state: SpeciesState): boolean {
    return this.currentStateHazardEvents(state).length > 0;
  }
  protectionRecoveryItemsForHazard(hazard = ''): string[] {
    return this.normalizedHazardName(hazard) ? ['Heavy-Duty Boots'] : [];
  }
  protected protectionRecoveryAbilitiesForHazardBase(state: SpeciesState | null, hazard = ''): string[] {
    const label = this.normalizedHazardName(hazard);
    if (!label) return [];
    const abilities = detectiveAbilities(state?.species || '');
    return abilities.filter((ability) => {
      if (['Stealth Rock', 'Spikes'].includes(label) && ability === 'Magic Guard') return true;
      if (['Spikes', 'Toxic Spikes', 'Sticky Web'].includes(label) && ability === 'Levitate') return true;
      if (label === 'Toxic Spikes' && ['Immunity', 'Pastel Veil'].includes(ability)) return true;
      if (label === 'Sticky Web' && ['Clear Body', 'White Smoke', 'Full Metal Body'].includes(ability)) return true;
      return false;
    });
  }
  protectionRecoveryAbilitiesForHazard(state: SpeciesState | null, hazard = ''): string[] {
    // replay-ability layer: drop abilities already ruled out
    return this.stillPossibleProtectionAbilities(state, this.protectionRecoveryAbilitiesForHazardBase(state, hazard));
  }
  addPostItemLossProtectionHints(state: SpeciesState | null, hazard = '', options: { includeItems?: boolean; includeAbilities?: boolean } = {}): void {
    if (!state) return;
    if (options.includeItems !== false) {
      state.postItemLossProtectionItems = unique([...(state.postItemLossProtectionItems || []), ...this.protectionRecoveryItemsForHazard(hazard)]);
    }
    if (options.includeAbilities === false) return;
    state.postItemLossProtectionAbilities = unique([...(state.postItemLossProtectionAbilities || []), ...this.protectionRecoveryAbilitiesForHazard(state, hazard)]);
  }
  isGroundProtectionMove(move = ''): boolean {
    const meta = moveMeta(move);
    return !!meta && meta[0] === 'Ground' && meta[1] !== 'Status';
  }
  groundProtectionRecoveryItemsForMove(state: SpeciesState | null, move = ''): string[] {
    if (state?.removedItem !== 'Air Balloon' || !this.isGroundProtectionMove(move)) return [];
    return ['Air Balloon'];
  }
  protected groundProtectionRecoveryAbilitiesForMoveBase(state: SpeciesState | null, move = ''): string[] {
    if (state?.removedItem !== 'Air Balloon' || !this.isGroundProtectionMove(move)) return [];
    const abilities = detectiveAbilities(state?.species || '');
    return abilities.filter((ability) => ['Levitate', 'Earth Eater'].includes(ability));
  }
  groundProtectionRecoveryAbilitiesForMove(state: SpeciesState | null, move = ''): string[] {
    return this.stillPossibleProtectionAbilities(state, this.groundProtectionRecoveryAbilitiesForMoveBase(state, move));
  }
  addPostItemLossGroundProtectionHints(state: SpeciesState | null, move = '', options: { includeItems?: boolean; includeAbilities?: boolean } = {}): void {
    if (!state) return;
    if (options.includeItems !== false) {
      state.postItemLossGroundProtectionItems = unique([...(state.postItemLossGroundProtectionItems || []), ...this.groundProtectionRecoveryItemsForMove(state, move)]);
    }
    if (options.includeAbilities === false) return;
    state.postItemLossGroundProtectionAbilities = unique([...(state.postItemLossGroundProtectionAbilities || []), ...this.groundProtectionRecoveryAbilitiesForMove(state, move)]);
  }
  postItemLossProtectionHintNote(state: SpeciesState | null, hazard = ''): string {
    const label = this.normalizedHazardName(hazard);
    if (!state || !label) return '';
    const options = [
      ...this.protectionRecoveryItemsForHazard(label),
      ...this.protectionRecoveryAbilitiesForHazard(state, label),
    ];
    if (!options.length) return '';
    return `Later missing ${label} after ${state?.removedItem || 'the old item'} left the slot keeps ${this.joinWithOr(options)} live for the new current-state explanation.`;
  }
  turnSpeedContext(state: SpeciesState | null, turn: number): (DetectiveSpeedContext & { turn: number }) | null {
    if (!state || !turn) return null;
    return [...(state.speedContexts || [])].reverse().find((ctx) => ctx.turn === turn) || null;
  }
  applyTurnSpeedContext(state: SpeciesState | null, turn: number, relation: string, opponentSpecies: string): void {
    if (!state || !turn || !relation || !opponentSpecies) return;
    const context = { turn, relation, opponentSpecies };
    state.speedContext = { ...context };
    state.movedFirst = state.movedFirst || relation === 'fasterThan';
    state.movedSecond = state.movedSecond || relation === 'slowerThan';
    const existing = (state.speedContexts || []).find((ctx) => ctx.turn === turn && ctx.relation === relation && ctx.opponentSpecies === opponentSpecies);
    if (!existing) {
      state.speedContexts = [...(state.speedContexts || []), context].slice(-6);
    }
    state.damageObservations.forEach((obs) => {
      if ((obs.turn || 0) !== turn) return;
      obs.speedContext = { relation, opponentSpecies };
      obs.movedFirst = relation === 'fasterThan';
      obs.movedSecond = relation === 'slowerThan';
    });
    state.clueObservations.forEach((obs) => {
      if ((obs.turn || 0) !== turn) return;
      obs.speedContext = { relation, opponentSpecies };
      obs.movedFirst = relation === 'fasterThan';
      obs.movedSecond = relation === 'slowerThan';
    });
  }
  itemClueLabel(item: string): string {
    return item ? `${item} confirmed` : 'Item revealed';
  }
  blockedItemClueLabel(item: string, move = ''): string {
    return item && move ? `${item} blocked ${move}` : this.itemClueLabel(item);
  }
  itemLossClueLabel(item: string, source = ''): string {
    const move = String(source || '').match(/^move: (.+)$/)?.[1] || '';
    if (item && move) return `${item} was removed by ${move}`;
    return item ? `${item} was removed` : 'Item was removed';
  }
  describeItemLoss(event: { item?: string; from?: string; tags?: string[] } = {}): { clueLabel: string; note: string } {
    const item = String(event.item || '').trim();
    const source = String(event.from || '').trim();
    const tags = event.tags || [];
    const hasTag = (tag: string) => tags.includes(tag);
    if (item === 'Air Balloon') {
      return {
        clueLabel: 'Air Balloon popped',
        note: 'Air Balloon popped, so the old Ground immunity is gone and the item slot is now empty.',
      };
    }
    if (item === 'Booster Energy') {
      const mode = source.replace(/^ability: /, '').trim();
      return {
        clueLabel: mode ? `Booster Energy activated ${mode}` : 'Booster Energy was consumed',
        note: 'Booster Energy is a one-shot item, so the stat trigger stays informative but the current item slot is now empty.',
      };
    }
    if (item === 'Red Card') {
      return {
        clueLabel: 'Red Card triggered',
        note: 'Red Card already fired, so that forced-switch item can no longer be the current item.',
      };
    }
    if (hasTag('[eat]') || /Berry$/i.test(item)) {
      return {
        clueLabel: item ? `${item} was eaten` : 'Berry was eaten',
        note: `${item || 'That berry'} was consumed, so the recovery clue stays useful but the item slot is now empty.`,
      };
    }
    const clueLabel = this.itemLossClueLabel(item, source);
    return {
      clueLabel,
      note: item ? `${clueLabel}, so that item can no longer be the current item.` : 'The old item is gone, so current item inference should stay open.',
    };
  }
  abilitySource(source: string): string {
    const match = String(source || '').match(/^ability: (.+)$/);
    return match ? match[1] : '';
  }
  itemSource(source: string): string {
    const match = String(source || '').match(/^item: (.+)$/);
    return match ? match[1] : '';
  }
  itemTransferMove(source = ''): string {
    const move = String(source || '').match(/^move: (.+)$/)?.[1] || '';
    return ['Trick', 'Switcheroo', 'Bestow'].includes(move) ? move : '';
  }
  itemTransferNote(oldItem = '', newItem = '', move = ''): string {
    if (!oldItem || !newItem) return '';
    if (move) return `${oldItem} was traded away by ${move}, so it no longer anchors the current item state now that ${newItem} is revealed.`;
    return `${oldItem} is no longer the live item once ${newItem} shows up in the current state.`;
  }
  reacquiredItemNote(oldItem = '', newItem = '', source = ''): string {
    if (!oldItem || !newItem) return '';
    const move = this.itemTransferMove(source);
    if (move) return `${newItem} later appeared via ${move}, so the earlier ${oldItem}-loss empty-slot read no longer describes the current item state.`;
    return `${newItem} later appeared, so the earlier ${oldItem}-loss empty-slot read no longer describes the current item state.`;
  }
  abilityRewardText(ability: string): string {
    // merged: status-control + move-immunity reward strings ahead of the base map
    const name = String(ability || '').trim();
    if (name === 'Own Tempo') return 'blocking confusion-based control';
    if (name === 'Oblivious') return 'blanking Taunt and infatuation control';
    if (name === 'Aroma Veil') return 'blanking Taunt and lockout control';
    if (name === 'Soundproof') return 'immunity to sound-based moves';
    if (name === 'Bulletproof') return 'immunity to ball and bomb moves';
    if (name === 'Wind Rider') return 'wind immunity plus an Attack boost';
    if (name === 'Overcoat') return 'immunity to powder-based moves and weather chip';
    return ({
      'Water Absorb': 'healing and Water immunity',
      'Volt Absorb': 'healing and Electric immunity',
      'Dry Skin': 'healing and Water immunity',
      'Storm Drain': 'a Special Attack boost and Water immunity',
      'Lightning Rod': 'a Special Attack boost and Electric immunity',
      'Motor Drive': 'a Speed boost and Electric immunity',
      'Sap Sipper': 'an Attack boost and Grass immunity',
      'Earth Eater': 'healing and Ground immunity',
      'Well-Baked Body': 'a Defense boost and Fire immunity',
      'Flash Fire': 'Fire immunity and a Fire-power boost',
      'Good as Gold': 'status immunity against opposing moves',
      Protosynthesis: 'a Paradox stat boost when sun or Booster Energy is active',
      'Quark Drive': 'a Paradox stat boost when Electric Terrain or Booster Energy is active',
    } as Record<string, string>)[name] || '';
  }
  abilityTriggeredByMove(ability: string, move = ''): boolean {
    // merged: move-immunity → status-control → replay-ability → base
    if (ability === 'Soundproof') return isSoundMove(move);
    if (ability === 'Bulletproof') return isBallOrBombMove(move);
    if (ability === 'Wind Rider') return isWindMove(move);
    if (ability === 'Overcoat') return isPowderMove(move);
    if (controlStatusAbilityBlocksMove(ability, move)) return true;
    const category = this.replaySafeMoveCategory(move);
    if (ability === 'Magic Bounce') return category === 'Status';
    if (ability === 'Good as Gold') return category === 'Status' && !this.normalizedHazardName(move);
    const meta = moveMeta(move);
    const type = meta?.[0] || '';
    if (['Water Absorb', 'Storm Drain', 'Dry Skin'].includes(ability)) return type === 'Water';
    if (['Volt Absorb', 'Lightning Rod', 'Motor Drive'].includes(ability)) return type === 'Electric';
    if (ability === 'Sap Sipper') return type === 'Grass';
    if (ability === 'Earth Eater') return type === 'Ground';
    if (['Well-Baked Body', 'Flash Fire'].includes(ability)) return type === 'Fire';
    return false;
  }
  abilityClueLabel(ability: string, move = ''): string {
    return this.abilityClueLabelWithProof(ability, move, false);
  }
  abilityClueLabelWithProof(ability: string, move = '', assumeTriggered = false): string {
    const name = String(ability || '').trim();
    const moveName = String(move || '').trim();
    if (!moveName || (!assumeTriggered && !this.abilityTriggeredByMove(name, moveName))) return `${name} revealed`;
    if (['Water Absorb', 'Volt Absorb', 'Dry Skin', 'Earth Eater'].includes(name)) return `${name} absorbed ${moveName}`;
    if (['Storm Drain', 'Lightning Rod', 'Motor Drive', 'Sap Sipper', 'Well-Baked Body'].includes(name)) return `${name} activated on ${moveName}`;
    if (name === 'Wind Rider' && isWindMove(moveName)) return `Wind Rider activated on ${moveName}`;
    if (name === 'Magic Bounce') return `${name} reflected ${moveName}`;
    // status-control layer: control abilities + generic reactive proof label as 'blocked'
    if (name === 'Flash Fire' || name === 'Good as Gold' || controlStatusAbilityBlocksMove(name, moveName) || ['Soundproof', 'Bulletproof', 'Overcoat'].includes(name)) {
      return `${name} blocked ${moveName}`;
    }
    return `${name} blocked ${moveName}`;
  }
  moveBlockedAbilities(state: SpeciesState | { species?: string; abilitySuppressed?: boolean; slot?: string } | null, move = ''): string[] {
    // merged: suppression/bypass short-circuit, then base triggered + control + move-family
    if (this.abilitySuppressionActive(state)) return [];
    if (this.moveAbilityBypass(state as SpeciesState, move)) return [];
    const moveName = String(move || '').trim();
    if (!moveName) return [];
    const abilities = detectiveAbilities(state?.species || '');
    return unique([
      ...abilities.filter((ability) => this.abilityBlocksMove(ability, moveName)),
      ...controlStatusBlockedAbilities(state?.species || '', moveName),
      ...abilities.filter((ability) => moveSpecificImmunityAbility(ability, moveName)),
    ]);
  }
  /** Like abilityTriggeredByMove but for the contradiction/blocked path —
   * trigger-only reveals (Tailwind into Wind Rider) do not count as landed
   * immunity hits even though they still reveal the ability. */
  abilityBlocksMove(ability = '', move = ''): boolean {
    if (ability === 'Wind Rider' && !isWindImmunityMove(move)) return false;
    return this.abilityTriggeredByMove(ability, move);
  }
  moveContradictionNote(state: SpeciesState | { species?: string } | null, move = ''): string {
    const moveNameValue = String(move || '').trim();
    const abilities = this.moveBlockedAbilities(state, moveNameValue);
    if (moveNameValue && abilities.length) {
      return `${moveNameValue} successfully landed, so ${this.joinWithOr(abilities)} impossible as the current ability.`;
    }
    return '';
  }
  hazardAbilityContradictions(state: SpeciesState | null, hazard = ''): string[] {
    if (this.abilitySuppressionActive(state)) return [];
    return this.hazardAbilityContradictionsBase(state, hazard);
  }
  protected hazardAbilityContradictionsBase(state: SpeciesState | null, hazard = ''): string[] {
    const label = this.normalizedHazardName(hazard);
    if (!label) return [];
    const abilities = detectiveAbilities(state?.species || '');
    return abilities.filter((ability) => {
      if (['Stealth Rock', 'Spikes'].includes(label) && ability === 'Magic Guard') return true;
      if (['Spikes', 'Toxic Spikes', 'Sticky Web'].includes(label) && ability === 'Levitate') return true;
      if (label === 'Toxic Spikes' && ['Immunity', 'Pastel Veil'].includes(ability)) return true;
      if (label === 'Sticky Web' && ['Clear Body', 'White Smoke', 'Full Metal Body'].includes(ability)) return true;
      return false;
    });
  }
  hazardContradictionNote(state: SpeciesState | null, hazard = ''): string {
    const label = this.normalizedHazardName(hazard);
    const abilities = this.hazardAbilityContradictions(state, label);
    if (!label || !abilities.length) return '';
    if (label === 'Toxic Spikes') {
      return `Getting poisoned by Toxic Spikes rules out ${this.joinWithOr(abilities)} for the current ability state.`;
    }
    if (label === 'Sticky Web') {
      return `Triggering Sticky Web rules out ${this.joinWithOr(abilities)} for the current ability state.`;
    }
    return `Taking ${label} rules out ${this.joinWithOr(abilities)} for the current ability state.`;
  }
  abilityContradictionLabel(abilities: string[] = [], source = ''): string {
    const targets = unique((abilities || []).filter(Boolean));
    const cause = String(source || '').trim();
    if (!targets.length) return '';
    return cause ? `${this.joinWithOr(targets)} contradicted by ${cause}` : `${this.joinWithOr(targets)} contradicted`;
  }
  normalizedHazardName(name = ''): string {
    const raw = String(name || '').replace(/^move: /, '').trim();
    if (/Stealth Rock/i.test(raw)) return 'Stealth Rock';
    if (/Spikes/i.test(raw) && !/Toxic Spikes/i.test(raw)) return 'Spikes';
    if (/Toxic Spikes/i.test(raw)) return 'Toxic Spikes';
    if (/Sticky Web/i.test(raw)) return 'Sticky Web';
    return '';
  }
  setSideCondition(side: string, hazard: string, active: boolean): void {
    const key = this.slotSide(side);
    const label = this.normalizedHazardName(hazard);
    if (!key || !label) return;
    if (!this.sideConditions[key]) this.sideConditions[key] = {};
    this.sideConditions[key][label] = !!active;
  }
  activeSideConditions(side: string): Record<string, boolean> {
    const key = this.slotSide(side);
    return this.sideConditions[key] || {};
  }
  canMeaningfullyMissSpikes(state: SpeciesState | null): boolean {
    const species = getSpecies(state?.species);
    const types = species?.types || [];
    return !types.includes('Flying');
  }
  canMeaningfullyMissStealthRock(state: SpeciesState | null): boolean {
    return !!state?.species;
  }
  canMeaningfullyMissToxicSpikes(state: SpeciesState | null): boolean {
    const species = getSpecies(state?.species);
    const types = species?.types || [];
    return !types.includes('Flying') && !types.includes('Poison') && !types.includes('Steel');
  }
  canMeaningfullyMissStickyWeb(state: SpeciesState | null): boolean {
    const species = getSpecies(state?.species);
    const types = species?.types || [];
    return !types.includes('Flying');
  }
  pendingEntryHazards(state: SpeciesState | null): string[] {
    if (!state?.itemGone || !state.side) return [];
    const hazards = this.activeSideConditions(state.side);
    const expected: string[] = [];
    if (hazards['Spikes'] && this.canMeaningfullyMissSpikes(state)) expected.push('Spikes');
    if (hazards['Stealth Rock'] && this.canMeaningfullyMissStealthRock(state)) expected.push('Stealth Rock');
    if (hazards['Toxic Spikes'] && this.canMeaningfullyMissToxicSpikes(state)) expected.push('Toxic Spikes');
    if (hazards['Sticky Web'] && this.canMeaningfullyMissStickyWeb(state)) expected.push('Sticky Web');
    return expected;
  }
  queueEntryCheck(state: SpeciesState | null, turn: number): void {
    const hazards = this.pendingEntryHazards(state);
    if (hazards.length && state) {
      // base: queue expected hazards for a post-item-loss switch-in
      const key = this.stateKey(state.slot, state.species);
      const existing = this.pendingEntryChecks.find((check) => check.key === key && check.turn === turn);
      if (existing) {
        existing.hazards = unique([...(existing.hazards || []), ...hazards]);
      } else {
        this.pendingEntryChecks.push({ key, slot: state.slot, turn, hazards });
      }
    }
    // replay-ability post-pass: capture entry status + suppression source
    if (!state?.slot || !state?.species) return;
    const key = this.stateKey(state.slot, state.species);
    const check = (this.pendingEntryChecks || []).find((entry) => entry.key === key && entry.turn === turn);
    if (!check) return;
    if (!check.entryStatus) check.entryStatus = String(state.currentStatus || '').trim();
    const source = this.fieldAbilitySuppressionSource(state);
    if (source) check.abilitySuppressionSource = source;
  }
  postItemLossProtectionNote(state: SpeciesState | null, hazard = ''): string {
    const label = this.normalizedHazardName(hazard) || String(hazard || 'hazards').trim() || 'hazards';
    const missedEffect = label === 'Toxic Spikes'
      ? 'without getting poisoned'
      : label === 'Sticky Web'
        ? 'without getting slowed'
        : 'without taking chip';
    if (state?.removedItem === 'Air Balloon') {
      return `Later switched through ${label} after Air Balloon popped ${missedEffect}, so the post-pop state regained entry protection before this switch.`;
    }
    if (state?.removedItem === 'Heavy-Duty Boots') {
      return `Later switched through ${label} after Heavy-Duty Boots were removed ${missedEffect}, so the post-Knock Off state later regained hazard protection.`;
    }
    return `Later switched through ${label} after ${state?.removedItem || 'the old item'} left the slot ${missedEffect}, so the current state picked up fresh entry protection after the item loss.`;
  }
  postItemLossAbilityProtectionNote(state: SpeciesState | null, hazard = ''): string {
    const label = this.normalizedHazardName(hazard) || String(hazard || 'hazards').trim() || 'hazards';
    const abilities = this.protectionRecoveryAbilitiesForHazard(state, label);
    if (!abilities.length) return '';
    const missedEffect = label === 'Toxic Spikes'
      ? 'without getting poisoned'
      : label === 'Sticky Web'
        ? 'without getting slowed'
        : 'without taking chip';
    const abilityText = this.joinWithOr(abilities);
    if (state?.removedItem === 'Air Balloon') {
      return `Later switched through ${label} after Air Balloon popped ${missedEffect}, but ${abilityText} still explains that protection without needing a fresh item.`;
    }
    if (state?.removedItem === 'Heavy-Duty Boots') {
      return `Later switched through ${label} after Heavy-Duty Boots were removed ${missedEffect}, so ${abilityText} still cleanly explains the empty-slot current state.`;
    }
    return `Later switched through ${label} after ${state?.removedItem || 'the old item'} left the slot ${missedEffect}, and ${abilityText} still explains that protection without needing a new item.`;
  }
  markPostItemLossProtection(state: SpeciesState | null, hazard = ''): void {
    // replay-ability layer: Toxic Spikes + standing status short-circuit
    if (this.normalizedHazardName(hazard) === 'Toxic Spikes' && this.toxicSpikesBlockedByExistingStatus(state)) {
      this.addPostItemLossNote(state, this.postItemLossStatusBlockNote(state, hazard));
      return;
    }
    if (!state) return;
    const abilityOptions = this.protectionRecoveryAbilitiesForHazard(state, hazard);
    if (abilityOptions.length) {
      this.addPostItemLossProtectionHints(state, hazard, { includeItems: false });
      this.addPostItemLossNote(state, this.postItemLossAbilityProtectionNote(state, hazard));
      return;
    }
    state.postItemLossProtectionRecovered = true;
    this.addPostItemLossProtectionHints(state, hazard);
    this.addPostItemLossNote(state, this.postItemLossProtectionNote(state, hazard));
    this.addPostItemLossNote(state, this.postItemLossProtectionHintNote(state, hazard));
  }
  resolvePendingEntryChecksForEvent(turn: number, event: ReplayEvent): void {
    // replay-ability replacement: unmatched same-turn checks stay queued
    if (!this.pendingEntryChecks.length) return;
    const remaining: EntryCheck[] = [];
    const eventSlot = event?.target ? this.slotId(event.target) : '';
    const eventHazard = event?.type === '-damage' || event?.type === '-status'
      ? this.normalizedHazardName(event.from || '')
      : event?.type === '-activate'
        ? this.normalizedHazardName(event.effect || event.from || '')
        : '';
    this.pendingEntryChecks.forEach((check) => {
      if ((check.turn || 0) > turn) {
        remaining.push(check);
        return;
      }
      if ((check.turn || 0) < turn) {
        const state = this.speciesState[check.key];
        (check.hazards || []).forEach((hazard) => {
          if (check.abilitySuppressionSource) {
            this.markPostItemLossSuppressedProtectionFromCheck(state, hazard, check.abilitySuppressionSource!, check);
            return;
          }
          this.markPostItemLossProtectionFromCheck(state, hazard, check);
        });
        return;
      }
      if (eventSlot === check.slot && eventHazard && check.hazards.includes(eventHazard)) {
        const hazards = (check.hazards || []).filter((hazard) => hazard !== eventHazard);
        if (hazards.length) remaining.push({ ...check, hazards });
        return;
      }
      remaining.push(check);
    });
    this.pendingEntryChecks = remaining;
  }
  flushPendingEntryChecks(): void {
    if (!this.pendingEntryChecks?.length) return;
    this.pendingEntryChecks.forEach((check) => {
      const state = this.speciesState[check.key];
      (check.hazards || []).forEach((hazard) => {
        if (check.abilitySuppressionSource) {
          this.markPostItemLossSuppressedProtectionFromCheck(state, hazard, check.abilitySuppressionSource!, check);
          return;
        }
        this.markPostItemLossProtectionFromCheck(state, hazard, check);
      });
    });
    this.pendingEntryChecks = [];
  }
  hazardTimelineNote(state: SpeciesState | null, hazard = ''): string {
    if (!state?.itemGone || !state.itemLossTurn) return '';
    const source = this.normalizedHazardName(hazard) || String(hazard || '').trim() || ([...(state.hazardEvents || [])].find((event) => (event.turn || 0) >= state.itemLossTurn)?.source || '');
    if (!source) return '';
    if (source === 'Toxic Spikes') {
      if (state.removedItem === 'Air Balloon') {
        return 'Later got poisoned by Toxic Spikes after Air Balloon popped, confirming the old Ground immunity really ended.';
      }
      if (state.removedItem === 'Heavy-Duty Boots') {
        return 'Later got poisoned by Toxic Spikes after Heavy-Duty Boots were removed, so the grounded status clue belongs to the new post-Knock Off item state.';
      }
      return `Later got poisoned by Toxic Spikes after ${state.removedItem || 'the old item'} left the slot, so the replay keeps that grounded status clue aligned with the current item state.`;
    }
    if (source === 'Sticky Web') {
      if (state.removedItem === 'Air Balloon') {
        return 'Later triggered Sticky Web after Air Balloon popped, confirming the old Ground immunity really ended.';
      }
      if (state.removedItem === 'Heavy-Duty Boots') {
        return 'Later triggered Sticky Web after Heavy-Duty Boots were removed, so the speed-drop clue belongs to the new post-Knock Off item state.';
      }
      return `Later triggered Sticky Web after ${state.removedItem || 'the old item'} left the slot, so the replay keeps that grounded speed-drop clue aligned with the current item state.`;
    }
    if (state.removedItem === 'Air Balloon' && /Spikes|Toxic Spikes|Sticky Web/i.test(source)) {
      return `Later took ${source} after Air Balloon popped, confirming the old Ground immunity really ended.`;
    }
    if (state.removedItem === 'Heavy-Duty Boots') {
      return `Later took ${source} after Heavy-Duty Boots were removed, so the hazard chip belongs to the new post-Knock Off item state.`;
    }
    return `Later took ${source} after ${state.removedItem || 'the old item'} left the slot, so the replay keeps the hazard timing aligned with the current item state.`;
  }
  groundTimelineNote(state: SpeciesState | null, move = ''): string {
    if (!state?.itemGone || !state.itemLossTurn || state.removedItem !== 'Air Balloon') return '';
    const moveName = String(move || '').trim();
    const meta = moveMeta(moveName);
    if (!moveName || !meta || meta[0] !== 'Ground' || meta[1] === 'Status') return '';
    return `Later took ${moveName} after Air Balloon popped, confirming the old Ground immunity really ended.`;
  }
  postItemLossGroundProtectionNote(state: SpeciesState | null, move = ''): string {
    const moveName = String(move || '').trim() || 'a Ground move';
    if (state?.removedItem === 'Air Balloon') {
      return `Later ignored ${moveName} after Air Balloon popped, so the current state regained Ground protection after the old Balloon was lost.`;
    }
    return `Later ignored ${moveName} after ${state?.removedItem || 'the old item'} left the slot, so the current state regained Ground protection.`;
  }
  postItemLossGroundAbilityProtectionNote(state: SpeciesState | null, move = ''): string {
    const moveName = String(move || '').trim() || 'a Ground move';
    const abilities = this.groundProtectionRecoveryAbilitiesForMove(state, move);
    if (!abilities.length) return '';
    const abilityText = this.joinWithOr(abilities);
    if (state?.removedItem === 'Air Balloon') {
      return `Later ignored ${moveName} after Air Balloon popped, but ${abilityText} still cleanly explains the empty-slot current state.`;
    }
    return `Later ignored ${moveName} after ${state?.removedItem || 'the old item'} left the slot, and ${abilityText} still explains that protection without needing a new item.`;
  }

  // ----- replay-ability-upgrades additions -----

  reactiveAbilityProof(ability: string): boolean {
    return ['Water Absorb', 'Volt Absorb', 'Dry Skin', 'Storm Drain', 'Lightning Rod', 'Motor Drive', 'Sap Sipper', 'Earth Eater', 'Well-Baked Body', 'Flash Fire', 'Good as Gold', 'Magic Bounce', 'Aroma Veil', 'Oblivious', 'Own Tempo', 'Soundproof', 'Bulletproof', 'Wind Rider', 'Overcoat'].includes(String(ability || '').trim());
  }
  startEffectName(effect = ''): string {
    return String(effect || '').replace(/^(move|ability): /, '').trim();
  }
  knownStatusStartMove(move = ''): boolean {
    return [
      'Attract', 'Confuse Ray', 'Disable', 'Embargo', 'Encore', 'Flatter',
      'Gastro Acid', 'Haze', 'Heal Block', 'Leech Seed', 'Memento',
      'Parting Shot', 'Supersonic', 'Swagger', 'Taunt', 'Torment', 'Yawn',
    ].includes(String(move || '').trim());
  }
  knownPureStatusMove(move = ''): boolean {
    return [
      'Glare', 'Hypnosis', 'Lovely Kiss', 'Powder', 'Poison Powder', 'Sing',
      'Sleep Powder', 'Stun Spore',
    ].includes(String(move || '').trim());
  }
  replaySafeMoveCategory(move = ''): string {
    const meta = moveMeta(move);
    if (meta?.[1]) return meta[1];
    if (this.knownStatusStartMove(move) || this.knownPureStatusMove(move)) return 'Status';
    return '';
  }
  startEffectMove(event: ReplayEvent | { raw?: string; effect?: string; from?: string; target?: string } = { raw: '' }, moveEvent: TurnMove | null = null): string {
    const raw = String(event?.raw || '');
    const parts = raw ? raw.split('|').filter(Boolean) : [];
    const effect = this.startEffectName(event?.effect || parts[2] || '');
    if (effect && moveMeta(effect) && (!moveEvent?.move || dexId(effect) === dexId(moveEvent.move))) return effect;
    const from = String(event?.from || parts.find((part) => part.startsWith('[from]'))?.replace('[from] ', '') || '');
    const fromMove = from.match(/^move: (.+)$/)?.[1] || '';
    if (effect && fromMove && dexId(effect) === dexId(fromMove)) return fromMove;
    if (effect && moveEvent?.move && dexId(effect) === dexId(moveEvent.move)) return moveEvent.move;
    const moveCat = this.replaySafeMoveCategory(moveEvent?.move || '');
    if (moveEvent?.move && (moveCat === 'Status' || this.knownStatusStartMove(moveEvent.move))) return moveEvent.move;
    return '';
  }
  singleEffectMove(event: ReplayEvent | { raw?: string; effect?: string; from?: string; target?: string } = { raw: '' }, moveEvent: TurnMove | null = null): string {
    const raw = String(event?.raw || '');
    const parts = raw ? raw.split('|').filter(Boolean) : [];
    const effect = this.startEffectName(event?.effect || parts[2] || '');
    const from = String(event?.from || parts.find((part) => part.startsWith('[from]'))?.replace('[from] ', '') || '');
    const fromMove = from.match(/^move: (.+)$/)?.[1] || '';
    if (effect && fromMove && dexId(effect) === dexId(fromMove)) return fromMove;
    if (effect && moveEvent?.move && dexId(effect) === dexId(moveEvent.move)) return moveEvent.move;
    return '';
  }
  landedMoveContradictionNote(state: SpeciesState | { species?: string } | null, move = ''): string {
    const moveName = String(move || '').trim();
    const abilities = this.moveBlockedAbilities(state, moveName);
    if (!moveName || !abilities.length) return '';
    return `${moveName} successfully landed, ruling out ${this.joinWithOr(abilities)} as the current ability explanation.`;
  }
  statusLabel(status = ''): string {
    const value = String(status || '').trim();
    return ({
      brn: 'burn',
      psn: 'poison',
      tox: 'bad poison',
      par: 'paralysis',
      slp: 'sleep',
      frz: 'freeze',
    } as Record<string, string>)[value] || 'status';
  }
  toxicSpikesBlockedByExistingStatus(state: SpeciesState | null, statusOverride = ''): boolean {
    return !!String(statusOverride || state?.currentStatus || '').trim();
  }
  postItemLossStatusBlockNote(state: SpeciesState | null, hazard = '', statusOverride = ''): string {
    const label = this.normalizedHazardName(hazard) || String(hazard || 'hazards').trim() || 'hazards';
    if (label !== 'Toxic Spikes' || !this.toxicSpikesBlockedByExistingStatus(state, statusOverride)) return '';
    const status = this.statusLabel(statusOverride || state?.currentStatus || '');
    return `Later switched through ${label} after ${state?.removedItem || 'the old item'} left the slot without getting poisoned, but the standing ${status} already explains that outcome without implying fresh protection.`;
  }
  entryStatusForCheck(check: EntryCheck | null): string {
    return String(check?.entryStatus || '').trim();
  }
  markPostItemLossProtectionFromCheck(state: SpeciesState | null, hazard = '', check: EntryCheck | null = null): void {
    const entryStatus = this.entryStatusForCheck(check);
    if (this.normalizedHazardName(hazard) === 'Toxic Spikes' && entryStatus) {
      this.addPostItemLossNote(state, this.postItemLossStatusBlockNote(state, hazard, entryStatus));
      return;
    }
    this.markPostItemLossProtection(state, hazard);
  }
  markPostItemLossSuppressedProtectionFromCheck(state: SpeciesState | null, hazard = '', source = '', check: EntryCheck | null = null): void {
    const entryStatus = this.entryStatusForCheck(check);
    if (this.normalizedHazardName(hazard) === 'Toxic Spikes' && entryStatus) {
      this.addPostItemLossNote(state, this.postItemLossStatusBlockNote(state, hazard, entryStatus));
      return;
    }
    this.markPostItemLossSuppressedProtection(state, hazard, source);
  }
  stillPossibleProtectionAbilities(state: { ruledOutAbilities?: string[]; species?: string } | null, abilities: string[] = []): string[] {
    const ruledOut = new Set((state?.ruledOutAbilities || []).map((ability) => String(ability || '').trim()).filter(Boolean));
    return (abilities || []).filter((ability) => ability && !ruledOut.has(String(ability || '').trim()));
  }
  abilityBypassAbility(ability = ''): boolean {
    return !!abilityBypassMode(ability);
  }
  findRecentOpponentMoveEvent(state: SpeciesState | null, move = ''): TurnMove | null {
    const moveName = String(move || '').trim();
    if (!moveName || !state?.slot || !Array.isArray(this.turnMoves)) return null;
    return [...this.turnMoves].reverse().find((entry) => {
      if (!entry?.move || dexId(entry.move) !== dexId(moveName)) return false;
      return !!entry.slot && entry.slot !== state.slot;
    }) || null;
  }
  moveAbilityBypass(state: SpeciesState | { slot?: string } | null, move = ''): string {
    const moveEvent = this.findRecentOpponentMoveEvent(state as SpeciesState, move);
    const ability = String(moveEvent?.abilityBypass || '').trim();
    const mode = abilityBypassMode(ability);
    if (!mode) return '';
    if (mode === 'all') return ability;
    if (mode === 'status' && this.replaySafeMoveCategory(move) === 'Status') return ability;
    return '';
  }
  majorStatusBlockingAbilities(state: SpeciesState | null, status = '', move = ''): string[] {
    const statusId = String(status || '').trim();
    if (!statusId) return [];
    if (this.abilitySuppressionActive(state)) return [];
    if (this.moveAbilityBypass(state, move)) return [];
    return this.majorStatusBlockingAbilitiesWithoutBypass(state, status);
  }
  majorStatusBlockingAbilitiesWithoutBypass(state: SpeciesState | { species?: string } | null, status = ''): string[] {
    const statusId = String(status || '').trim();
    if (!statusId) return [];
    return detectiveAbilities(state?.species || '').filter((ability) => {
      if (ability === 'Purifying Salt') return true;
      if (ability === 'Leaf Guard' && this.sunWeatherActive()) return true;
      if (statusId === 'par' && ability === 'Limber') return true;
      if ((statusId === 'psn' || statusId === 'tox') && ['Immunity', 'Pastel Veil'].includes(ability)) return true;
      if (statusId === 'brn' && ['Water Veil', 'Water Bubble'].includes(ability)) return true;
      if (statusId === 'slp' && ['Insomnia', 'Vital Spirit', 'Sweet Veil'].includes(ability)) return true;
      if (statusId === 'frz' && ability === 'Magma Armor') return true;
      return false;
    });
  }
  ensureReplayWeatherState(): { current: string } {
    if (!this.replayWeatherState) this.replayWeatherState = { current: '' };
    return this.replayWeatherState;
  }
  normalizedReplayWeather(weather = ''): string {
    const label = String(weather || '').trim().toLowerCase();
    if (!label || label === 'none') return '';
    if (label.includes('sun')) return 'sun';
    if (label.includes('rain')) return 'rain';
    if (label.includes('sand')) return 'sand';
    if (label.includes('snow') || label.includes('hail')) return 'snow';
    return '';
  }
  recordReplayWeather(weather = ''): void {
    this.ensureReplayWeatherState().current = this.normalizedReplayWeather(weather);
  }
  currentReplayWeather(): string {
    return this.ensureReplayWeatherState().current || '';
  }
  sunWeatherActive(): boolean {
    return this.currentReplayWeather() === 'sun';
  }
  statusImmunityContradictionLabel(status = '', move = ''): string {
    const effect = this.statusLabel(status);
    const moveName = String(move || '').trim();
    if (moveName && effect !== 'status') return `${moveName} caused ${effect}`;
    if (moveName) return `${moveName} landed`;
    return effect === 'status' ? 'status landed' : `${effect} landed`;
  }
  statusImmunityContradictionNote(state: SpeciesState | null, status = '', move = ''): string {
    const abilities = this.majorStatusBlockingAbilities(state, status, move);
    const effect = this.statusLabel(status);
    const moveName = String(move || '').trim();
    if (!abilities.length) return '';
    if (moveName && effect !== 'status') {
      return `${moveName} successfully caused ${effect}, ruling out ${this.joinWithOr(abilities)} as the current ability explanation.`;
    }
    if (effect !== 'status') {
      return `Actually becoming ${effect} rules out ${this.joinWithOr(abilities)} as the current ability explanation.`;
    }
    return `The landed status rules out ${this.joinWithOr(abilities)} as the current ability explanation.`;
  }
  activeStateForSide(side = ''): SpeciesState | null {
    const slot = `${this.slotSide(side)}a`;
    const key = this.slotState?.[slot];
    return key ? this.speciesState?.[key] || null : null;
  }
  sideConditionLandedMove(event: ReplayEvent | { condition?: string } | null = null, moveEvent: TurnMove | null = null): string {
    const hazard = this.normalizedHazardName(event?.condition || '');
    if (!hazard || !moveEvent?.move) return '';
    return dexId(moveEvent.move) === dexId(hazard) ? moveEvent.move : '';
  }
  recordAbilityReveal(state: SpeciesState | null, turn: number, ability: string, moveEvent: TurnMove | null, text: string, clueLabel = '', options: { assumeReactiveMove?: boolean } = {}): void {
    if (!state || !ability) return;
    if (!state.abilityHints.includes(ability)) state.abilityHints.push(ability);
    this.addEvidence(state, turn, 'reveal', text || `${state.species} revealed ${ability}`, 'Ability revealed', 3.5, { hard: true, ability });
    const assumeReactiveMove = !!options.assumeReactiveMove && this.reactiveAbilityProof(ability);
    const reactiveMove = (assumeReactiveMove && moveEvent?.move) ? moveEvent : (this.abilityTriggeredByMove(ability, moveEvent?.move || '') ? moveEvent : null);
    this.addClueObservation(state, { turn, move: reactiveMove?.move || '', label: clueLabel || this.abilityClueLabelWithProof(ability, reactiveMove?.move, assumeReactiveMove) });
  }
  abilitySuppressionEffect(effect = ''): string {
    const label = this.startEffectName(effect);
    return label === 'Gastro Acid' ? label : '';
  }
  ensureFieldSuppressionState(): Record<string, string> {
    if (!this.fieldAbilitySuppressionSlots) this.fieldAbilitySuppressionSlots = {};
    return this.fieldAbilitySuppressionSlots;
  }
  fieldAbilitySuppressionSource(state: SpeciesState | { slot?: string } | null): string {
    const slots = this.ensureFieldSuppressionState();
    const suppressedSlot = String(state?.slot || '').trim();
    const sourceSlot = Object.keys(slots).find((slot) => slot && slot !== suppressedSlot);
    return sourceSlot ? String(slots[sourceSlot] || '').trim() : '';
  }
  fieldAbilitySuppressionActive(state: SpeciesState | null): boolean {
    return !!this.fieldAbilitySuppressionSource(state);
  }
  abilitySuppressionActive(state: { abilitySuppressed?: boolean; slot?: string; species?: string } | null): boolean {
    return !!state?.abilitySuppressed || this.fieldAbilitySuppressionActive(state as SpeciesState);
  }
  abilitySuppressionNote(effect = ''): string {
    const label = this.abilitySuppressionEffect(effect);
    if (!label) return '';
    return `${label} suppressed the target's ability for part of the replay, so landed move and status clues from that window do not rule out the base ability.`;
  }
  fieldAbilitySuppressionNote(state: SpeciesState | null): string {
    const source = this.fieldAbilitySuppressionSource(state);
    if (!source) return '';
    return `Neutralizing Gas from ${source} suppressed the target's ability for part of the replay, so landed move, hazard, and status clues from that window do not rule out the base ability.`;
  }
  postItemLossSuppressedProtectionNote(state: SpeciesState | null, hazard = '', source = ''): string {
    const label = this.normalizedHazardName(hazard) || String(hazard || 'hazards').trim() || 'hazards';
    const missedEffect = label === 'Toxic Spikes'
      ? 'without getting poisoned'
      : label === 'Sticky Web'
        ? 'without getting slowed'
        : 'without taking chip';
    const itemText = this.joinWithOr(this.protectionRecoveryItemsForHazard(label)) || 'item-based protection';
    const sourceText = String(source || '').trim() || 'another source';
    if (state?.removedItem === 'Air Balloon') {
      return `Later switched through ${label} after Air Balloon popped ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
    }
    if (state?.removedItem === 'Heavy-Duty Boots') {
      return `Later switched through ${label} after Heavy-Duty Boots were removed ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
    }
    return `Later switched through ${label} after ${state?.removedItem || 'the old item'} left the slot ${missedEffect}, but Neutralizing Gas from ${sourceText} was suppressing abilities then, so this only keeps ${itemText} live for the new current-state explanation.`;
  }
  markPostItemLossSuppressedProtection(state: SpeciesState | null, hazard = '', source = ''): void {
    if (!state) return;
    state.postItemLossProtectionRecovered = true;
    this.addPostItemLossProtectionHints(state, hazard, { includeAbilities: false });
    this.addPostItemLossNote(state, this.postItemLossSuppressedProtectionNote(state, hazard, source));
  }
  applyAbilitySuppression(state: SpeciesState | null, turn: number, effect = ''): void {
    const label = this.abilitySuppressionEffect(effect);
    if (!state || !label) return;
    state.abilitySuppressed = true;
    state.abilitySuppressionEffect = label;
    this.addEvidence(state, turn || 0, 'reveal', `${state.species} had its ability suppressed by ${label}`, 'Ability suppression active', 2.5, { soft: true });
    this.addClueObservation(state, { turn: turn || 0, label: `${label} landed` });
    this.addAbilityContradictionNote(state, this.abilitySuppressionNote(label));
  }
  applyFieldAbilitySuppression(state: SpeciesState | null, turn: number, ability = ''): void {
    const label = String(ability || '').trim();
    if (!state?.slot || label !== 'Neutralizing Gas') return;
    this.ensureFieldSuppressionState()[state.slot] = state.species || label;
  }
  recordFieldAbilitySuppression(state: SpeciesState | null, turn: number): void {
    const note = this.fieldAbilitySuppressionNote(state);
    if (!state || !note) return;
    if ((state.abilityContradictionNotes || []).includes(note)) return;
    this.addAbilityContradictionNote(state, note);
    this.addEvidence(state, turn || 0, 'reveal', `Neutralizing Gas was active while ${state.species} took this interaction`, 'Field-wide ability suppression active', 2.5, { soft: true });
    this.addClueObservation(state, { turn: turn || 0, label: 'Neutralizing Gas active' });
  }
  clearAbilitySuppression(state: SpeciesState | null, effect = ''): void {
    const label = this.abilitySuppressionEffect(effect) || String(effect || '').trim();
    if (!state) return;
    if (label && state.abilitySuppressionEffect && label !== state.abilitySuppressionEffect) return;
    state.abilitySuppressed = false;
    state.abilitySuppressionEffect = '';
  }
  clearFieldAbilitySuppression(slot = ''): void {
    const key = String(slot || '').trim();
    if (!key) return;
    delete this.ensureFieldSuppressionState()[key];
  }
  groundMoveProtectedAbilities(state: SpeciesState | { species?: string } | null, move = ''): string[] {
    if (!this.isGroundProtectionMove(move)) return [];
    return detectiveAbilities(state?.species || '').filter((ability) => ['Levitate', 'Earth Eater'].includes(ability));
  }
  moveAbilityBypassProtectedAbilities(state: SpeciesState | { species?: string } | null, move = '', status = ''): string[] {
    if (this.abilitySuppressionActive(state)) return [];
    const moveName = String(move || '').trim();
    const sideConditionAbility = this.normalizedHazardName(moveName) ? ['Magic Bounce'] : [];
    const base = this.stillPossibleProtectionAbilities(state, unique([
      ...sideConditionAbility,
      ...detectiveAbilities(state?.species || '').filter((candidate) => !sideConditionAbility.length && this.abilityTriggeredByMove(candidate, moveName)),
      ...this.majorStatusBlockingAbilitiesWithoutBypass(state, status),
      ...this.groundMoveProtectedAbilities(state, moveName),
    ]));
    // status-control layer appended after suppression/bypass — mirrors legacy
    return unique([...base, ...controlStatusBlockedAbilities(state?.species || '', moveName)]);
  }
  moveAbilityBypassNote(state: SpeciesState | null, move = '', status = ''): string {
    const ability = this.moveAbilityBypass(state, move);
    const moveName = String(move || '').trim();
    const abilities = this.moveAbilityBypassProtectedAbilities(state, moveName, status);
    if (!ability || !moveName || !abilities.length) return '';
    return `${ability} let ${moveName} bypass ${this.joinWithOr(abilities)}, so that landed move does not rule out the base ability.`;
  }
  recordMoveAbilityBypass(state: SpeciesState | null, turn: number, move = '', status = ''): void {
    const note = this.moveAbilityBypassNote(state, move, status);
    const ability = this.moveAbilityBypass(state, move);
    const moveName = String(move || '').trim();
    if (!state || !note || !ability || !moveName) return;
    if ((state.abilityContradictionNotes || []).includes(note)) return;
    this.addAbilityContradictionNote(state, note);
    this.addEvidence(state, turn || 0, 'reveal', `${ability} bypassed the target ability checks for ${moveName}`, 'Ability bypass window active', 2, { soft: true });
    this.addClueObservation(state, { turn: turn || 0, move: moveName, label: `${ability} bypassed ${moveName}` });
  }

  // -------------------------------------------------------------------------
  // extractEvidence — merged patch order (patch pre-pass → deduced branches →
  // base handlers → item-transfer post-pass)
  // -------------------------------------------------------------------------

  addEvidence(state: SpeciesState | null, turn: number, source: string, text: string, conclusion: string, score: number, extra: Partial<ReplayEvidence> = {}): void {
    if (!state || !state.species) return;
    const item = { turn, species: state.species, source, text, conclusion, score, ...extra } as ReplayEvidence;
    state.evidence.push(item);
    state.score += score || 0;
    this.evidence.push(item);
  }

  // Event types the replay-ability patch handles without delegating to the
  // base extractor — pending entry checks are NOT resolved on these (legacy
  // parity: the patched branches return early without calling original).
  private static readonly RESOLVE_SKIP_TYPES = new Set(['-heal', '-boost', '-immune', '-start', '-singleturn', '-singlemove']);

  extractEvidence(event: ReplayEvent, turn: number): void {
    if (!ReplayParser.RESOLVE_SKIP_TYPES.has(event?.type || '')) {
      this.resolvePendingEntryChecksForEvent(turn, event);
    }
    const handled = this.extractEvidencePatched(event, turn);
    // ---- item-transfer-timeline post-pass ----
    this.itemTransferPostPass(event, turn);
    void handled;
  }

  private itemTransferPostPass(event: ReplayEvent, turn: number): void {
    const state = event?.target ? this.ensureState(event.target, event.details || '') : null;
    const item = transferredItemName(event);
    const source = trackedItemSource(event);
    if (state && event?.type === '-enditem' && !source && item) {
      clearTransferredCurrentItem(state, item);
    }
    if (!source || !event?.target) return;
    if (!state || !item) return;
    if (event.type === '-enditem') {
      state.removedItem = item;
      state.itemGone = true;
      state.itemTransferMove = trackedSourceLabel(source);
      state.itemTransferSource = source;
      state.lastTransferredOutItem = item;
      clearTransferredCurrentItem(state, item);
    } else if (event.type === '-item') {
      state.acquiredItem = item;
      state.currentTransferredItem = item;
      state.revealedItem = item;
      state.itemGone = false;
      state.itemTransferMove = trackedSourceLabel(source);
      state.itemTransferSource = source;
      this.addEvidence(state, turn || 0, 'reveal', `${state.species} received ${item} from ${trackedSourceLabel(source)}`, 'Transferred item confirmed', 4, { hard: true, revealedItem: item });
      this.addClueObservation(state, { turn: turn || 0, label: `${trackedSourceLabel(source)} revealed ${item} as the new item` });
    }
  }

  private extractEvidencePatched(event: ReplayEvent, turn: number): boolean {
    // ----- replay-ability pre-pass bookkeeping -----
    if (event?.type === '-weather') {
      this.recordReplayWeather(event.weather || '');
      return true; // base has no -weather handler
    }
    if ((event?.type === 'switch' || event?.type === 'drag') && event?.pokemon) {
      const slot = this.slotId(event.pokemon);
      if (slot) this.clearFieldAbilitySuppression(slot);
      this.clearAbilitySuppression(this.ensureState(event.pokemon, event.details || ''));
    }
    if (event?.type === 'faint' && (event?.target || event?.pokemon)) {
      const slot = this.slotId((event.target || event.pokemon) as string);
      if (slot) this.clearFieldAbilitySuppression(slot);
    }
    if (event?.type === '-ability' && event.target && this.abilityBypassAbility(event.ability || '')) {
      const state = this.ensureState(event.target);
      const moveEvent = [...this.turnMoves].reverse().find((x) => x.slot === state?.slot);
      if (moveEvent) moveEvent.abilityBypass = event.ability;
    }
    if (event?.type === '-ability' && event.target && String(event.ability || '').trim() === 'Neutralizing Gas') {
      this.applyFieldAbilitySuppression(this.ensureState(event.target), turn, event.ability || '');
    }
    if (event?.type === '-status' && event.target && !this.normalizedHazardName(event.from || '')) {
      const state = this.ensureState(event.target);
      state.currentStatus = event.status || state.currentStatus || '';
    } else if (event?.type === '-curestatus') {
      const parts = String(event.raw || '').split('|').filter(Boolean);
      const target = event.target || parts[1] || '';
      if (target) {
        const state = this.ensureState(target);
        state.currentStatus = '';
      }
    }

    // ----- patched branch: -sidestart with a landed hazard-setting move -----
    if (event?.type === '-sidestart' && event.side && event.condition) {
      const state = this.activeStateForSide(event.side);
      const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && this.slotSide(x.slot) !== event.side);
      const landedMove = this.sideConditionLandedMove(event, moveEvent || null);
      if (state && landedMove) {
        this.recordFieldAbilitySuppression(state, turn);
        this.recordMoveAbilityBypass(state, turn, landedMove);
        this.ruleOutAbilities(
          state,
          turn,
          this.moveBlockedAbilities(state, landedMove),
          this.landedMoveContradictionNote(state, landedMove),
          `${landedMove} landed`,
        );
      }
      this.setSideCondition(event.side, event.condition, true);
      return true;
    }
    if (event?.type === '-sideend' && event.side && event.condition) {
      this.setSideCondition(event.side, event.condition, false);
      return true;
    }
    if (event?.type === '-activate' && event.target && this.normalizedHazardName(event.effect || '')) {
      this.recordFieldAbilitySuppression(this.ensureState(event.target), turn);
      // base -activate handler (Sticky Web trigger)
      const state = this.ensureState(event.target);
      const hazard = this.normalizedHazardName(event.effect || '');
      if (hazard === 'Sticky Web') {
        state.tookHazardDamage = true;
        this.addHazardEvent(state, turn, hazard);
        if (state.itemGone) this.addPostItemLossNote(state, this.hazardTimelineNote(state, hazard));
        this.ruleOutAbilities(state, turn, this.hazardAbilityContradictions(state, hazard), this.hazardContradictionNote(state, hazard), this.abilityContradictionLabel(this.hazardAbilityContradictions(state, hazard), hazard));
        this.addEvidence(state, turn, 'hazard', `${state.species} triggered Sticky Web`, 'Heavy-Duty Boots: IMPOSSIBLE', 4, { hard: true });
      }
      return true;
    }
    if (event?.type === '-damage' && event.target) {
      const hazardFrom = this.normalizedHazardName(event.from || '');
      const state = this.ensureState(event.target);
      if (!hazardFrom) {
        this.recordFieldAbilitySuppression(state, turn);
        const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
        this.recordMoveAbilityBypass(state, turn, moveEvent?.move || '');
      } else {
        this.recordFieldAbilitySuppression(state, turn);
      }
      this.extractDamageEvidence(event, turn);
      return true;
    }
    if (event?.type === '-status' && event.target) {
      const hazard = this.normalizedHazardName(event.from || '');
      const state = this.ensureState(event.target);
      this.recordFieldAbilitySuppression(state, turn);
      const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
      const duplicateHazardAbilities = hazard === 'Toxic Spikes' ? this.hazardAbilityContradictions(state, hazard) : [];
      const statusAbilities = this.majorStatusBlockingAbilities(state, event.status || '', moveEvent?.move || '').filter((ability) => !duplicateHazardAbilities.includes(ability));
      this.recordMoveAbilityBypass(state, turn, moveEvent?.move || '', event.status || '');
      if (statusAbilities.length) {
        this.ruleOutAbilities(
          state,
          turn,
          statusAbilities,
          this.statusImmunityContradictionNote(state, event.status || '', moveEvent?.move || ''),
          this.statusImmunityContradictionLabel(event.status || '', moveEvent?.move || ''),
        );
      }
      if (hazard !== 'Toxic Spikes' && !this.abilitySource(event.from || '') && !this.itemSource(event.from || '')) {
        const landedMove = moveEvent?.move && this.replaySafeMoveCategory(moveEvent.move) === 'Status' ? moveEvent.move : '';
        if (landedMove) {
          this.ruleOutAbilities(
            state,
            turn,
            this.moveBlockedAbilities(state, landedMove),
            this.landedMoveContradictionNote(state, landedMove),
            `${landedMove} landed`,
          );
        }
      }
      if (event.from && hazard === 'Toxic Spikes') {
        state.tookHazardDamage = true;
        this.addHazardEvent(state, turn, hazard);
        if (state.itemGone) this.addPostItemLossNote(state, this.hazardTimelineNote(state, hazard));
        this.ruleOutAbilities(state, turn, this.hazardAbilityContradictions(state, hazard), this.hazardContradictionNote(state, hazard), this.abilityContradictionLabel(this.hazardAbilityContradictions(state, hazard), hazard));
        this.addEvidence(state, turn, 'hazard', `${state.species} was afflicted by Toxic Spikes`, 'Heavy-Duty Boots: IMPOSSIBLE', 4, { hard: true });
      }
      return true;
    }
    if (event?.type === '-curestatus') {
      return true; // base has no handler
    }
    if (event?.type === '-heal' && event.target && event.from) {
      const state = this.ensureState(event.target);
      const ability = this.abilitySource(event.from);
      if (ability) {
        const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
        if (state.itemGone && this.groundProtectionRecoveryAbilitiesForMove(state, moveEvent?.move || '').includes(ability)) {
          this.addPostItemLossGroundProtectionHints(state, moveEvent?.move || '', { includeItems: false });
          this.addPostItemLossGroundNote(state, this.postItemLossGroundAbilityProtectionNote(state, moveEvent?.move || ''));
        }
        this.recordAbilityReveal(state, turn, ability, moveEvent || null, `${state.species} restored HP with ${ability}`, '', { assumeReactiveMove: true });
      }
      return true;
    }
    if (event?.type === '-boost' && event.target && event.from) {
      const state = this.ensureState(event.target);
      const ability = this.abilitySource(event.from);
      if (ability) {
        const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
        if (state.itemGone && this.groundProtectionRecoveryAbilitiesForMove(state, moveEvent?.move || '').includes(ability)) {
          this.addPostItemLossGroundProtectionHints(state, moveEvent?.move || '', { includeItems: false });
          this.addPostItemLossGroundNote(state, this.postItemLossGroundAbilityProtectionNote(state, moveEvent?.move || ''));
        }
        this.recordAbilityReveal(state, turn, ability, moveEvent || null, `${state.species} gained a boost from ${ability}`, '', { assumeReactiveMove: true });
      }
      return true;
    }
    if (event?.type === '-immune' && event.target && event.from) {
      const state = this.ensureState(event.target);
      const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
      const item = this.itemSource(event.from);
      if (item) {
        state.revealedItem = item;
        this.addEvidence(state, turn, 'reveal', `${state.species} was protected by ${item}`, 'Item confirmed', 4, { hard: true, revealedItem: item });
        this.addClueObservation(state, { turn, move: moveEvent?.move || '', label: this.blockedItemClueLabel(item, moveEvent?.move || '') });
        if (state.itemGone && this.groundProtectionRecoveryItemsForMove(state, moveEvent?.move || '').includes(item)) {
          state.postItemLossGroundProtectionRecovered = true;
          this.addPostItemLossGroundProtectionHints(state, moveEvent?.move || '');
          this.addPostItemLossGroundNote(state, this.postItemLossGroundProtectionNote(state, moveEvent?.move || ''));
        }
        return true;
      }
      const ability = this.abilitySource(event.from);
      if (ability) {
        if (state.itemGone && this.groundProtectionRecoveryAbilitiesForMove(state, moveEvent?.move || '').includes(ability)) {
          this.addPostItemLossGroundProtectionHints(state, moveEvent?.move || '', { includeItems: false });
          this.addPostItemLossGroundNote(state, this.postItemLossGroundAbilityProtectionNote(state, moveEvent?.move || ''));
        }
        const clueLabel = moveEvent?.move ? `${ability} blocked ${moveEvent.move}` : `${ability} revealed`;
        this.recordAbilityReveal(state, turn, ability, moveEvent || null, `${state.species} was protected by ${ability}`, clueLabel, { assumeReactiveMove: true });
      }
      return true;
    }
    if (event?.type === '-singleturn' || event?.type === '-singlemove') {
      const parts = String(event.raw || '').split('|').filter(Boolean);
      const target = event.target || parts[1] || '';
      const effect = event.effect || parts[2] || '';
      if (target && effect) {
        const state = this.ensureState(target);
        const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
        const landedMove = this.singleEffectMove({ ...event, target, effect }, moveEvent || null);
        if (landedMove) {
          this.recordFieldAbilitySuppression(state, turn);
          this.recordMoveAbilityBypass(state, turn, landedMove);
          this.ruleOutAbilities(
            state,
            turn,
            this.moveBlockedAbilities(state, landedMove),
            this.landedMoveContradictionNote(state, landedMove),
            `${landedMove} landed`,
          );
        }
      }
      return true;
    }
    if (event?.type === '-start') {
      const parts = String(event.raw || '').split('|').filter(Boolean);
      const target = event.target || parts[1] || '';
      const effect = event.effect || parts[2] || '';
      if (target && effect) {
        const state = this.ensureState(target);
        const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
        const landedMove = this.startEffectMove({ ...event, target, effect }, moveEvent || null);
        if (landedMove) {
          this.recordFieldAbilitySuppression(state, turn);
          this.recordMoveAbilityBypass(state, turn, landedMove);
          this.ruleOutAbilities(
            state,
            turn,
            this.moveBlockedAbilities(state, landedMove),
            this.landedMoveContradictionNote(state, landedMove),
            `${landedMove} landed`,
          );
        }
        this.applyAbilitySuppression(state, turn, effect);
      }
      return true;
    }
    if (event?.type === '-end') {
      const parts = String(event.raw || '').split('|').filter(Boolean);
      const target = event.target || parts[1] || '';
      const effect = event.effect || parts[2] || '';
      if (target && effect) {
        const state = this.ensureState(target);
        this.clearAbilitySuppression(state, effect);
        if (this.startEffectName(effect) === 'Neutralizing Gas') this.clearFieldAbilitySuppression(state?.slot || '');
      }
      return true;
    }
    return this.extractEvidenceBase(event, turn);
  }

  // ----- base app.js extractEvidence handlers -----
  private extractEvidenceBase(event: ReplayEvent, turn: number): boolean {
    if (event.type === 'switch' || event.type === 'drag') {
      const state = this.ensureState(event.pokemon || '', event.details || '');
      if (state) {
        state.lastMove = '';
        state.lastDamagingMove = '';
        state.lastMoveTurn = 0;
        this.queueEntryCheck(state, turn);
      }
      return true;
    }
    if (event.type === 'move' && event.attacker) {
      const state = this.ensureState(event.attacker);
      state.lastMove = event.move || '';
      const meta = moveMeta(event.move || '');
      if (meta && meta[1] === 'Status') {
        state.usedStatusMove = true;
        this.addEvidence(state, turn, 'status', `${state.species} used status move ${event.move}`, 'Assault Vest: IMPOSSIBLE', 4, { hard: true });
      } else if (meta && meta[1] !== 'Status') {
        if (state.lastDamagingMove && state.lastMoveTurn !== turn) {
          if (state.lastDamagingMove === event.move) {
            state.repeatedDamagingMove = true;
            this.addEvidence(state, turn, 'damage', `${state.species} repeated ${event.move} without switching`, 'Choice item clue', 1.5, { soft: true });
          } else {
            state.choiceContradiction = true;
            this.addEvidence(state, turn, 'status', `${state.species} used ${state.lastDamagingMove} and later ${event.move} without switching`, 'Choice items contradicted', 4, { hard: true });
          }
        }
        state.lastDamagingMove = event.move || '';
        state.lastMoveTurn = turn;
      }
      const moveEntry: TurnMove = { slot: state.slot, species: state.species, move: event.move || '', priority: movePriority(event.move || '') };
      this.turnMoves.push(moveEntry);
      if (this.turnMoves.length === 2) {
        const [first, second] = this.turnMoves;
        if (first.species !== second.species && first.priority === second.priority && first.priority === 0) {
          const firstState = this.ensureState(first.slot);
          const secondState = this.ensureState(second.slot);
          this.applyTurnSpeedContext(firstState, turn, 'fasterThan', second.species);
          this.addEvidence(firstState, turn, 'damage', `${firstState.species} moved before ${second.species} in a neutral-priority exchange`, 'Soft speed clue', 1, { soft: true, opponentSpecies: second.species });
          this.applyTurnSpeedContext(secondState, turn, 'slowerThan', first.species);
          this.addEvidence(secondState, turn, 'damage', `${secondState.species} moved after ${first.species} in a neutral-priority exchange`, 'Soft speed clue', 1, { soft: true, opponentSpecies: first.species });
        }
      }
      return true;
    }
    if (event.type === '-item' && event.target && event.item) {
      const state = this.ensureState(event.target);
      const previousItem = state.revealedItem;
      const previousRemovedItem = state.removedItem;
      const wasItemGone = !!state.itemGone;
      const transferMove = this.itemTransferMove(event.from || '');
      const transitionNote = wasItemGone && previousRemovedItem
        ? this.reacquiredItemNote(previousRemovedItem, event.item, event.from || '')
        : transferMove && previousItem && previousItem !== event.item
          ? this.itemTransferNote(previousItem, event.item, transferMove)
          : '';
      if (transitionNote) this.addHistoricalItemNote(state, transitionNote);
      state.revealedItem = event.item;
      state.removedItem = '';
      state.itemGone = false;
      state.itemLossLabel = '';
      state.itemLossNote = '';
      state.itemLossTurn = 0;
      state.postItemLossNotes = [];
      state.postItemLossProtectionRecovered = false;
      state.postItemLossProtectionItems = [];
      state.postItemLossProtectionAbilities = [];
      state.postItemLossGroundNotes = [];
      state.postItemLossGroundProtectionRecovered = false;
      state.postItemLossGroundProtectionItems = [];
      state.postItemLossGroundProtectionAbilities = [];
      this.addEvidence(state, turn, 'reveal', `${state.species} revealed ${event.item}`, 'Item confirmed', 5, { hard: true, revealedItem: event.item });
      this.addClueObservation(state, { turn, label: this.itemClueLabel(event.item) });
      return true;
    }
    if (event.type === '-enditem' && event.target && event.item) {
      const state = this.ensureState(event.target);
      const loss = this.describeItemLoss(event);
      state.removedItem = event.item;
      state.itemGone = true;
      state.itemLossLabel = loss.clueLabel;
      state.itemLossNote = loss.note;
      state.itemLossTurn = turn;
      if (state.revealedItem === event.item) state.revealedItem = '';
      state.postItemLossNotes = [];
      state.postItemLossProtectionRecovered = false;
      state.postItemLossProtectionItems = [];
      state.postItemLossProtectionAbilities = [];
      state.postItemLossGroundNotes = [];
      state.postItemLossGroundProtectionRecovered = false;
      state.postItemLossGroundProtectionItems = [];
      state.postItemLossGroundProtectionAbilities = [];
      this.addPostItemLossNote(state, this.hazardTimelineNote(state));
      const sourceText = String(event.from || '').trim();
      const sourceDetail = sourceText ? ` via ${sourceText.replace(/^move: /, '')}` : '';
      this.addEvidence(state, turn, 'reveal', `${state.species} lost ${event.item}${sourceDetail}`, 'Current item no longer present', 4.5, { hard: true, removedItem: event.item, itemGone: true });
      this.addClueObservation(state, { turn, label: loss.clueLabel });
      const ability = this.abilitySource(event.from || '');
      if (ability) {
        this.recordAbilityReveal(state, turn, ability, null, `${state.species} revealed ${ability}`, `${ability} confirmed`);
      }
      return true;
    }
    if ((event.type === '-activate' || event.type === '-ability') && event.target && event.ability) {
      const state = this.ensureState(event.target);
      this.recordAbilityReveal(state, turn, event.ability, null, `${state.species} revealed ${event.ability}`);
      return true;
    }
    return false;
  }

  private extractDamageEvidence(event: ReplayEvent, turn: number): void {
    const state = this.ensureState(event.target || '');
    if (event.from && /Stealth Rock|Spikes|Toxic Spikes/i.test(event.from)) {
      state.tookHazardDamage = true;
      this.addHazardEvent(state, turn, event.from);
      if (state.itemGone) this.addPostItemLossNote(state, this.hazardTimelineNote(state, event.from));
      this.ruleOutAbilities(state, turn, this.hazardAbilityContradictions(state, event.from), this.hazardContradictionNote(state, event.from), this.abilityContradictionLabel(this.hazardAbilityContradictions(state, event.from), this.normalizedHazardName(event.from)));
      this.addEvidence(state, turn, 'hazard', `${state.species} took hazard damage`, 'Heavy-Duty Boots: IMPOSSIBLE', 4, { hard: true });
      return;
    }
    const pct = this.pctFromFraction(event.damage || '');
    const moveEvent = [...this.turnMoves].reverse().find((x) => x.species && state.slot !== x.slot);
    if (state.itemGone) this.addPostItemLossNote(state, this.groundTimelineNote(state, moveEvent?.move || ''));
    this.ruleOutAbilities(state, turn, this.moveBlockedAbilities(state, moveEvent?.move || ''), this.moveContradictionNote(state, moveEvent?.move || ''), this.abilityContradictionLabel(this.moveBlockedAbilities(state, moveEvent?.move || ''), moveEvent?.move || ''));
    if (pct !== null && moveEvent) {
      this.addEvidence(this.ensureState(moveEvent.slot), turn, 'damage', `${moveEvent.species} dealt ${pct}% with ${moveEvent.move}`, 'Damage-roll evidence available', 1, { move: moveEvent.move, observedDamage: pct, evidenceType: 'they_hit_me', targetSpecies: state.species });
      const attackerState = this.ensureState(moveEvent.slot);
      const attackerSpeedContext = this.turnSpeedContext(attackerState, turn);
      this.addDamageObservation(attackerState, { turn, move: moveEvent.move, observedDamage: pct, evidence: 'they_hit_me', targetSpecies: state.species, speedContext: attackerSpeedContext ? { relation: attackerSpeedContext.relation, opponentSpecies: attackerSpeedContext.opponentSpecies } : null, movedFirst: attackerSpeedContext?.relation === 'fasterThan', movedSecond: attackerSpeedContext?.relation === 'slowerThan' });
      this.addEvidence(state, turn, 'damage', `${state.species} took ${pct}% from ${moveEvent.species}'s ${moveEvent.move}`, 'Defensive damage-roll evidence available', 1.25, { move: moveEvent.move, observedDamage: pct, evidenceType: 'i_hit_them', userSpecies: moveEvent.species });
      const defenderSpeedContext = this.turnSpeedContext(state, turn);
      this.addDamageObservation(state, { turn, move: moveEvent.move, observedDamage: pct, evidence: 'i_hit_them', userSpecies: moveEvent.species, speedContext: defenderSpeedContext ? { relation: defenderSpeedContext.relation, opponentSpecies: defenderSpeedContext.opponentSpecies } : null, movedFirst: defenderSpeedContext?.relation === 'fasterThan', movedSecond: defenderSpeedContext?.relation === 'slowerThan' });
    } else if (pct !== null) {
      this.addEvidence(state, turn, 'damage', `${state.species} changed to ${pct}% HP`, 'Damage-roll evidence available', 0.5, { observedDamage: pct });
    }
  }


  pctFromFraction(value: string): number | null {
    const match = String(value || '').match(/(\d+)\/(\d+)/);
    if (!match) return null;
    return Math.round((+match[1]) / (+match[2]) * 100);
  }

  bestDamageObservation(state: SpeciesState | null): DetectiveInput | null {
    return state ? (this.detectiveInputsFromState(state)[0] || null) : null;
  }

  detectiveInputsFromState(state: SpeciesState): DetectiveInput[] {
    const currentTookHazardDamage = this.currentStateTookHazardDamage(state);
    const historicalHazardDamage = this.historicalHazardEvents(state).length > 0;
    const shared = () => ({
      usedStatusMove: state.usedStatusMove,
      tookHazardDamage: currentTookHazardDamage,
      historicalHazardDamage,
      repeatedDamagingMove: state.repeatedDamagingMove,
      revealedAbility: state.abilityHints.length === 1 ? state.abilityHints[0] : undefined,
      abilityHints: state.abilityHints.slice(),
      ruledOutAbilities: (state.ruledOutAbilities || []).slice(),
      abilityContradictionNotes: (state.abilityContradictionNotes || []).slice(),
      choiceContradiction: state.choiceContradiction,
      removedItem: state.removedItem || undefined,
      itemGone: !!state.itemGone,
      itemLossLabel: state.itemLossLabel || undefined,
      itemLossNote: state.itemLossNote || undefined,
      historicalItemNotes: (state.historicalItemNotes || []).slice(),
      postItemLossProtectionRecovered: !!state.postItemLossProtectionRecovered,
      postItemLossProtectionItems: (state.postItemLossProtectionItems || []).slice(),
      postItemLossProtectionAbilities: (state.postItemLossProtectionAbilities || []).slice(),
      postItemLossNotes: (state.postItemLossNotes || []).slice(),
      postItemLossGroundProtectionRecovered: !!state.postItemLossGroundProtectionRecovered,
      postItemLossGroundProtectionItems: (state.postItemLossGroundProtectionItems || []).slice(),
      postItemLossGroundProtectionAbilities: (state.postItemLossGroundProtectionAbilities || []).slice(),
      postItemLossGroundNotes: (state.postItemLossGroundNotes || []).slice(),
      revealedItem: state.revealedItem || undefined,
    });
    const baseInputs: DetectiveInput[] = (state?.damageObservations || []).map((obs, index) => ({
      species: state.species,
      move: obs.move,
      observedDamage: obs.observedDamage,
      evidence: obs.evidence,
      targetSpecies: obs.targetSpecies,
      userSpecies: obs.userSpecies,
      movedFirst: obs.movedFirst ?? state.movedFirst,
      movedSecond: obs.movedSecond ?? state.movedSecond,
      speedContext: obs.speedContext ? { ...obs.speedContext } : (state.speedContext ? { ...state.speedContext } : null),
      _index: index,
      _turn: obs.turn || 0,
      ...shared(),
    }));
    const clueInputs: DetectiveInput[] = !baseInputs.length
      ? (state?.clueObservations || []).map((obs, index) => ({
          species: state.species,
          move: obs.move || '',
          observedDamage: null,
          evidence: 'clue_only',
          clueLabel: obs.label,
          movedFirst: obs.movedFirst ?? state.movedFirst,
          movedSecond: obs.movedSecond ?? state.movedSecond,
          speedContext: obs.speedContext ? { ...obs.speedContext } : (state.speedContext ? { ...state.speedContext } : null),
          _index: index,
          _turn: obs.turn || 0,
          ...shared(),
        }))
      : [];
    const allInputs = baseInputs.length ? baseInputs : clueInputs;
    if (!allInputs.length) return [];
    const deduped: DetectiveInput[] = [];
    const seen = new Set<string>();
    allInputs
      .sort((a, b) => {
        const anchorA = (a.targetSpecies ? 1 : 0) + (a.userSpecies ? 1 : 0);
        const anchorB = (b.targetSpecies ? 1 : 0) + (b.userSpecies ? 1 : 0);
        return (anchorB - anchorA) || (((b._turn as number) || 0) - ((a._turn as number) || 0)) || (((b._index as number) || 0) - ((a._index as number) || 0));
      })
      .forEach((input) => {
        const key = [
          input.evidence || '',
          input.move || '',
          input.observedDamage,
          input.targetSpecies || '',
          input.userSpecies || '',
        ].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(input);
      });
    return deduped.map((input) => {
      const { _index, _turn, ...rest } = input;
      return rest;
    });
  }

  detectiveInputLabel(input: DetectiveInput | null): string {
    if (!input) return 'Replay clue';
    if (input.evidence === 'clue_only') {
      if (input.clueLabel) return input.clueLabel;
      if (input.revealedAbility) return `${input.revealedAbility} clue`;
      if (input.revealedItem) return `${input.revealedItem} clue`;
      return `${input.species} replay clue`;
    }
    if (input.evidence === 'they_hit_me') {
      return input.targetSpecies ? `${input.move} into ${input.targetSpecies}` : `${input.move} damage clue`;
    }
    if (input.evidence === 'i_hit_them') {
      return input.userSpecies ? `${input.userSpecies} into ${input.species}` : `${input.species} took ${input.move}`;
    }
    return `${input.move} clue`;
  }

  buildReplayRead(): ReplayRead {
    const targets: ReplayTarget[] = Object.values(this.speciesState)
      .filter((state) => state.species && state.evidence.length)
      .map((state) => {
        const detectiveInputs = this.detectiveInputsFromState(state);
        const bestObservation = detectiveInputs[0] || null;
        const currentTookHazardDamage = this.currentStateTookHazardDamage(state);
        const historicalHazardDamage = this.historicalHazardEvents(state).length > 0;
        const speedNotes = unique((state.speedContexts || []).map((ctx) => {
          if (ctx.relation === 'fasterThan' && ctx.opponentSpecies) return `Moved before ${ctx.opponentSpecies} in a neutral-priority exchange`;
          if (ctx.relation === 'slowerThan' && ctx.opponentSpecies) return `Moved after ${ctx.opponentSpecies} in a neutral-priority exchange`;
          return '';
        }).filter(Boolean));
        const uniqueNotes = unique([
          state.revealedItem ? `${state.revealedItem} confirmed` : '',
          state.itemGone ? (state.itemLossLabel || `${state.removedItem} was removed`) : '',
          state.itemGone && state.itemLossNote ? state.itemLossNote : '',
          ...(state.historicalItemNotes || []),
          ...(state.postItemLossNotes || []),
          ...(state.postItemLossGroundNotes || []),
          ...(state.abilityContradictionNotes || []),
          ...state.abilityHints.map((a) => {
            const reward = this.abilityRewardText(a);
            return reward ? `${a} revealed (${reward})` : `${a} revealed`;
          }),
          currentTookHazardDamage ? 'Boots ruled out for current item state' : historicalHazardDamage ? 'Pre-loss hazard chip only ruled out Boots before the old item left' : '',
          state.usedStatusMove ? 'Assault Vest ruled out' : '',
          state.choiceContradiction ? 'Choice items contradicted' : '',
          state.repeatedDamagingMove ? 'Repeated move hints at Choice locking' : '',
          ...speedNotes,
          state.movedFirst && !state.speedContext?.opponentSpecies ? 'Moved first in a neutral-priority exchange' : '',
          state.movedSecond && !state.speedContext?.opponentSpecies ? 'Moved after a neutral-priority exchange' : '',
        ].filter(Boolean));
        return {
          species: state.species,
          side: state.side,
          score: state.score,
          evidenceCount: state.evidence.length,
          detectiveBranchCount: detectiveInputs.length,
          notes: uniqueNotes,
          revealedItem: state.revealedItem,
          removedItem: state.removedItem || undefined,
          itemGone: state.itemGone,
          revealedAbility: state.abilityHints.length === 1 ? state.abilityHints[0] : undefined,
          ruledOutAbilities: (state.ruledOutAbilities || []).slice(),
          abilityContradictionNotes: (state.abilityContradictionNotes || []).slice(),
          postItemLossProtectionRecovered: !!state.postItemLossProtectionRecovered,
          postItemLossNotes: (state.postItemLossNotes || []).slice(),
          postItemLossGroundProtectionRecovered: !!state.postItemLossGroundProtectionRecovered,
          postItemLossGroundNotes: (state.postItemLossGroundNotes || []).slice(),
          abilityHints: state.abilityHints.slice(),
          usedStatusMove: state.usedStatusMove,
          tookHazardDamage: currentTookHazardDamage,
          historicalHazardDamage,
          repeatedDamagingMove: state.repeatedDamagingMove,
          choiceContradiction: state.choiceContradiction,
          movedFirst: state.movedFirst,
          movedSecond: state.movedSecond,
          speedContext: state.speedContext ? { ...state.speedContext } : null,
          postItemLossProtectionItems: (state.postItemLossProtectionItems || []).slice(),
          postItemLossProtectionAbilities: (state.postItemLossProtectionAbilities || []).slice(),
          postItemLossGroundProtectionItems: (state.postItemLossGroundProtectionItems || []).slice(),
          postItemLossGroundProtectionAbilities: (state.postItemLossGroundProtectionAbilities || []).slice(),
          detectiveInput: bestObservation,
          detectiveInputs: detectiveInputs.map((input) => ({
            ...input,
            label: this.detectiveInputLabel(input),
          })),
          evidence: state.evidence.slice(),
        };
      })
      .sort((a, b) => ((b.detectiveBranchCount > 0 ? 1 : 0) - (a.detectiveBranchCount > 0 ? 1 : 0)) || b.score - a.score || b.detectiveBranchCount - a.detectiveBranchCount || b.evidenceCount - a.evidenceCount);
    const speciesCounts = targets.reduce<Record<string, number>>((acc, target) => {
      acc[target.species] = (acc[target.species] || 0) + 1;
      return acc;
    }, {});
    targets.forEach((target) => {
      target.displaySpecies = speciesCounts[target.species] > 1 && target.side
        ? `${target.species} (${target.side})`
        : target.species;
    });
    return { targets, strongest: targets[0] || null };
  }
}

// ---------------------------------------------------------------------------
// Module-level API
// ---------------------------------------------------------------------------

/** Parse a Showdown log into turns + a structured replay read. */
export function parseReplay(log: string): ReplayParseResult {
  const parser = new ReplayParser();
  const turns = parser.parse(log);
  return { turns, evidence: parser.evidence, read: parser.replayRead, parser };
}

/** Convenience wrapper: parsed turns, evidence grouped by turn, and the read. */
export function analyzeReplay(log: string): ReplayAnalysis {
  const parsed = parseReplay(log);
  const evidenceByTurn: Record<number, ReplayEvidence[]> = {};
  parsed.evidence.forEach((item) => {
    const t = item.turn || 0;
    (evidenceByTurn[t] = evidenceByTurn[t] || []).push(item);
  });
  return { ...parsed, targetCount: parsed.read.targets.length, strongest: parsed.read.strongest, evidenceByTurn };
}

/**
 * Pure port of copyReplaySummary — builds the summary payload without touching
 * the clipboard.
 */
export function buildReplaySummary(read: ReplayRead | null | undefined): ReplaySummary {
  const targets = read?.targets || [];
  const strongest = read?.strongest || null;
  const lines: string[] = [];
  if (strongest) {
    const parts: string[] = [
      `${strongest.displaySpecies || strongest.species} leads the replay read`,
      `evidence score ${strongest.score.toFixed(1)}`,
    ];
    if (strongest.revealedItem) parts.push(`item ${strongest.revealedItem}`);
    if (strongest.itemGone && strongest.removedItem) parts.push(`${strongest.removedItem} removed`);
    if (strongest.revealedAbility) parts.push(`ability ${strongest.revealedAbility}`);
    if (strongest.ruledOutAbilities?.length) parts.push(`ruled out ${joinWithOr(strongest.ruledOutAbilities)}`);
    if (strongest.usedStatusMove) parts.push('used a status move');
    if (strongest.tookHazardDamage) parts.push('took hazard damage');
    lines.push(parts.join(' — '));
    (strongest.notes || []).slice(0, 4).forEach((note) => lines.push(`- ${note}`));
  } else {
    lines.push('No replay evidence parsed.');
  }
  return { text: lines.join('\n'), lines, targetCount: targets.length, strongest };
}

/** Back-compat alias: legacy name was copyReplaySummary (clipboard side effect stripped). */
export const copyReplaySummary = buildReplaySummary;
