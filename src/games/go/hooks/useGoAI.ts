import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aiBackOnlineRetryMessage,
  aiInvalidMoveMessage,
  aiOfflineMessage,
  aiRetryLimitMessage,
  formatAiError,
  isOfflineAiError,
  MAX_AI_RETRY_ATTEMPTS,
} from '../ai/errors';
import type { GoAI, AIStatus, GenerateMoveResult } from '../ai/types';
import { createAiRequestCoordinator } from '../ai/requestCoordinator';
import { decideAiActionAfterReconnect } from '../ai/offlineRecovery';
import { usesRemoteAiBackend } from '../api/config';
import { isAiGameConfig, isAiTurn } from '../engine/gameConfig';
import { dispatch, getMoveList } from '../engine/gameState';
import type { GameAction, GameState } from '../engine/types';
import { isAppForeground } from '../../../native/appLifecycle';
import { isNetworkOnline, registerNetworkStatusListener } from '../../../native/networkStatus';

export interface UseGoAIOptions {
  ai: GoAI;
  state: GameState | null;
  enabled: boolean;
  onStateChange: (state: GameState) => void;
  onError: (message: string | null) => void;
}

export interface UseGoAIResult {
  status: AIStatus;
  canRetry: boolean;
  cancelPending: () => void;
  retry: () => void;
  resumeAfterBackground: () => void;
}

function resultToAction(result: GenerateMoveResult): GameAction {
  if (result.type === 'pass') return { type: 'pass' };
  return { type: 'play', position: result.position };
}

