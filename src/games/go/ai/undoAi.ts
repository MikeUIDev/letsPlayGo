import { cloneBoard } from '../engine/board';
import { dispatch } from '../engine/gameState';
import type { GameActionResult, GameState } from '../engine/types';
import { OPPONENT } from '../engine/types';
import { isAiGameConfig } from '../engine/gameConfig';

/** Undo one engine snapshot step. */
function undoOnce(state: GameState): GameActionResult {
  return dispatch(state, { type: 'undo' });
}

/**
 * AI-mode undo:
 * - If the latest move is the human's and AI has not replied yet, undo once.
 * - If the latest move is the AI's, undo the AI move and the preceding human move when present.
 * - If only an opening AI move exists, undo that single move.
 */
export function undoForGameMode(state: GameState): GameActionResult {
  if (!isAiGameConfig(state.config)) {
    return undoOnce(state);
  }

  if (state.history.length === 0) {
    return { ok: false, error: 'nothing_to_undo' };
  }

  const humanColor = state.config.humanColor;
  const aiColor = OPPONENT[humanColor];
  const lastMove = state.history[state.history.length - 1].move;

  if (lastMove.color === humanColor) {
    return undoOnce(state);
  }

  if (lastMove.color !== aiColor) {
    return undoOnce(state);
  }

  const firstUndo = undoOnce(state);
  if (!firstUndo.ok) return firstUndo;

  const previousMove = state.history[state.history.length - 2]?.move;
  if (previousMove?.color === humanColor) {
    return undoOnce(firstUndo.state);
  }

  return firstUndo;
}

/** Test helper to inspect undo steps without going through dispatch undo guard twice. */
export function applyUndoSnapshot(state: GameState): GameState | null {
  if (state.history.length === 0) return null;
  const previous = state.history[state.history.length - 1];
  return {
    board: cloneBoard(previous.board),
    config: state.config,
    currentPlayer: previous.currentPlayer,
    phase: previous.phase,
    captures: { ...previous.captures },
    history: state.history.slice(0, -1),
    consecutivePasses: previous.consecutivePasses,
    deadStones: [...previous.deadStones],
    result: previous.result,
  };
}
