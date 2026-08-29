import type { GoConcept } from '../concepts/types';
import type { BoardSize, Position, StoneColor } from '../engine/types';

export type SnapbackScript = {
  sacrificePoint: Position;
  opponentCapturePoint: Position;
  recapturePoint: Position;
  minRecaptureStones?: number;
};

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export type PuzzleCategory =
  | 'capture'
  | 'save-group'
  | 'atari'
  | 'connect'
  | 'cut'
  | 'ladder'
  | 'net'
  | 'snapback'
  | 'ko';

export type PuzzleStone = {
  row: number;
  col: number;
  color: StoneColor;
};

export type PuzzleHint = {
  message: string;
  highlights?: Position[];
};

export type PuzzleValidation =
  | { kind: 'exact'; position: Position }
  | { kind: 'anyOf'; positions: Position[] }
  | { kind: 'capture'; color: StoneColor; minStones?: number }
  | { kind: 'atari'; targetColor: StoneColor; anchor: Position }
  | { kind: 'groupLibertiesAtLeast'; anchor: Position; min: number }
  | { kind: 'connectsGroups'; anchors: [Position, Position] }
  | { kind: 'cut' }
  | { kind: 'ladder'; targetAnchor: Position }
  | { kind: 'net'; targetAnchor: Position }
  | { kind: 'snapback-recapture'; minStones?: number }
  | { kind: 'ko-recapture'; position: Position };

export type PuzzlePlayStep = {
  type: 'play';
  validation: PuzzleValidation;
  wrongFeedback: string;
};

export type PuzzleOpponentStep = {
  type: 'opponent';
  position: Position;
};

export type PuzzleSolutionStep = PuzzlePlayStep | PuzzleOpponentStep;

export type GoPuzzle = {
  id: string;
  title: string;
  category: PuzzleCategory;
  concept: GoConcept;
  difficulty: PuzzleDifficulty;
  boardSize: BoardSize;
  stones: PuzzleStone[];
  playerToMove: StoneColor;
  objective: string;
  solution: PuzzleSolutionStep[];
  hints: PuzzleHint[];
  explanation: string;
  /** Optional preset state for puzzles needing move history (e.g. ko, snapback). */
  presetState?: 'ko-recapture-demo' | 'snapback-recapture-demo';
  /** Declared sacrifice/capture/recapture points for snapback puzzles. */
  snapbackScript?: SnapbackScript;
};

export type PuzzleFeedbackState = 'idle' | 'correct' | 'try-again' | 'solved';

export type PracticeProgress = {
  solvedPuzzleIds: string[];
  attempts: Record<string, number>;
  lastCategory: PuzzleCategory | null;
  lastDifficulty: PuzzleDifficulty | null;
};
