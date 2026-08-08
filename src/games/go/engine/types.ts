/** Supported board dimensions. Start with 9×9; 13 and 19 are first-class. */
export type BoardSize = 9 | 13 | 19;

export type StoneColor = 'black' | 'white';

export const OPPONENT: Record<StoneColor, StoneColor> = {
  black: 'white',
  white: 'black',
};

/** A point on the board grid, zero-indexed from top-left. */
export interface Position {
  row: number;
  col: number;
}

/** Empty intersection or stone color. */
export type IntersectionState = StoneColor | null;

/**
 * Immutable board representation.
 * `intersections[row][col]` — outer array is rows, inner is columns.
 */
export interface Board {
  size: BoardSize;
  intersections: readonly (readonly IntersectionState[])[];
}

/** Static game configuration set at start or restart. */
export interface GameConfig {
  size: BoardSize;
  komi: number;
  firstPlayer: StoneColor;
}

/** User-selected options when starting a new game. */
export interface NewGameSetup {
  size: BoardSize;
  komi: number;
  firstPlayer: StoneColor;
}

export const DEFAULT_KOMI = 6.5;

export const DEFAULT_NEW_GAME_SETUP: NewGameSetup = {
  size: 9,
  komi: DEFAULT_KOMI,
  firstPlayer: 'black',
};

export type MoveType = 'play' | 'pass' | 'resign';

export interface PlayMove {
  type: 'play';
  color: StoneColor;
  position: Position;
  /** Positions of opponent stones removed by this play. */
  captured: Position[];
}

export interface PassMove {
  type: 'pass';
  color: StoneColor;
}

export interface ResignMove {
  type: 'resign';
  color: StoneColor;
}

export type Move = PlayMove | PassMove | ResignMove;

export type GamePhase = 'playing' | 'scoring' | 'ended';

export interface CaptureCounts {
  black: number;
  white: number;
}

/** Snapshot stored alongside each move to enable undo without recomputation. */
export interface HistoryEntry {
  move: Move;
  board: Board;
  captures: CaptureCounts;
  consecutivePasses: number;
  currentPlayer: StoneColor;
  phase: GamePhase;
  result: GameResult | null;
  deadStones: readonly Position[];
}

export interface GameState {
  board: Board;
  config: GameConfig;
  currentPlayer: StoneColor;
  phase: GamePhase;
  captures: CaptureCounts;
  /** Full undo stack; latest move is last entry. */
  history: readonly HistoryEntry[];
  consecutivePasses: number;
  /** Stones marked dead during the scoring phase (for future UI). */
  deadStones: readonly Position[];
  result: GameResult | null;
}

export type GameEndReason = 'score' | 'resign' | 'double_pass';

export interface GameResult {
  winner: StoneColor | 'draw' | null;
  blackScore: number;
  whiteScore: number;
  reason: GameEndReason;
}

export type GameAction =
  | { type: 'play'; position: Position }
  | { type: 'pass' }
  | { type: 'resign' }
  | { type: 'undo' }
  | { type: 'restart'; size?: BoardSize }
  | { type: 'markDead'; position: Position }
  | { type: 'confirmScore' }
  | { type: 'resumeGame' };

export type GameActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
