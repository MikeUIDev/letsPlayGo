import { useCallback, useMemo, useState } from 'react';
import type { GameAction, GameState } from '../engine/types';

export type GameConfirmKind =
  | 'passToEnd'
  | 'resign'
  | 'newGame'
  | 'newGameFromResume'
  | 'newGameFromFinished'
  | 'discardSaved'
  | null;

type UseGameConfirmationsOptions = {
  state: GameState | null;
  dispatchAction: (action: GameAction) => void;
  openSetup: () => void;
  openSetupFromResume: () => void;
  discardSavedGame: () => void;
};

export function passNeedsConfirmation(state: GameState | null): boolean {
  return Boolean(state && state.phase === 'playing' && state.consecutivePasses >= 1);
}

export function useGameConfirmations({
  state,
  dispatchAction,
  openSetup,
  openSetupFromResume,
  discardSavedGame,
}: UseGameConfirmationsOptions) {
  const [pending, setPending] = useState<GameConfirmKind>(null);

  const requestPass = useCallback(() => {
    if (!state || state.phase !== 'playing') {
      return;
    }

    if (passNeedsConfirmation(state)) {
      setPending('passToEnd');
      return;
    }

    dispatchAction({ type: 'pass' });
  }, [dispatchAction, state]);

  const requestResign = useCallback(() => {
    setPending('resign');
  }, []);

  const requestNewGame = useCallback(() => {
    if (!state) {
      openSetup();
      return;
    }

    if (state.phase === 'playing') {
      setPending('newGame');
      return;
    }

    if (state.phase === 'scoring' || state.phase === 'ended') {
      setPending('newGameFromFinished');
      return;
    }

    openSetup();
  }, [openSetup, state]);

  const requestDiscardSaved = useCallback(() => {
    setPending('discardSaved');
  }, []);

  const requestNewGameFromResume = useCallback(() => {
    setPending('newGameFromResume');
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
  }, []);

  const confirm = useCallback(() => {
    switch (pending) {
      case 'passToEnd':
        dispatchAction({ type: 'pass' });
        break;
      case 'resign':
        dispatchAction({ type: 'resign' });
        break;
      case 'newGame':
        openSetup();
        break;
      case 'newGameFromResume':
        openSetupFromResume();
        break;
      case 'newGameFromFinished':
        openSetup();
        break;
      case 'discardSaved':
        discardSavedGame();
        break;
      default:
        break;
    }
    setPending(null);
  }, [discardSavedGame, dispatchAction, openSetup, openSetupFromResume, pending]);

  const sheetProps = useMemo(() => {
    switch (pending) {
      case 'passToEnd':
        return {
          title: 'End the game?',
          message: 'Your opponent passed. Passing now will end play and move to scoring.',
          confirmLabel: 'Pass and score',
          destructive: false,
        };
      case 'resign':
        return {
          title: 'Resign this game?',
          message: 'Your opponent will win by resignation. This cannot be undone.',
          confirmLabel: 'Resign',
          destructive: true,
        };
      case 'newGame':
        return {
          title: 'Start a new game?',
          message: 'The current game in progress will be replaced.',
          confirmLabel: 'New game',
          destructive: false,
        };
      case 'newGameFromResume':
        return {
          title: 'Start a new game?',
          message: 'Your saved game will be replaced when you start a new one.',
          confirmLabel: 'New game',
          destructive: false,
        };
      case 'newGameFromFinished':
        return {
          title: 'Start a new game?',
          message:
            'This finished game stays saved until you start a new one. You can cancel setup to return.',
          confirmLabel: 'New game',
          destructive: false,
        };
      case 'discardSaved':
        return {
          title: 'Discard saved game?',
          message: 'Your saved game will be permanently removed from this device.',
          confirmLabel: 'Discard',
          destructive: true,
        };
      default:
        return null;
    }
  }, [pending]);

  return {
    pending,
    sheetProps,
    requestPass,
    requestResign,
    requestNewGame,
    requestNewGameFromResume,
    requestDiscardSaved,
    confirm,
    cancel,
  };
}
