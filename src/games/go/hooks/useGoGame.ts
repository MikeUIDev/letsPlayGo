import { useCallback, useState } from 'react';
import {
  createInitialState,
  dispatch,
  getMoveList,
} from '../engine/gameState';
import type { BoardSize, GameAction, GameState, Position } from '../engine/types';

export interface UseGoGameResult {
  state: GameState;
  moves: ReturnType<typeof getMoveList>;
  error: string | null;
  canUndo: boolean;
  canAct: boolean;
  play: (position: Position) => void;
  dispatchAction: (action: GameAction) => void;
}

export function useGoGame(initialSize: BoardSize = 9): UseGoGameResult {
  const [state, setState] = useState<GameState>(() => createInitialState(initialSize));
  const [error, setError] = useState<string | null>(null);

  const dispatchAction = useCallback((action: GameAction) => {
    setState((current) => {
      const result = dispatch(current, action);
      if (result.ok) {
        setError(null);
        return result.state;
      }
      setError(result.error);
      return current;
    });
  }, []);

  const play = useCallback(
    (position: Position) => {
      dispatchAction({ type: 'play', position });
    },
    [dispatchAction],
  );

  return {
    state,
    moves: getMoveList(state),
    error,
    canUndo: state.history.length > 0 && state.phase === 'playing',
    canAct: state.phase === 'playing',
    play,
    dispatchAction,
  };
}
