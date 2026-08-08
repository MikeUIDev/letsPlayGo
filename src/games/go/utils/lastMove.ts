import type { GameState, Position } from '../engine/types';

/** Position of the most recently played stone, if any. */
export function getLastMovePosition(state: GameState): Position | null {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const { move } = state.history[i];
    if (move.type === 'play') {
      return move.position;
    }
  }
  return null;
}