export function useGoAI({
  ai,
  state,
  enabled,
  onStateChange,
  onError,
}: UseGoAIOptions): UseGoAIResult {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [retryToken, setRetryToken] = useState(0);
  const [canRetry, setCanRetry] = useState(true);
  const coordinatorRef = useRef(createAiRequestCoordinator());
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const statusRef = useRef<AIStatus>('idle');
  const retryCountRef = useRef(0);
  const offlinePausedRef = useRef(false);
  const usesRemoteAi = usesRemoteAiBackend();

  stateRef.current = state;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    coordinatorRef.current.cancel();
    setStatus('idle');
  }, []);

  const retriggerAiTurn = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    coordinatorRef.current.cancel();
    offlinePausedRef.current = false;
    onError(null);
    setRetryToken((token) => token + 1);
  }, [onError]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (!enabled || !current || current.phase !== 'playing' || !isAiGameConfig(current.config)) {
      return;
    }

    if (!isAiTurn(current.config, current.currentPlayer)) {
      return;
    }

    if (usesRemoteAi && !isNetworkOnline()) {
      offlinePausedRef.current = true;
      setStatus('error');
      onError(aiOfflineMessage());
      return;
    }

    if (retryCountRef.current >= MAX_AI_RETRY_ATTEMPTS) {
      setStatus('error');
      setCanRetry(false);
      onError(aiRetryLimitMessage());
      return;
    }

    retryCountRef.current += 1;
    retriggerAiTurn();
  }, [enabled, onError, retriggerAiTurn, usesRemoteAi]);

  const resumeAfterBackground = useCallback(() => {
    if (!isAppForeground()) {
      return;
    }

    if (usesRemoteAi && !isNetworkOnline()) {
      offlinePausedRef.current = true;
      setStatus('error');
      onError(aiOfflineMessage());
      return;
    }

    const current = stateRef.current;
    if (
      !enabled ||
      !current ||
      current.phase !== 'playing' ||
      !isAiGameConfig(current.config) ||
      !isAiTurn(current.config, current.currentPlayer)
    ) {
      return;
    }

    retriggerAiTurn();
  }, [enabled, onError, retriggerAiTurn, usesRemoteAi]);

  useEffect(() => {
    if (!usesRemoteAi) {
      return;
    }

    return registerNetworkStatusListener((online) => {
      if (!online) {
        if (statusRef.current === 'thinking') {
          abortRef.current?.abort();
          abortRef.current = null;
          coordinatorRef.current.cancel();
        }

        if (
          enabled &&
          stateRef.current &&
          stateRef.current.phase === 'playing' &&
          isAiGameConfig(stateRef.current.config) &&
          isAiTurn(stateRef.current.config, stateRef.current.currentPlayer)
        ) {
          offlinePausedRef.current = true;
          setStatus('error');
          onError(aiOfflineMessage());
        }
        return;
      }

      if (offlinePausedRef.current) {
        const decision = decideAiActionAfterReconnect({
          offlinePaused: offlinePausedRef.current,
          enabled,
          state: stateRef.current,
          status: statusRef.current,
        });

        offlinePausedRef.current = false;

        if (decision.promptRetry) {
          setStatus('error');
          onError(aiBackOnlineRetryMessage());
          return;
        }

        if (statusRef.current === 'error') {
          onError(null);
          setStatus('idle');
        }
      }
    });
  }, [enabled, onError, usesRemoteAi]);

  useEffect(() => {
    if (!enabled || !state || state.phase !== 'playing' || !isAiGameConfig(state.config)) {
      abortRef.current?.abort();
      abortRef.current = null;
      retryCountRef.current = 0;
      setCanRetry(true);
      setStatus('idle');
      return;
    }

    if (!isAiTurn(state.config, state.currentPlayer)) {
      abortRef.current?.abort();
      abortRef.current = null;
      retryCountRef.current = 0;
      setCanRetry(true);
      setStatus('idle');
      return;
    }

    if (usesRemoteAi && !isNetworkOnline()) {
      offlinePausedRef.current = true;
      setStatus('error');
      onError(aiOfflineMessage());
      return;
    }

    const coordinator = coordinatorRef.current;
    const generation = coordinator.begin();
    if (generation === null) {
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setStatus('thinking');
    offlinePausedRef.current = false;

    const request = {
      boardSize: state.config.size,
      komi: state.config.komi,
      colorToMove: state.currentPlayer,
      difficulty: state.config.difficulty,
      moves: getMoveList(state),
      state,
    };

    ai.generateMove(request, { signal: abortController.signal })
      .then((result) => {
        coordinator.complete();
        abortRef.current = null;

        if (!coordinator.isCurrent(generation)) {
          return;
        }

        if (!isAppForeground()) {
          setStatus('idle');
          return;
        }

        if (usesRemoteAi && !isNetworkOnline()) {
          offlinePausedRef.current = true;
          setStatus('error');
          onError(aiOfflineMessage());
          return;
        }

        const current = stateRef.current;
        if (!current || current.phase !== 'playing' || !isAiGameConfig(current.config)) {
          setStatus('idle');
          return;
        }

        if (!isAiTurn(current.config, current.currentPlayer)) {
          setStatus('idle');
          return;
        }

        const action = resultToAction(result);
        const applied = dispatch(current, action);
        if (!applied.ok) {
          setStatus('error');
          onError(aiInvalidMoveMessage());
          return;
        }

        retryCountRef.current = 0;
        setCanRetry(true);
        offlinePausedRef.current = false;
        onError(null);
        onStateChange(applied.state);
        setStatus('idle');
      })
      .catch((error) => {
        coordinator.complete();
        abortRef.current = null;
        if (!coordinator.isCurrent(generation)) {
          return;
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          setStatus('idle');
          return;
        }

        if (isOfflineAiError(error) || (!isNetworkOnline() && usesRemoteAi)) {
          offlinePausedRef.current = true;
        }

        setStatus('error');
        onError(formatAiError(error));
      });

    return () => {
      abortController.abort();
      // Bump generation so in-flight then/catch cannot apply after leave/retry/new game.
      coordinator.cancel();
    };
  }, [ai, enabled, onError, onStateChange, retryToken, state, usesRemoteAi]);

  return { status, canRetry, cancelPending, retry, resumeAfterBackground };
}
