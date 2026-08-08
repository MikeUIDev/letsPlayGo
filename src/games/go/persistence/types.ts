import type {
  BoardSize,
  CaptureCounts,
  GameConfig,
  GamePhase,
  GameResult,
  GameState,
  StoneColor,
} from '../engine/types';

export const SAVED_GAME_VERSION = 2 as const;
export const LEGACY_SAVED_GAME_VERSION = 1 as const;

export interface SavedGameV2 {
  version: typeof SAVED_GAME_VERSION;
  savedAt: string;
  state: SerializedGameState;
}

export interface SavedGameV1Legacy {
  version: typeof LEGACY_SAVED_GAME_VERSION;
  savedAt: string;
  state: SerializedGameStateLegacy;
}

export interface SerializedPosition {
  row: number;
  col: number;
}

export interface SerializedBoard {
  size: BoardSize;
  intersections: (StoneColor | null)[][];
}

export type SerializedLocalGameConfig = {
  mode: 'local';
  size: BoardSize;
  komi: number;
  firstPlayer: StoneColor;
};

export type SerializedAIGameConfig = {
  mode: 'ai';
  size: BoardSize;
  komi: number;
  humanColor: StoneColor;
};

export type SerializedGameConfig = SerializedLocalGameConfig | SerializedAIGameConfig;

/** Legacy v1 config without mode — migrated to local on load. */
export interface SerializedGameConfigLegacy {
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

export interface SerializedGameStateLegacy extends Omit<SerializedGameState, 'config'> {
  config: SerializedGameConfigLegacy;
}

export type SavedGame = SavedGameV2;

export type SerializeResult =
  | { ok: true; saved: SavedGameV2 }
  | { ok: false; error: string };

export type DeserializeResult =
  | { ok: true; state: GameState; migratedFromVersion?: number }
  | { ok: false; error: string };

export type ParsedSavedGameConfig = GameConfig;
