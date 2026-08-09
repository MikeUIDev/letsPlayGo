import type { VariationMove } from '../analysis/types';
import type { GoConcept } from '../concepts/types';
import type { Move, Position, StoneColor } from '../engine/types';

export const TACTICAL_SEARCH_LIMITS = {
  ladderMaxDepth: 20,
  netMaxDepth: 8,
  snapbackMaxDepth: 4,
} as const;

export type TacticalConfidence = 'high' | 'medium';

export type TacticalOutcome = 'success' | 'failed' | 'unknown';

export type TacticalDetectionResult = {
  concept: Extract<GoConcept, 'ladder' | 'net' | 'snapback'>;
  confidence: TacticalConfidence;
  relatedPositions: Position[];
  sequence: VariationMove[];
  teachingLine: string;
  metadata?: {
    targetColor?: StoneColor;
    capturedCount?: number;
    sacrificedCount?: number;
    searchDepth?: number;
  };
};

export type LadderReadResult = {
  outcome: TacticalOutcome;
  path: Position[];
  sequence: VariationMove[];
  searchDepth: number;
};

export type NetReadResult = {
  outcome: TacticalOutcome;
  blockedEscapes: Position[];
  sequence: VariationMove[];
  searchDepth: number;
};

export type SnapbackReadResult = {
  outcome: TacticalOutcome;
  sacrificedCount: number;
  recaptureCount: number;
  sequence: VariationMove[];
  sacrificePoint: Position;
  recapturePoint: Position;
};

export type SimulatedMove = {
  color: StoneColor;
  position: Position;
};

export type MoveSequenceWindow = {
  moves: Move[];
};
