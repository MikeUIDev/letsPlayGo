import { cloneBoard, createEmptyBoard, withStone } from './board';
import { applyCaptures } from './captures';
import { isLegalPlay } from './legalMoves';
import { computeKoPoint } from './ko';
import { defaultKomi, scoreGame } from './scoring';
import type {
  BoardSize,
  CaptureCounts,
  GameAction,
  GameActionResult,
  GameState,
  HistoryEntry,
  Move,
  Position,
  StoneColor,
} from './types';
import { OPPONENT } from './types';

export function createInitialState(size: BoardSize = 9): GameState {
  return {
    board: createEmptyBoard(size),
    currentPlayer: 'black',
    phase: 'playing',
    captures: { black: 0, white: 0 },
    history: [],
    koPoint: null,
    consecutivePasses: 0,
    result: null,
  };
}

function pushHistory(state: GameState, move: Move): HistoryEntry {
  return {
    move,
    board: cloneBoard(state.board),
    captures: { ...state.captures },
    koPoint: state.koPoint,
    consecutivePasses: state.consecutivePasses,
    currentPlayer: state.currentPlayer,
    phase: state.phase,
    result: state.result,
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
    currentPlayer: nextPlayer(color),
    phase: 'playing',
    captures,
    history: [...state.history, pushHistory(state, move)],
    koPoint: computeKoPoint(captured),
    consecutivePasses: 0,
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

  let nextState: GameState = {
    board: state.board,
    currentPlayer: nextPlayer(color),
    phase: 'playing',
    captures: state.captures,
    history: [...state.history, pushHistory(state, move)],
    koPoint: null,
    consecutivePasses,
    result: null,
  };

  if (consecutivePasses >= 2) {
    const result = scoreGame(state.board, defaultKomi(state.board.size));
    nextState = {
      ...nextState,
      phase: 'ended',
      result: { ...result, reason: 'double_pass' },
    };
  }

  return { ok: true, state: nextState };
}

function applyResign(state: GameState): GameActionResult {
  if (state.phase !== 'playing') {
    return { ok: false, error: 'game_ended' };
  }

  const color = state.currentPlayer;
  const winner = nextPlayer(color);
  const move: Move = { type: 'resign', color };

  const result = scoreGame(state.board, defaultKomi(state.board.size));
  const nextState: GameState = {
    board: state.board,
    currentPlayer: nextPlayer(color),
    phase: 'ended',
    captures: state.captures,
    history: [...state.history, pushHistory(state, move)],
    koPoint: null,
    consecutivePasses: state.consecutivePasses,
    result: {
      winner,
      blackScore: result.blackScore,
      whiteScore: result.whiteScore,
      reason: 'resign',
    },
  };

  return { ok: true, state: nextState };
}

function applyUndo(state: GameState): GameActionResult {
  if (state.history.length === 0) {
    return { ok: false, error: 'nothing_to_undo' };
  }

  const previous = state.history[state.history.length - 1];
  const history = state.history.slice(0, -1);

  const nextState: GameState = {
    board: cloneBoard(previous.board),
    currentPlayer: previous.currentPlayer,
    phase: previous.phase,
    captures: { ...previous.captures },
    history,
    koPoint: previous.koPoint,
    consecutivePasses: previous.consecutivePasses,
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
    case 'restart':
      return { ok: true, state: createInitialState(action.size ?? state.board.size) };
  }
}

/** Flat list of moves for display (derived from history). */
export function getMoveList(state: GameState): Move[] {
  return state.history.map((entry) => entry.move);
}
