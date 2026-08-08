import { boardHash, withStone } from './board';
import { applyCaptures } from './captures';
import type { Board, GameState, Position } from './types';
import { OPPONENT } from './types';

/**
 * Board snapshot from immediately before the opponent's most recent action.
 * Each history entry stores the board before that action; the latest opponent
 * entry is normally the last history item when it is this player's turn.
 */
export function getBoardBeforeOpponentLastAction(state: GameState): Board | null {
  const opponent = OPPONENT[state.currentPlayer];
  const lastEntry = state.history.at(-1);

  if (lastEntry?.move.color === opponent) {
    return lastEntry.board;
  }

  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i];
    if (entry.move.color === opponent) {
      return entry.board;
    }
  }

  return null;
}

/**
 * Simple ko: illegal when the resulting board matches the position that existed
 * immediately before the opponent's most recent action (play or pass).
 */
export function wouldRecreateBoardBeforeOpponentAction(
  state: GameState,
  pos: Position,
): boolean {
  const referenceBoard = getBoardBeforeOpponentLastAction(state);
  if (!referenceBoard) return false;

  const color = state.currentPlayer;
  const { board: boardAfterCaptures } = applyCaptures(state.board, pos, color);
  const resultBoard = withStone(boardAfterCaptures, pos, color);

  return boardHash(resultBoard) === boardHash(referenceBoard);
}

/** True when playing at `pos` violates simple ko. */
export function violatesKo(state: GameState, pos: Position): boolean {
  return wouldRecreateBoardBeforeOpponentAction(state, pos);
}
