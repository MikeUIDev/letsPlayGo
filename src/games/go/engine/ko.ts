import { boardHash, withStone } from './board';
import { applyCaptures } from './captures';
import type { Board, GameState, Position } from './types';
import { OPPONENT } from './types';

/**
 * Board snapshot from immediately before the opponent's most recent play move.
 * Pass and resign moves are skipped.
 */
export function getBoardBeforeOpponentLastPlay(state: GameState): Board | null {
  const opponent = OPPONENT[state.currentPlayer];

  for (let i = state.history.length - 1; i >= 0; i--) {
    const entry = state.history[i];
    if (entry.move.type === 'play' && entry.move.color === opponent) {
      return entry.board;
    }
  }

  return null;
}

/**
 * Simple ko: illegal when the resulting board matches the position that existed
 * immediately before the opponent's previous play.
 */
export function wouldRecreateBoardBeforeOpponentPlay(
  state: GameState,
  pos: Position,
): boolean {
  const referenceBoard = getBoardBeforeOpponentLastPlay(state);
  if (!referenceBoard) return false;

  const color = state.currentPlayer;
  const { board: boardAfterCaptures } = applyCaptures(state.board, pos, color);
  const resultBoard = withStone(boardAfterCaptures, pos, color);

  return boardHash(resultBoard) === boardHash(referenceBoard);
}

/** True when playing at `pos` violates simple ko. */
export function violatesKo(state: GameState, pos: Position): boolean {
  return wouldRecreateBoardBeforeOpponentPlay(state, pos);
}
