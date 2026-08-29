import { persistActiveGame } from './saveGame';
import type { GameState } from '../engine/types';
import { registerAppLifecycle } from '../../../native/appLifecycle';

export type BackgroundFlushOptions = {
  getState: () => GameState | null;
  shouldPersist: () => boolean;
};

/** Flush the active game to storage when the app backgrounds. */
export function registerBackgroundPersistenceFlush({
  getState,
  shouldPersist,
}: BackgroundFlushOptions): () => void {
  return registerAppLifecycle({
    onBackground: () => {
      if (!shouldPersist()) {
        return;
      }

      const state = getState();
      if (state) {
        persistActiveGame(state);
      }
    },
  });
}
