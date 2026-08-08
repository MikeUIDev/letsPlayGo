import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { positionKey } from '../engine/board';
import {
  clearSavedGame,
  loadSavedGame,
  saveGameToStorage,
} from '../persistence/saveGame';
import { exportSgf } from '../sgf/exportSgf';
import { importSgf } from '../sgf/importSgf';
import { sgfErrorMessage } from '../sgf/types';
import {
  createGameFromSetup,
  dispatch,
  getMoveList,
} from '../engine/gameState';
import {
  calculateProvisionalScore,
  calculateScoreBreakdown,
  getTerritoryOwnershipMap,
  type ScoreBreakdown,
  type TerritoryOwner,
} from '../engine/scoring';
import type { GameAction, GameState, NewGameSetup, Position } from '../engine/types';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import { downloadTextFile } from '../utils/download';
import { formatEngineError } from '../utils/errorMessages';
import { setupFromConfig } from '../utils/gameSetup';

export type AppView = 'resume' | 'setup' | 'game';

export interface UseGoGameResult {
  view: AppView;
  setupDraft: NewGameSetup;
  canCancelSetup: boolean;
  resumeSnapshot: GameState | null;
  state: GameState | null;
  moves: ReturnType<typeof getMoveList>;
  error: string | null;
  canUndo: boolean;
  canAct: boolean;
  canConfirmScore: boolean;
  canResume: boolean;
  isScoring: boolean;
  isEnded: boolean;
  scoreBreakdown: ScoreBreakdown | null;
  provisionalResult: ReturnType<typeof calculateProvisionalScore> | null;
  territoryMap: Map<string, TerritoryOwner>;
  deadStoneKeys: Set<string>;
  play: (position: Position) => void;
  markDead: (position: Position) => void;
  dispatchAction: (action: GameAction) => void;
  updateSetupDraft: (setup: NewGameSetup) => void;
  startGame: (setup: NewGameSetup) => void;
  openSetup: () => void;
  openSetupFromResume: () => void;
  cancelSetup: () => void;
  resumeSavedGame: () => void;
  discardSavedGame: () => void;
  exportCurrentSgf: () => void;
  importSgfFile: (content: string) => void;
}

