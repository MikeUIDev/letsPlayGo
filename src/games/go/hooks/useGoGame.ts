import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGoAnalysis } from '../analysis/createGoAnalysis';
import type { GoAnalysisService } from '../analysis/types';
import { createGoAI } from '../ai/createGoAI';
import { undoForGameMode } from '../ai/undoAi';
import type { GoAI, AIStatus } from '../ai/types';
import { isHumanTurn } from '../engine/gameConfig';
import { positionKey } from '../engine/board';
import {
  canResumeGame,
  clearSavedGame,
  loadSavedGame,
  persistActiveGame,
} from '../persistence/saveGame';
import { registerAppLifecycle } from '../../../native/appLifecycle';
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
import type { GameAction, GameState, NewGameSetup, Position, GamePhase } from '../engine/types';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import { downloadTextFile } from '../utils/download';
import { formatEngineError } from '../utils/errorMessages';
import { setupFromConfig } from '../utils/gameSetup';
import {
  notifyGameOver,
  notifyGameplayMove,
  notifyIllegalMove,
} from '../feedback';
import { useGoAI } from './useGoAI';
import { useDelayedAiThinkingIndicator } from './useDelayedAiThinkingIndicator';

export type AppView = 'setup' | 'game';

export interface UseGoGameOptions {
  ai?: GoAI;
  analysis?: GoAnalysisService;
}

export interface UseGoGameResult {
  view: AppView;
  setupDraft: NewGameSetup;
  canCancelSetup: boolean;
  resumeSnapshot: GameState | null;
  displaySavedGame: GameState | null;
  state: GameState | null;
  moves: ReturnType<typeof getMoveList>;
  error: string | null;
  canUndo: boolean;
  canAct: boolean;
  canPlay: boolean;
  canConfirmScore: boolean;
  canResume: boolean;
  isScoring: boolean;
  isEnded: boolean;
  isReviewing: boolean;
  aiStatus: AIStatus;
  isAiThinking: boolean;
  showAiThinkingIndicator: boolean;
  analysis: GoAnalysisService;
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
  continueGame: () => void;
  discardSavedGame: () => void;
  exportCurrentSgf: () => void;
  importSgfFile: (content: string) => void;
  enterReview: () => void;
  exitReview: () => void;
  clearError: () => void;
  retryAi: () => void;
}

