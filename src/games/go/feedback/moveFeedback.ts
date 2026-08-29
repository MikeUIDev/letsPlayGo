import type { GameState } from '../engine/types';
import type { FeedbackEvent } from './types';

/** Derive placement vs capture feedback from the latest move. */
export function getMoveFeedbackEvent(before: GameState, after: GameState): FeedbackEvent | null {
  if (after.history.length <= before.history.length) {
    return null;
  }

  const lastEntry = after.history.at(-1);
  if (!lastEntry || lastEntry.move.type !== 'play') {
    return null;
  }

  return lastEntry.move.captured.length > 0 ? 'capture' : 'place';
}

export function shouldNotifyMove(before: GameState | null, after: GameState): boolean {
  if (!before) {
    return false;
  }

  return after.history.length > before.history.length;
}