export function useGoGame(): UseGoGameResult {
  const initialSaved = useMemo(() => loadSavedGame(), []);
  const [view, setView] = useState<AppView>(initialSaved ? 'resume' : 'setup');
  const [resumeSnapshot, setResumeSnapshot] = useState<GameState | null>(initialSaved);
  const [setupDraft, setSetupDraft] = useState<NewGameSetup>(
    initialSaved ? setupFromConfig(initialSaved.config) : DEFAULT_NEW_GAME_SETUP,
  );
  const [lastSetup, setLastSetup] = useState<NewGameSetup>(
    initialSaved ? setupFromConfig(initialSaved.config) : DEFAULT_NEW_GAME_SETUP,
  );
  const [state, setState] = useState<GameState | null>(null);
  const [savedGameState, setSavedGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<GameState | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (view === 'game' && state) {
      saveGameToStorage(state);
    }
  }, [state, view]);

  const dispatchAction = useCallback((action: GameAction) => {
    setState((current) => {
      if (!current) return current;
      const result = dispatch(current, action);
      if (result.ok) {
        setError(null);
        return result.state;
      }
      setError(formatEngineError(result.error));
      return current;
    });
  }, []);

  const loadGameState = useCallback((nextState: GameState) => {
    const setup = setupFromConfig(nextState.config);
    setState(nextState);
    setLastSetup(setup);
    setSetupDraft(setup);
    setResumeSnapshot(null);
    setSavedGameState(null);
    setView('game');
    setError(null);
    saveGameToStorage(nextState);
  }, []);

  const openSetup = useCallback(() => {
    const current = stateRef.current;

    if (current) {
      setSavedGameState(current);
      setSetupDraft(setupFromConfig(current.config));
    } else {
      setSavedGameState(null);
      setSetupDraft(lastSetup);
    }

    setView('setup');
    setError(null);
  }, [lastSetup]);

  const openSetupFromResume = useCallback(() => {
    if (resumeSnapshot) {
      setSetupDraft(setupFromConfig(resumeSnapshot.config));
    }
    setSavedGameState(null);
    setView('setup');
    setError(null);
  }, [resumeSnapshot]);

  const cancelSetup = useCallback(() => {
    setSavedGameState(null);
    if (stateRef.current) {
      setView('game');
    } else if (resumeSnapshot) {
      setView('resume');
    } else {
      setView('setup');
    }
    setError(null);
  }, [resumeSnapshot]);

  const startGame = useCallback((setup: NewGameSetup) => {
    const nextState = createGameFromSetup(setup);
    setState(nextState);
    setLastSetup(setup);
    setSetupDraft(setup);
    setResumeSnapshot(null);
    setSavedGameState(null);
    setView('game');
    setError(null);
    clearSavedGame();
    saveGameToStorage(nextState);
  }, []);

  const resumeSavedGame = useCallback(() => {
    if (!resumeSnapshot) return;
    loadGameState(resumeSnapshot);
  }, [loadGameState, resumeSnapshot]);

  const discardSavedGame = useCallback(() => {
    clearSavedGame();
    setResumeSnapshot(null);
    setView('setup');
    setError(null);
  }, []);

  const updateSetupDraft = useCallback((setup: NewGameSetup) => {
    setSetupDraft(setup);
  }, []);

  const exportCurrentSgf = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    const exported = exportSgf(current);
    downloadTextFile(exported.content, exported.filename);
  }, []);

  const importSgfFile = useCallback(
    (content: string) => {
      if (!content.trim()) {
        setError(sgfErrorMessage('empty_file'));
        return;
      }

      const result = importSgf(content);
      if (!result.ok) {
        setError(sgfErrorMessage(result.error));
        return;
      }

      loadGameState(result.state);
    },
    [loadGameState],
  );

  const play = useCallback((position: Position) => {
    setState((current) => {
      if (!current || current.phase !== 'playing') return current;
      const result = dispatch(current, { type: 'play', position });
      if (result.ok) {
        setError(null);
        return result.state;
      }
      setError(formatEngineError(result.error));
      return current;
    });
  }, []);

  const markDead = useCallback((position: Position) => {
    setState((current) => {
      if (!current || current.phase !== 'scoring') return current;
      const result = dispatch(current, { type: 'markDead', position });
      if (result.ok) {
        setError(null);
        return result.state;
      }
      setError(formatEngineError(result.error));
      return current;
    });
  }, []);

  const scoreBreakdown = useMemo(() => {
    if (!state) return null;
    return calculateScoreBreakdown(state.board, state.config.komi, state.deadStones);
  }, [state]);

  const provisionalResult = useMemo(() => {
    if (!state) return null;
    return calculateProvisionalScore(state);
  }, [state]);

  const territoryMap = useMemo(() => {
    if (!state || (state.phase !== 'scoring' && state.phase !== 'ended')) {
      return new Map<string, TerritoryOwner>();
    }
    return getTerritoryOwnershipMap(state.board, state.deadStones);
  }, [state]);

  const deadStoneKeys = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set(state.deadStones.map(positionKey));
  }, [state]);

  return {
    view,
    setupDraft,
    canCancelSetup: savedGameState !== null,
    resumeSnapshot,
    state,
    moves: state ? getMoveList(state) : [],
    error,
    canUndo: Boolean(state && state.history.length > 0 && state.phase === 'playing'),
    canAct: state?.phase === 'playing',
    canConfirmScore: state?.phase === 'scoring',
    canResume: state?.phase === 'scoring',
    isScoring: state?.phase === 'scoring',
    isEnded: state?.phase === 'ended',
    scoreBreakdown,
    provisionalResult,
    territoryMap,
    deadStoneKeys,
    play,
    markDead,
    dispatchAction,
    updateSetupDraft,
    startGame,
    openSetup,
    openSetupFromResume,
    cancelSetup,
    resumeSavedGame,
    discardSavedGame,
    exportCurrentSgf,
    importSgfFile,
  };
}
