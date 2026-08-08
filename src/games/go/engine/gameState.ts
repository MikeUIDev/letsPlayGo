import { cloneBoard, createEmptyBoard, getStone, positionKey, positionsEqual, withStone } from './board';
import { applyCaptures } from './captures';
import { getGroup } from './groups';
import { isLegalPlay } from './legalMoves';
import { configToSetup, getStartingPlayer, setupToConfig } from './gameConfig';
import { defaultKomi, scoreGame } from './scoring';
import type {
  BoardSize,
  CaptureCounts,
  GameAction,
  GameActionResult,
  GameState,
  HistoryEntry,
  Move,
  NewGameSetup,
  Position,
  StoneColor,
} from './types';
import { OPPONENT } from './types';

export interface CreateGameOptions {
  komi?: number;
  firstPlayer?: StoneColor;
}

/** Create a fresh game from a complete setup configuration. */
export function createGameFromSetup(setup: NewGameSetup): GameState {
  const config = setupToConfig(setup);
  const startingPlayer = getStartingPlayer(setup);

  return {
    board: createEmptyBoard(setup.size),
    config,
    currentPlayer: startingPlayer,
    phase: 'playing',
    captures: { black: 0, white: 0 },
    history: [],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
  };
}

export function createInitialState(
  size: BoardSize = 9,
  options: CreateGameOptions = {},
): GameState {
  return createGameFromSetup({
    mode: 'local',
    size,
    komi: options.komi ?? defaultKomi(size),
    firstPlayer: options.firstPlayer ?? 'black',
  });
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

  const deadStones = toggleDeadGroup(state.board, state.deadStones, pos);

  return {
    ok: true,
    state: {
      ...state,
      deadStones,
      result: null,
    },
  };
}

function applyResumeGame(state: GameState): GameActionResult {
  if (state.phase !== 'scoring') {
    return { ok: false, error: 'not_in_scoring' };
  }

  return {
    ok: true,
    state: {
      ...state,
      phase: 'playing',
      consecutivePasses: 0,
      deadStones: [],
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
  if (state.phase !== 'playing') {
    return { ok: false, error: 'not_in_playing' };
  }

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
    case 'resumeGame':
      return applyResumeGame(state);
    case 'restart': {
      const setup = configToSetup(state.config);
      return {
        ok: true,
        state: createGameFromSetup({
          ...setup,
          size: action.size ?? setup.size,
        }),
      };
    }
  }
}

/** Flat list of moves for display (derived from history). */
export function getMoveList(state: GameState): Move[] {
  return state.history.map((entry) => entry.move);
}

/** Toggle an entire connected group between alive and dead during scoring. */
export function toggleDeadGroup(
  board: GameState['board'],
  deadStones: readonly Position[],
  pos: Position,
): Position[] {
  const group = getGroup(board, pos);
  if (!group) return [...deadStones];

  const groupKeys = new Set(group.stones.map(positionKey));
  const allDead = group.stones.every((stone) =>
    deadStones.some((dead) => positionsEqual(dead, stone)),
  );

  if (allDead) {
    return deadStones.filter((dead) => !groupKeys.has(positionKey(dead)));
  }

  const existing = new Set(deadStones.map(positionKey));
  const next = [...deadStones];
  for (const stone of group.stones) {
    const key = positionKey(stone);
    if (!existing.has(key)) {
      next.push(stone);
      existing.add(key);
    }
  }
  return next;
}

/** Toggle whether a single stone is marked dead. Prefer toggleDeadGroup for gameplay. */
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
