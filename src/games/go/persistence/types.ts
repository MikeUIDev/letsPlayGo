import type {
  BoardSize,
  CaptureCounts,
  GamePhase,
  GameResult,
  GameState,
  StoneColor,
} from '../engine/types';

export const SAVED_GAME_VERSION = 1 as const;

export interface SavedGameV1 {
  version: typeof SAVED_GAME_VERSION;
  savedAt: string;
  state: SerializedGameState;
}

export interface SerializedPosition {
  row: number;
  col: number;
}

export interface SerializedBoard {
  size: BoardSize;
  intersections: (StoneColor | null)[][];
}

export interface SerializedGameConfig {
  size: BoardSize;
  komi: number;
  firstPlayer: StoneColor;
}

export interface SerializedMove {
  type: 'play' | 'pass' | 'resign';
  color: StoneColor;
  position?: SerializedPosition;
  captured?: SerializedPosition[];
}

export interface SerializedHistoryEntry {
  move: SerializedMove;
  board: SerializedBoard;
  captures: CaptureCounts;
  consecutivePasses: number;
  currentPlayer: StoneColor;
  phase: GamePhase;
  result: GameResult | null;
  deadStones: SerializedPosition[];
}

export interface SerializedGameState {
  board: SerializedBoard;
  config: SerializedGameConfig;
  currentPlayer: StoneColor;
  phase: GamePhase;
  captures: CaptureCounts;
  history: SerializedHistoryEntry[];
  consecutivePasses: number;
  deadStones: SerializedPosition[];
  result: GameResult | null;
}

export type SavedGame = SavedGameV1;

export type SerializeResult =
  | { ok: true; saved: SavedGameV1 }
  | { ok: false; error: string };

export type DeserializeResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
