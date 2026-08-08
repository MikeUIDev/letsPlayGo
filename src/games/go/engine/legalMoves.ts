import { getStone, isInBounds } from './board';
import { isSuicide } from './captures';
import { violatesKo } from './ko';
import type { GameState, Position } from './types';

export type RejectionReason =
  | 'game_ended'
  | 'out_of_bounds'
  | 'occupied'
  | 'ko'
  | 'suicide';

export interface LegalityResult {
  legal: boolean;
  reason?: RejectionReason;
}

/** Check whether `pos` is a legal play for the current player. */
export function isLegalPlay(state: GameState, pos: Position): LegalityResult {
  if (state.phase !== 'playing') {
    return { legal: false, reason: 'game_ended' };
  }

  if (!isInBounds(state.board, pos)) {
    return { legal: false, reason: 'out_of_bounds' };
  }

  if (getStone(state.board, pos) !== null) {
    return { legal: false, reason: 'occupied' };
  }

  if (violatesKo(state, pos)) {
    return { legal: false, reason: 'ko' };
  }

  if (isSuicide(state.board, pos, state.currentPlayer)) {
    return { legal: false, reason: 'suicide' };
  }

  return { legal: true };
}

/** All legal intersections for the current player (useful for hints/tests). */
export function getLegalMoves(state: GameState): Position[] {
  const moves: Position[] = [];
  const { size } = state.board;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const pos = { row, col };
      if (isLegalPlay(state, pos).legal) {
        moves.push(pos);
      }
    }
  }

  return moves;
}
