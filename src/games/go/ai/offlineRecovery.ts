import { isAiGameConfig, isAiTurn } from '../engine/gameConfig';
import type { GameState } from '../engine/types';
import type { AIStatus } from './types';

export type ReconnectAiDecision = {
  /** Always false — reconnect must not auto-play a move. */
  retrigger: boolean;
  promptRetry: boolean;
};

/**
 * Reconnect never auto-requests an AI move (avoids surprise plays).
 * If it is still the AI's turn after an offline pause, the UI should prompt Retry.
 */
export function decideAiActionAfterReconnect(input: {
  offlinePaused: boolean;
  enabled: boolean;
  state: GameState | null;
  status: AIStatus;
}): ReconnectAiDecision {
  if (!input.offlinePaused) {
    return { retrigger: false, promptRetry: false };
  }

  const { state, enabled, status } = input;
  if (status !== 'error' || !enabled || !state || state.phase !== 'playing') {
    return { retrigger: false, promptRetry: false };
  }

  if (!isAiGameConfig(state.config) || !isAiTurn(state.config, state.currentPlayer)) {
    return { retrigger: false, promptRetry: false };
  }

  return { retrigger: false, promptRetry: true };
}

/** @deprecated Use decideAiActionAfterReconnect — reconnect does not auto-move. */
export function shouldRetriggerAiAfterReconnect(input: {
  offlinePaused: boolean;
  enabled: boolean;
  state: GameState | null;
  status: AIStatus;
}): boolean {
  return decideAiActionAfterReconnect(input).retrigger;
}
