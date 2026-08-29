import type { GameState } from '../engine/types';

/** Reject payloads with inconsistent runtime fields or history shape. */
export function validatePersistedState(state: GameState): boolean {
  if (state.board.size !== state.config.size) {
    return false;
  }

  if (state.captures.black < 0 || state.captures.white < 0) {
    return false;
  }

  if (state.consecutivePasses < 0 || !Number.isInteger(state.consecutivePasses)) {
    return false;
  }

  for (const entry of state.history) {
    if (entry.board.size !== state.config.size) {
      return false;
    }
    if (entry.captures.black < 0 || entry.captures.white < 0) {
      return false;
    }
    if (entry.consecutivePasses < 0 || !Number.isInteger(entry.consecutivePasses)) {
      return false;
    }
  }

  return true;
}
