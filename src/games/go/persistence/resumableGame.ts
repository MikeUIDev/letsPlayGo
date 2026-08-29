import type { GameState } from '../engine/types';

/** True when a saved game should appear on Home and be restorable. */
export function canResumeGame(state: GameState): boolean {
  return state.phase === 'playing' || state.phase === 'scoring';
}

/** True when the active game should be written to storage. */
export function shouldPersistActiveGame(state: GameState): boolean {
  return canResumeGame(state);
}
