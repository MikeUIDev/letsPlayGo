import { useCallback, useEffect, useRef, useState } from 'react';
import { aiInvalidMoveMessage, formatAiError } from '../ai/errors';
import type { GoAI, AIStatus, GenerateMoveResult } from '../ai/types';
import { createAiRequestCoordinator } from '../ai/requestCoordinator';
import { isAiGameConfig, isAiTurn } from '../engine/gameConfig';
import { dispatch, getMoveList } from '../engine/gameState';
import type { GameAction, GameState } from '../engine/types';

export interface UseGoAIOptions {
  ai: GoAI;
  state: GameState | null;
  enabled: boolean;
  onStateChange: (state: GameState) => void;
  onError: (message: string | null) => void;
}

export interface UseGoAIResult {
  status: AIStatus;
  cancelPending: () => void;
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
  const coordinatorRef = useRef(createAiRequestCoordinator());
  const stateRef = useRef(state);

  stateRef.current = state;

  const cancelPending = useCallback(() => {
    coordinatorRef.current.cancel();
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (!enabled || !state || state.phase !== 'playing' || !isAiGameConfig(state.config)) {
      return;
    }

    if (!isAiTurn(state.config, state.currentPlayer)) {
      return;
    }

    const coordinator = coordinatorRef.current;
    const generation = coordinator.begin();
    if (generation === null) {
      return;
    }

    setStatus('thinking');

    const request = {
      boardSize: state.config.size,
      komi: state.config.komi,
      colorToMove: state.currentPlayer,
      moves: getMoveList(state),
      state,
    };

    ai.generateMove(request)
      .then((result) => {
        coordinator.complete();

        if (!coordinator.isCurrent(generation)) {
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

        onError(null);
        onStateChange(applied.state);
        setStatus('idle');
      })
      .catch((error) => {
        coordinator.complete();
        if (!coordinator.isCurrent(generation)) {
          return;
        }
        setStatus('error');
        onError(formatAiError(error));
      });
  }, [ai, enabled, onError, onStateChange, state]);

  return { status, cancelPending };
}
