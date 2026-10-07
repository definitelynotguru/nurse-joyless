// Core shared types + primitives for the Nurse Joyless engine.
import { TYPES, CHART, NATURE } from './data-types';

export { TYPES, CHART, NATURE };

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type Stats = Record<StatKey, number>;

export interface TeamMon {
  id: number;
  species: string;
  item: string;
  ability: string;
  tera: string;
  nature: string;
  evs: Stats;
  ivs: Stats;
  moves: string[];
  level: number;
  shiny: boolean;
}

export interface SpeciesInfo {
  name: string;
  types: string[];
  baseStats: number[]; // [hp, atk, def, spa, spd, spe]
  abilities: Record<string, string>;
}

/** [type, category, basePower, accuracy, priority?, flag?] */
export type MoveData = [string, string, number, number, (number | string)?, (number | string)?];

export const keys = <T extends object>(o: T): string[] => Object.keys(o);
export const unique = <T,>(arr: T[]): T[] => [...new Set(arr)];
export const clamp = (n: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
export const pct = (n: number): string => `${Math.round(n)}/100`;
export const html = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const labelize = (s: string): string =>
  s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
export const toId = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const capitalize = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Defensive type effectiveness of an attacking type vs defender types. */
export function mult(atkType: string, defTypes: string[]): number {
  return defTypes.reduce(
    (a, t) => a * ((CHART as Record<string, Record<string, number>>)[atkType]?.[t] ?? 1),
    1,
  );
}

export function natureModifier(nature: string, stat: StatKey): number {
  const n = (NATURE as Record<string, { up?: string; down?: string }>)[nature] || {};
  return n.up === stat ? 1.1 : n.down === stat ? 0.9 : 1;
}

export function speedNatureDir(nature: string): 'up' | 'down' | 'neutral' {
  const n = (NATURE as Record<string, { up?: string; down?: string }>)[nature] || {};
  return n.up === 'spe' ? 'up' : n.down === 'spe' ? 'down' : 'neutral';
}

export const emptyStats = (fill: number): Stats => ({
  hp: fill, atk: fill, def: fill, spa: fill, spd: fill, spe: fill,
});

export interface Evidence {
  label: string;
  detail: string;
}
export const evidence = (label: string, detail: string): Evidence => ({ label, detail });

export interface ScoreEntry {
  name: string;
  score: number;
  tags: string[];
  ev: Evidence[];
  plan?: string;
}
