import type { Board, BoardSize, GameConfig, GameState, HistoryEntry, Move, Position } from '../engine/types';
import { normalizeAiDifficulty } from '../engine/aiDifficulty';
import type {
  DeserializeResult,
  SerializeResult,
  SerializedBoard,
  SerializedGameConfig,
  SerializedGameConfigLegacy,
  SerializedGameState,
  SerializedHistoryEntry,
  SerializedMove,
  SerializedPosition,
} from './types';
import { LEGACY_SAVED_GAME_VERSION, SAVED_GAME_VERSION } from './types';

export const STORAGE_KEY = 'letsplaygo.savedGame';

const BOARD_SIZES: BoardSize[] = [9, 13, 19];

function serializePosition(pos: Position): SerializedPosition {
  return { row: pos.row, col: pos.col };
}

function deserializePosition(value: unknown): Position | null {
  if (!value || typeof value !== 'object') return null;
  const pos = value as SerializedPosition;
  if (!Number.isInteger(pos.row) || !Number.isInteger(pos.col)) return null;
  return { row: pos.row, col: pos.col };
}

function serializeBoard(board: Board): SerializedBoard {
  return {
    size: board.size,
    intersections: board.intersections.map((row) => [...row]),
  };
}

function isStoneColor(value: unknown): value is 'black' | 'white' | null {
  return value === null || value === 'black' || value === 'white';
}

function isBoardSize(value: unknown): value is BoardSize {
  return typeof value === 'number' && BOARD_SIZES.includes(value as BoardSize);
}

function deserializeBoard(value: unknown): Board | null {
  if (!value || typeof value !== 'object') return null;
  const board = value as SerializedBoard;
  if (!isBoardSize(board.size)) return null;
  if (!Array.isArray(board.intersections) || board.intersections.length !== board.size) {
    return null;
  }

  const intersections = board.intersections.map((row) => {
    if (!Array.isArray(row) || row.length !== board.size) return null;
    if (!row.every(isStoneColor)) return null;
    return [...row] as ('black' | 'white' | null)[];
  });

  if (intersections.some((row) => row === null)) return null;

  return { size: board.size, intersections: intersections as readonly (readonly ('black' | 'white' | null)[])[] };
}

function serializeMove(move: Move): SerializedMove {
  if (move.type === 'play') {
    return {
      type: 'play',
      color: move.color,
      position: serializePosition(move.position),
      captured: move.captured.map(serializePosition),
    };
  }
  if (move.type === 'pass') {
    return { type: 'pass', color: move.color };
  }
  return { type: 'resign', color: move.color };
}

function deserializeMove(value: unknown): Move | null {
  if (!value || typeof value !== 'object') return null;
  const move = value as SerializedMove;
  if (move.color !== 'black' && move.color !== 'white') return null;

  if (move.type === 'play') {
    const position = deserializePosition(move.position);
    if (!position) return null;
    const captured = Array.isArray(move.captured)
      ? move.captured.map(deserializePosition).filter((pos): pos is Position => pos !== null)
      : [];
    return { type: 'play', color: move.color, position, captured };
  }
  if (move.type === 'pass') return { type: 'pass', color: move.color };
  if (move.type === 'resign') return { type: 'resign', color: move.color };
  return null;
}

function serializeHistoryEntry(entry: HistoryEntry): SerializedHistoryEntry {
  return {
    move: serializeMove(entry.move),
    board: serializeBoard(entry.board),
    captures: { ...entry.captures },
    consecutivePasses: entry.consecutivePasses,
    currentPlayer: entry.currentPlayer,
    phase: entry.phase,
    result: entry.result ? { ...entry.result } : null,
    deadStones: entry.deadStones.map(serializePosition),
  };
}

function deserializeHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as SerializedHistoryEntry;
  const move = deserializeMove(entry.move);
  const board = deserializeBoard(entry.board);
  if (!move || !board) return null;
  if (entry.currentPlayer !== 'black' && entry.currentPlayer !== 'white') return null;
  if (entry.phase !== 'playing' && entry.phase !== 'scoring' && entry.phase !== 'ended') return null;
  if (!entry.captures || typeof entry.captures.black !== 'number' || typeof entry.captures.white !== 'number') {
    return null;
  }
  if (!Number.isInteger(entry.consecutivePasses)) return null;
  if (!Array.isArray(entry.deadStones)) return null;

  const deadStones = entry.deadStones
    .map(deserializePosition)
    .filter((pos): pos is Position => pos !== null);

  return {
    move,
    board,
    captures: { black: entry.captures.black, white: entry.captures.white },
    consecutivePasses: entry.consecutivePasses,
    currentPlayer: entry.currentPlayer,
    phase: entry.phase,
    result: entry.result,
    deadStones,
  };
}

/** Serialize game state into a versioned saved-game payload. */
export function serializeGameState(state: GameState): SerializeResult {
  try {
    const serialized: SerializedGameState = {
      board: serializeBoard(state.board),
      config: { ...state.config },
      currentPlayer: state.currentPlayer,
      phase: state.phase,
      captures: { ...state.captures },
      history: state.history.map(serializeHistoryEntry),
      consecutivePasses: state.consecutivePasses,
      deadStones: state.deadStones.map(serializePosition),
      result: state.result ? { ...state.result } : null,
    };

    return {
      ok: true,
      saved: {
        version: SAVED_GAME_VERSION,
        savedAt: new Date().toISOString(),
        state: serialized,
      },
    };
  } catch {
    return { ok: false, error: 'serialize_failed' };
  }
}

