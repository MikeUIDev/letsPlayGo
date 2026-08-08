import { cloneBoard, createEmptyBoard, getStone, positionKey, positionsEqual, withStone } from './board';
import { applyCaptures } from './captures';
import { isLegalPlay } from './legalMoves';
import { defaultKomi, scoreGame } from './scoring';
import type {
  BoardSize,
  CaptureCounts,
  GameAction,
  GameActionResult,
  GameConfig,
  GameState,
  HistoryEntry,
  Move,
  Position,
  StoneColor,
} from './types';
import { OPPONENT } from './types';

export interface CreateGameOptions {
  komi?: number;
}

export function createInitialState(
  size: BoardSize = 9,
  options: CreateGameOptions = {},
): GameState {
  const config: GameConfig = {
    size,
    komi: options.komi ?? defaultKomi(size),
  };

  return {
    board: createEmptyBoard(size),
    config,
    currentPlayer: 'black',
    phase: 'playing',
    captures: { black: 0, white: 0 },
    history: [],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
  };
}

function pushHistory(state: GameState, move: Move): HistoryEntry {
  return {
    move,
    board: cloneBoard(state.board),
    captures: { ...state.captures },
    consecutivePasses: state.consecutivePasses,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    result: state.result,
    deadStones: [...state.deadStones],
  };
}

function nextPlayer(color: StoneColor): StoneColor {
  return OPPONENT[color];
}

function applyPlay(state: GameState, pos: Position): GameActionResult {
  const legality = isLegalPlay(state, pos);
  if (!legality.legal) {
    return { ok: false, error: legality.reason ?? 'illegal_move' };
  }

  const color = state.currentPlayer;
  const { board: boardAfterCaptures, captured } = applyCaptures(
    state.board,
    pos,
    color,
  );
  const board = withStone(boardAfterCaptures, pos, color);

  const captures: CaptureCounts = { ...state.captures };
  if (captured.length > 0) {
    captures[color] += captured.length;
  }

  const move: Move = { type: 'play', color, position: pos, captured };

  const nextState: GameState = {
    board,
    config: state.config,
    currentPlayer: nextPlayer(color),
    phase: 'playing',
    captures,
    history: [...state.history, pushHistory(state, move)],
    consecutivePasses: 0,
    deadStones: state.deadStones,
    result: null,
  };

  return { ok: true, state: nextState };
}

function applyPass(state: GameState): GameActionResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'game_ended' };
  }

  const color = state.currentPlayer;
  const move: Move = { type: 'pass', color };
  const consecutivePasses = state.consecutivePasses + 1;

  const nextState: GameState = {
    board: state.board,
    config: state.config,
    currentPlayer: nextPlayer(color),
    phase: consecutivePasses >= 2 ? 'scoring' : 'playing',
    captures: state.captures,
    history: [...state.history, pushHistory(state, move)],
    consecutivePasses,
    deadStones: [],
    result: null,
  };

  return { ok: true, state: nextState };
}

function applyResign(state: GameState): GameActionResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'game_ended' };
  }

  const color = state.currentPlayer;
  const winner = nextPlayer(color);
  const move: Move = { type: 'resign', color };

  const scored = scoreGame(state.board, {
    komi: state.config.komi,
    deadStones: state.deadStones,
  });

  const nextState: GameState = {
    board: state.board,
    config: state.config,
    currentPlayer: nextPlayer(color),
    phase: 'ended',
    captures: state.captures,
    history: [...state.history, pushHistory(state, move)],
    consecutivePasses: state.consecutivePasses,
    deadStones: state.deadStones,
    result: {
      winner,
      blackScore: scored.blackScore,
      whiteScore: scored.whiteScore,
      reason: 'resign',
    },
  };

  return { ok: true, state: nextState };
}

function applyMarkDead(state: GameState, pos: Position): GameActionResult {
  if (state.phase !== 'scoring') {
    return { ok: false, error: 'not_in_scoring' };
  }

  if (getStone(state.board, pos) === null) {
    return { ok: false, error: 'no_stone' };
  }

  const alreadyDead = state.deadStones.some((dead) => positionsEqual(dead, pos));
  const deadStones = alreadyDead
    ? state.deadStones.filter((dead) => !positionsEqual(dead, pos))
    : [...state.deadStones, pos];

  return {
    ok: true,
    state: {
      ...state,
      deadStones,
      result: null,
    },
  };
}

function applyConfirmScore(state: GameState): GameActionResult {
  if (state.phase !== 'scoring') {
    return { ok: false, error: 'not_in_scoring' };
  }

  const scored = scoreGame(state.board, {
    komi: state.config.komi,
    deadStones: state.deadStones,
  });

  return {
    ok: true,
    state: {
      ...state,
      phase: 'ended',
      result: {
        ...scored,
        reason: 'score',
      },
    },
  };
}

function applyUndo(state: GameState): GameActionResult {
  if (state.history.length === 0) {
    return { ok: false, error: 'nothing_to_undo' };
  }

  const previous = state.history[state.history.length - 1];
  const history = state.history.slice(0, -1);

  const nextState: GameState = {
    board: cloneBoard(previous.board),
    config: state.config,
    currentPlayer: previous.currentPlayer,
    phase: previous.phase,
    captures: { ...previous.captures },
    history,
    consecutivePasses: previous.consecutivePasses,
    deadStones: [...previous.deadStones],
    result: previous.result,
  };

  return { ok: true, state: nextState };
}

/** Dispatch a player action. Returns new state or an error — never mutates input. */
export function dispatch(state: GameState, action: GameAction): GameActionResult {
  switch (action.type) {
    case 'play':
      return applyPlay(state, action.position);
    case 'pass':
      return applyPass(state);
    case 'resign':
      return applyResign(state);
    case 'undo':
      return applyUndo(state);
    case 'markDead':
      return applyMarkDead(state, action.position);
    case 'confirmScore':
      return applyConfirmScore(state);
    case 'restart':
      return {
        ok: true,
        state: createInitialState(action.size ?? state.config.size, {
          komi: state.config.komi,
        }),
      };
  }
}

/** Flat list of moves for display (derived from history). */
export function getMoveList(state: GameState): Move[] {
  return state.history.map((entry) => entry.move);
}

/** Toggle whether a stone is marked dead during scoring. Pure helper for tests/future UI. */
export function toggleDeadStone(
  deadStones: readonly Position[],
  pos: Position,
): Position[] {
  const key = positionKey(pos);
  const exists = deadStones.some((dead) => positionKey(dead) === key);
  return exists
    ? deadStones.filter((dead) => positionKey(dead) !== key)
    : [...deadStones, pos];
}
