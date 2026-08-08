import type { BoardSize, GameState, Move, Position, StoneColor } from '../engine/types';

/** Future analysis fields may be added without changing the core move result. */
export type GenerateMoveAnalysis = {
  winRate?: number;
  scoreLead?: number;
};

export type GenerateMoveRequest = {
  boardSize: BoardSize;
  komi: number;
  colorToMove: StoneColor;
  moves: Move[];
  state: GameState;
};

export type GenerateMoveResult =
  | { type: 'play'; position: Position; analysis?: GenerateMoveAnalysis }
  | { type: 'pass'; analysis?: GenerateMoveAnalysis };

export type AIStatus = 'idle' | 'thinking' | 'error';

export interface MockGoAIOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  /** Injectable RNG for tests; defaults to Math.random. */
  random?: () => number;
}

export interface GoAI {
  generateMove(request: GenerateMoveRequest): Promise<GenerateMoveResult>;
}