export function useGoGame(options: UseGoGameOptions = {}): UseGoGameResult {
  const ai = useMemo(() => options.ai ?? createGoAI(), [options.ai]);
  const analysis = useMemo(() => options.analysis ?? createGoAnalysis(), [options.analysis]);
  const initialSaved = useMemo(() => loadSavedGame(), []);
  const [view, setView] = useState<AppView>('setup');
  const viewRef = useRef<AppView>('setup');
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
  const [isReviewing, setIsReviewing] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  const aiStatusRef = useRef<AIStatus>('idle');
  const actionInFlightRef = useRef(false);
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const wasBackgroundedRef = useRef(false);
  const lifecycleRef = useRef({
    cancelPendingAi: () => {},
    resumeAiAfterBackground: () => {},
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state?.phase === 'ended' && prevPhaseRef.current !== 'ended') {
      notifyGameOver();
    }
    prevPhaseRef.current = state?.phase ?? null;
  }, [state?.phase]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (view === 'game' && state) {
      persistActiveGame(state);
    }
  }, [state, view]);

  const applyEngineState = useCallback((nextState: GameState) => {
    notifyGameplayMove(stateRef.current, nextState);
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const { status: aiStatus, cancelPending: cancelPendingAi, resumeAfterBackground: resumeAiAfterBackground, retry: retryAi } = useGoAI({
    ai,
    state,
    enabled: view === 'game',
    onStateChange: applyEngineState,
    onError: setError,
  });

  lifecycleRef.current = {
    cancelPendingAi,
    resumeAiAfterBackground,
  };

  useEffect(() => {
    return registerAppLifecycle({
      onBackground: () => {
        if (viewRef.current === 'game' && stateRef.current) {
          persistActiveGame(stateRef.current);
        }

        wasBackgroundedRef.current = true;
        lifecycleRef.current.cancelPendingAi();
      },
      onForeground: () => {
        if (!wasBackgroundedRef.current) {
          return;
        }

        wasBackgroundedRef.current = false;
        lifecycleRef.current.resumeAiAfterBackground();
      },
    });
  }, []);

  useEffect(() => {
    actionInFlightRef.current = false;
  }, [state]);

  useEffect(() => {
    aiStatusRef.current = aiStatus;
  }, [aiStatus]);

  const dispatchAction = useCallback(
    (action: GameAction) => {
      if (action.type === 'undo') {
        cancelPendingAi();
        setState((current) => {
          if (!current) return current;
          const result = undoForGameMode(current);
          if (result.ok) {
            setError(null);
            return result.state;
          }
          setError(formatEngineError(result.error));
          return current;
        });
        return;
      }

      if (aiStatusRef.current === 'thinking') {
        return;
      }

      if (actionInFlightRef.current) {
        return;
      }

      actionInFlightRef.current = true;

      setState((current) => {
        if (!current) return current;
        const result = dispatch(current, action);
        if (result.ok) {
          setError(null);
          notifyGameplayMove(current, result.state);
          return result.state;
        }
        if (action.type === 'play') {
          notifyIllegalMove();
        }
        setError(formatEngineError(result.error));
        return current;
      });
    },
    [cancelPendingAi],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadGameState = useCallback(
    (nextState: GameState) => {
      cancelPendingAi();
      const setup = setupFromConfig(nextState.config);
      stateRef.current = nextState;
      setState(nextState);
      setLastSetup(setup);
      setSetupDraft(setup);
      setResumeSnapshot(null);
      setSavedGameState(null);
      setView('game');
      setError(null);
      persistActiveGame(nextState);
    },
    [cancelPendingAi],
  );

  const openSetup = useCallback(() => {
    const current = stateRef.current;

    setIsReviewing(false);
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
    } else {
      setView('setup');
    }
    setError(null);
  }, []);

  const startGame = useCallback(
    (setup: NewGameSetup) => {
      cancelPendingAi();
      setIsReviewing(false);
      const nextState = createGameFromSetup(setup);
      stateRef.current = nextState;
      setState(nextState);
      setLastSetup(setup);
      setSetupDraft(setup);
      setResumeSnapshot(null);
      setSavedGameState(null);
      setView('game');
      setError(null);
      persistActiveGame(nextState);
    },
    [cancelPendingAi],
  );

  const resumeSavedGame = useCallback(() => {
    if (!resumeSnapshot) return;
    loadGameState(resumeSnapshot);
  }, [loadGameState, resumeSnapshot]);

  const continueGame = useCallback(() => {
    const current = stateRef.current;
    if (current) {
      setView('game');
      setError(null);
      return;
    }

    if (resumeSnapshot) {
      loadGameState(resumeSnapshot);
    }
  }, [loadGameState, resumeSnapshot]);

  const discardSavedGame = useCallback(() => {
    cancelPendingAi();
    clearSavedGame();
    setResumeSnapshot(null);
    stateRef.current = null;
    setState(null);
    setIsReviewing(false);
    setView('setup');
    setError(null);
  }, [cancelPendingAi]);

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

  const enterReview = useCallback(() => {
    if (stateRef.current?.phase === 'ended') {
      setIsReviewing(true);
      setError(null);
    }
  }, []);

  const exitReview = useCallback(() => {
    setIsReviewing(false);
  }, []);

  const humanCanInteract =
    Boolean(state && state.phase === 'playing' && isHumanTurn(state.config, state.currentPlayer));
  const isAiThinking = aiStatus === 'thinking';
  const showAiThinkingIndicator = useDelayedAiThinkingIndicator(isAiThinking);
  const canPlay = humanCanInteract && !isAiThinking;
  const canAct = humanCanInteract && !isAiThinking;

  const play = useCallback((position: Position) => {
    const current = stateRef.current;
    if (!current || current.phase !== 'playing') return;
    if (!isHumanTurn(current.config, current.currentPlayer)) return;
    if (aiStatusRef.current === 'thinking') return;
    if (actionInFlightRef.current) return;

    actionInFlightRef.current = true;

    const result = dispatch(current, { type: 'play', position });
    if (result.ok) {
      setError(null);
      notifyGameplayMove(current, result.state);
      stateRef.current = result.state;
      setState(result.state);
    } else {
      notifyIllegalMove();
      setError(formatEngineError(result.error));
      actionInFlightRef.current = false;
    }
  }, []);

  const markDead = useCallback((position: Position) => {
    const current = stateRef.current;
    if (!current || current.phase !== 'scoring') return;
    if (actionInFlightRef.current) return;

    actionInFlightRef.current = true;

    const result = dispatch(current, { type: 'markDead', position });
    if (result.ok) {
      setError(null);
      stateRef.current = result.state;
      setState(result.state);
    } else {
      setError(formatEngineError(result.error));
      actionInFlightRef.current = false;
    }
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

  const displaySavedGame = useMemo(() => {
    const candidate = state ?? resumeSnapshot;
    return candidate && canResumeGame(candidate) ? candidate : null;
  }, [resumeSnapshot, state]);

  return {
    view,
    setupDraft,
    canCancelSetup: savedGameState !== null,
    resumeSnapshot,
    displaySavedGame,
    state,
    moves: state ? getMoveList(state) : [],
    error,
    canUndo: Boolean(state && state.history.length > 0 && state.phase === 'playing'),
    canAct,
    canPlay,
    canConfirmScore: state?.phase === 'scoring',
    canResume: state?.phase === 'scoring',
    isScoring: state?.phase === 'scoring',
    isEnded: state?.phase === 'ended',
    isReviewing,
    aiStatus,
    isAiThinking,
    showAiThinkingIndicator,
    analysis,
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
    continueGame,
    discardSavedGame,
    exportCurrentSgf,
    importSgfFile,
    enterReview,
    exitReview,
    clearError,
    retryAi,
  };
}