function deserializeConfig(value: unknown): GameConfig | null {
  if (!value || typeof value !== 'object') return null;
  const config = value as SerializedGameConfig | SerializedGameConfigLegacy;

  if (!isBoardSize(config.size)) return null;
  if (typeof config.komi !== 'number' || !Number.isFinite(config.komi)) return null;

  if ('mode' in config && config.mode === 'ai') {
    if (config.humanColor !== 'black' && config.humanColor !== 'white') return null;
    return {
      mode: 'ai',
      size: config.size,
      komi: config.komi,
      humanColor: config.humanColor,
      difficulty: normalizeAiDifficulty(config.difficulty),
    };
  }

  if ('mode' in config && config.mode === 'local') {
    if (config.firstPlayer !== 'black' && config.firstPlayer !== 'white') return null;
    return {
      mode: 'local',
      size: config.size,
      komi: config.komi,
      firstPlayer: config.firstPlayer,
    };
  }

  const legacy = config as SerializedGameConfigLegacy;
  if (legacy.firstPlayer !== 'black' && legacy.firstPlayer !== 'white') return null;
  return {
    mode: 'local',
    size: legacy.size,
    komi: legacy.komi,
    firstPlayer: legacy.firstPlayer,
  };
}

function deserializeGameState(raw: SerializedGameState, migratedFromVersion?: number): DeserializeResult {
  const board = deserializeBoard(raw.board);
  if (!board) return { ok: false, error: 'invalid_board' };

  const config = deserializeConfig(raw.config);
  if (!config) return { ok: false, error: 'invalid_config' };
  if (board.size !== config.size) {
    return { ok: false, error: 'board_config_mismatch' };
  }

  if (raw.currentPlayer !== 'black' && raw.currentPlayer !== 'white') {
    return { ok: false, error: 'invalid_current_player' };
  }
  if (raw.phase !== 'playing' && raw.phase !== 'scoring' && raw.phase !== 'ended') {
    return { ok: false, error: 'invalid_phase' };
  }
  if (!raw.captures || typeof raw.captures.black !== 'number' || typeof raw.captures.white !== 'number') {
    return { ok: false, error: 'invalid_captures' };
  }
  if (!Number.isInteger(raw.consecutivePasses)) {
    return { ok: false, error: 'invalid_pass_count' };
  }
  if (!Array.isArray(raw.history)) {
    return { ok: false, error: 'invalid_history' };
  }

  const history: HistoryEntry[] = [];
  for (const entry of raw.history) {
    const parsed = deserializeHistoryEntry(entry);
    if (!parsed) return { ok: false, error: 'invalid_history_entry' };
    history.push(parsed);
  }

  if (!Array.isArray(raw.deadStones)) {
    return { ok: false, error: 'invalid_dead_stones' };
  }

  const deadStones = raw.deadStones
    .map(deserializePosition)
    .filter((pos): pos is Position => pos !== null);

  return {
    ok: true,
    migratedFromVersion,
    state: {
      board,
      config,
      currentPlayer: raw.currentPlayer,
      phase: raw.phase,
      captures: { black: raw.captures.black, white: raw.captures.white },
      history,
      consecutivePasses: raw.consecutivePasses,
      deadStones,
      result: raw.result ?? null,
    },
  };
}

/** Deserialize a saved-game payload into engine state. */
export function deserializeSavedGame(data: unknown): DeserializeResult {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'invalid_format' };
  }

  const saved = data as { version?: number; state?: unknown; savedAt?: string };
  if (saved.version !== SAVED_GAME_VERSION && saved.version !== LEGACY_SAVED_GAME_VERSION) {
    return { ok: false, error: 'unsupported_version' };
  }

  if (!saved.state || typeof saved.state !== 'object') {
    return { ok: false, error: 'missing_state' };
  }

  const migratedFromVersion =
    saved.version === LEGACY_SAVED_GAME_VERSION ? LEGACY_SAVED_GAME_VERSION : undefined;

  return deserializeGameState(saved.state as SerializedGameState, migratedFromVersion);
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createLocalStorageAdapter(storage: Storage | null): StorageAdapter | null {
  if (!storage) return null;
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}

let storageAdapter: StorageAdapter | null = createLocalStorageAdapter(
  typeof localStorage !== 'undefined' ? localStorage : null,
);

/** Override storage adapter (used in tests). */
export function setStorageAdapter(adapter: StorageAdapter | null): void {
  storageAdapter = adapter;
}

export function loadSavedGame(): GameState | null {
  if (!storageAdapter) return null;

  try {
    const raw = storageAdapter.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const result = deserializeSavedGame(parsed);
    if (!result.ok) {
      storageAdapter.removeItem(STORAGE_KEY);
      return null;
    }
    return result.state;
  } catch {
    storageAdapter.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveGameToStorage(state: GameState): void {
  if (!storageAdapter) return;

  const serialized = serializeGameState(state);
  if (!serialized.ok) return;

  try {
    storageAdapter.setItem(STORAGE_KEY, JSON.stringify(serialized.saved));
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function clearSavedGame(): void {
  storageAdapter?.removeItem(STORAGE_KEY);
}
