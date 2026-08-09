import type { Position } from '../engine/types';
import type { VariationMove } from '../analysis/types';

export type GoConcept =
  | 'atari'
  | 'capture'
  | 'self_atari'
  | 'connect'
  | 'extend'
  | 'ko'
  | 'missed_capture'
  | 'missed_defense'
  | 'cut'
  | 'hane'
  | 'tigers_mouth'
  | 'ladder'
  | 'net'
  | 'snapback';

export type GoConceptDefinition = {
  id: GoConcept;
  name: string;
  shortDefinition: string;
  description?: string;
};

export type DetectedConceptMetadata = {
  stoneCount?: number;
  libertyCount?: number;
  groupCount?: number;
  opponentColor?: 'black' | 'white';
  capturedCount?: number;
  sacrificedCount?: number;
  searchDepth?: number;
};

export type DetectedConcept = {
  concept: GoConcept;
  relatedPositions: Position[];
  metadata?: DetectedConceptMetadata;
  /** Context-specific teaching line for this move. */
  teachingLine?: string;
  /** Deterministic tactical line for preview overlays. */
  tacticalSequence?: VariationMove[];
};

export const MAX_VISIBLE_CONCEPTS = 2;

/** Lower number = higher display priority. */
export const CONCEPT_PRIORITY: Record<GoConcept, number> = {
  ko: 1,
  snapback: 2,
  capture: 3,
  ladder: 4,
  net: 5,
  missed_capture: 6,
  missed_defense: 7,
  self_atari: 8,
  atari: 9,
  cut: 10,
  connect: 11,
  hane: 12,
  tigers_mouth: 13,
  extend: 14,
};
