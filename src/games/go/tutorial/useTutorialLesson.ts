import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dispatch, getMoveList } from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import type { GameState, Position } from '../engine/types';
import { getTerritoryOwnershipMap } from '../engine/scoring';
import { getGroupsInAtari } from '../coach/libertyAnalysis';
import { MockGoAI } from '../ai/MockGoAI';
import { highlightKeys } from '../learn/utils/staticBoard';
import { buildTutorialState } from './buildState';
import { buildKoRecaptureDemoState } from './koLessonState';
import { getHintForAttempt } from './hints';
import {
  loadTutorialProgress,
  markLessonComplete,
  saveTutorialProgress,
  updateLessonResume,
} from './progress';
import type {
  TutorialFeedbackState,
  TutorialFreePlayStep,
  TutorialHint,
  TutorialLesson,
  TutorialStep,
} from './types';
import { getIllegalMoveMessage, validatePlayStep } from './validate';

function buildAiRequest(state: GameState) {
  return {
    boardSize: state.board.size,
    komi: state.config.komi,
    colorToMove: state.currentPlayer,
    difficulty: 'beginner' as const,
    moves: getMoveList(state),
    state,
  };
}

function buildStateForStep(step: TutorialStep, previousState: GameState | null): GameState | null {
  if (step.kind === 'free-play') {
    return buildTutorialState(step.size, [], step.humanColor);
  }

  if (step.kind === 'play' && step.presetState === 'ko-recapture-demo') {
    return buildKoRecaptureDemoState();
  }

  if (step.kind === 'play' && step.continueFromPrevious && previousState) {
    return {
      ...previousState,
      currentPlayer: step.currentPlayer,
    };
  }

  const stones = step.kind === 'info' ? (step.stones ?? []) : step.stones;
  const player =
    step.kind === 'info'
      ? (step.currentPlayer ?? 'black')
      : step.currentPlayer;

  return buildTutorialState(9, stones, player);
}

export function useTutorialLesson(lesson: TutorialLesson, initialStepIndex = 0) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [feedbackState, setFeedbackState] = useState<TutorialFeedbackState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [hint, setHint] = useState<TutorialHint | null>(null);
  const [boardState, setBoardState] = useState<GameState | null>(null);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [tipMessage, setTipMessage] = useState<string | null>(null);
  const [humanMoveCount, setHumanMoveCount] = useState(0);
  const aiRef = useRef(new MockGoAI({ minDelayMs: 0, maxDelayMs: 0, random: () => 0.5 }));
  const carriedStateRef = useRef<GameState | null>(null);

  const step = lesson.steps[stepIndex];
  const isComplete = stepIndex >= lesson.steps.length;
  const currentStep = isComplete ? null : step;

  useEffect(() => {
    if (!currentStep) {
      return;
    }

    const nextState = buildStateForStep(currentStep, carriedStateRef.current);
    setBoardState(nextState);
    setFeedbackState('idle');
    setFeedbackMessage('');
    setAttemptCount(0);
    setHint(null);
    setLastMove(null);
    setTipMessage(null);
    setHumanMoveCount(0);
  }, [currentStep, lesson.id, stepIndex]);

  useEffect(() => {
    if (!currentStep) {
      return;
    }
    const progress = updateLessonResume(loadTutorialProgress(), lesson.id, stepIndex);
    saveTutorialProgress(progress);
  }, [currentStep, lesson.id, stepIndex]);

  const territoryMap = useMemo(() => {
    if (!boardState || !currentStep || currentStep.kind !== 'info' || !currentStep.showTerritory) {
      return new Map();
    }
    return getTerritoryOwnershipMap(boardState.board);
  }, [boardState, currentStep]);

  const conceptHighlights = useMemo(() => {
    if (hint?.highlights?.length) {
      return highlightKeys(hint.highlights);
    }
    if (currentStep?.kind === 'info' && currentStep.highlights?.length) {
      return highlightKeys(currentStep.highlights);
    }
    if (currentStep?.kind === 'play' && currentStep.highlights?.length && feedbackState !== 'correct') {
      return highlightKeys(currentStep.highlights);
    }
    return new Set<string>();
  }, [currentStep, feedbackState, hint]);

  const advanceStep = useCallback(() => {
    if (stepIndex >= lesson.steps.length - 1) {
      const progress = markLessonComplete(loadTutorialProgress(), lesson.id);
      saveTutorialProgress(progress);
      setFeedbackState('complete');
      return;
    }
    setStepIndex((index) => index + 1);
  }, [lesson.id, lesson.steps.length, stepIndex]);

  const showHint = useCallback(() => {
    if (!currentStep || (currentStep.kind !== 'play' && currentStep.kind !== 'pass')) {
      return;
    }
    const nextHint = getHintForAttempt(currentStep.hints, attemptCount + 1);
    if (nextHint) {
      setHint(nextHint);
      setAttemptCount((count) => count + 1);
    }
  }, [attemptCount, currentStep]);

  const handleContinue = useCallback(() => {
    if (feedbackState === 'correct') {
      advanceStep();
    }
  }, [advanceStep, feedbackState]);

  const playOpponentMove = useCallback(async (state: GameState) => {
    const ai = aiRef.current;
    const result = await ai.generateMove(buildAiRequest(state));
    if (result.type === 'pass') {
      const passResult = dispatch(state, { type: 'pass' });
      if (passResult.ok) {
        setBoardState(passResult.state);
      }
      return;
    }
    const playResult = dispatch(state, { type: 'play', position: result.position });
    if (playResult.ok) {
      setBoardState(playResult.state);
      setLastMove(result.position);
    }
  }, []);

  const maybeShowFreePlayTip = useCallback(
    (state: GameState, freePlayStep: TutorialFreePlayStep) => {
      if (!freePlayStep.tips?.length) {
        return;
      }
      const atariGroups = getGroupsInAtari(state.board, freePlayStep.humanColor);
      if (atariGroups.length > 0) {
        setTipMessage('Your group is in Atari.');
        return;
      }
      const tip = freePlayStep.tips[humanMoveCount % freePlayStep.tips.length];
      setTipMessage(tip ?? null);
    },
    [humanMoveCount],
  );

  const handlePlay = useCallback(
    async (position: Position) => {
      if (!boardState || !currentStep) {
        return;
      }

      if (currentStep.kind === 'free-play') {
        if (boardState.currentPlayer !== currentStep.humanColor) {
          return;
        }
        const result = dispatch(boardState, { type: 'play', position });
        if (!result.ok) {
          setFeedbackState('try-again');
          setFeedbackMessage(getIllegalMoveMessage(result.error));
          return;
        }
        setBoardState(result.state);
        setLastMove(position);
        setHumanMoveCount((count) => count + 1);
        maybeShowFreePlayTip(result.state, currentStep);

        if (result.state.phase === 'scoring') {
          setFeedbackState('correct');
          setFeedbackMessage('Both players passed. You reached scoring — nice work on your first 9×9 game!');
          return;
        }

        if (currentStep.targetMoves && humanMoveCount + 1 >= currentStep.targetMoves) {
          setFeedbackState('correct');
          setFeedbackMessage('Great practice! You can finish the lesson or keep playing and pass when ready.');
          return;
        }

        await playOpponentMove(result.state);
        return;
      }

      if (currentStep.kind !== 'play') {
        setFeedbackState('try-again');
        setFeedbackMessage(currentStep.kind === 'pass' ? currentStep.wrongFeedback : 'Use Continue for this step.');
        return;
      }

      const playStep = currentStep;
      const legality = isLegalPlay(boardState, position);

      if (playStep.expectIllegal) {
        if (!legality.legal && legality.reason === playStep.illegalReason) {
          setFeedbackState('correct');
          setFeedbackMessage(playStep.illegalSuccessFeedback ?? 'That move is correctly forbidden.');
          return;
        }
        if (!legality.legal) {
          setFeedbackState('try-again');
          setFeedbackMessage(getIllegalMoveMessage(legality.reason ?? 'illegal_move'));
          return;
        }
        const result = dispatch(boardState, { type: 'play', position });
        if (!result.ok) {
          setFeedbackState('try-again');
          setFeedbackMessage(getIllegalMoveMessage(result.error));
          return;
        }
        setFeedbackState('try-again');
        setFeedbackMessage(playStep.legalButWrongFeedback || 'Try the immediate recapture at the marked point.');
        setAttemptCount((count) => count + 1);
        return;
      }

      if (!legality.legal) {
        setFeedbackState('try-again');
        setFeedbackMessage(getIllegalMoveMessage(legality.reason ?? 'illegal_move'));
        setAttemptCount((count) => count + 1);
        return;
      }

      const beforeState = boardState;
      const result = dispatch(boardState, { type: 'play', position });
      if (!result.ok) {
        setFeedbackState('try-again');
        setFeedbackMessage(getIllegalMoveMessage(result.error));
        return;
      }

      const move = result.state.history.at(-1)?.move;
      if (!move || move.type !== 'play') {
        return;
      }

      const validation = validatePlayStep(beforeState, result.state, move, playStep.validation);
      if (!validation.ok) {
        setBoardState(beforeState);
        setFeedbackState('try-again');
        setFeedbackMessage(
          validation.reason === 'legal-but-wrong'
            ? playStep.legalButWrongFeedback
            : playStep.wrongFeedback,
        );
        setAttemptCount((count) => count + 1);
        return;
      }

      carriedStateRef.current = result.state;
      setBoardState(result.state);
      setLastMove(position);
      setFeedbackState('correct');
      setFeedbackMessage(playStep.correctFeedback);
    },
    [boardState, currentStep, humanMoveCount, maybeShowFreePlayTip, playOpponentMove],
  );

  const handlePass = useCallback(() => {
    if (!boardState || !currentStep) {
      return;
    }

    if (currentStep.kind === 'free-play') {
      const result = dispatch(boardState, { type: 'pass' });
      if (!result.ok) {
        setFeedbackState('try-again');
        setFeedbackMessage(getIllegalMoveMessage(result.error));
        return;
      }
      setBoardState(result.state);
      if (result.state.phase === 'scoring') {
        setFeedbackState('correct');
        setFeedbackMessage('Both players passed. Scoring has started.');
      }
      return;
    }

    if (currentStep.kind !== 'pass') {
      setFeedbackState('try-again');
      setFeedbackMessage('This step expects a stone move, not a pass.');
      return;
    }

    if (boardState.currentPlayer !== currentStep.currentPlayer) {
      setFeedbackState('try-again');
      setFeedbackMessage(currentStep.wrongFeedback);
      return;
    }

    const result = dispatch(boardState, { type: 'pass' });
    if (!result.ok) {
      setFeedbackState('try-again');
      setFeedbackMessage(getIllegalMoveMessage(result.error));
      return;
    }

    let nextState = result.state;
    if (currentStep.autoOpponentPass && nextState.phase === 'playing') {
      const opponentPass = dispatch(nextState, { type: 'pass' });
      if (opponentPass.ok) {
        nextState = opponentPass.state;
      }
    }

    carriedStateRef.current = nextState;
    setBoardState(nextState);
    setFeedbackState('correct');
    setFeedbackMessage(currentStep.correctFeedback);
  }, [boardState, currentStep]);

  const goToPreviousStep = useCallback(() => {
    carriedStateRef.current = null;
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const restartLesson = useCallback(() => {
    carriedStateRef.current = null;
    setStepIndex(0);
    setFeedbackState('idle');
  }, []);

  const canPlay = Boolean(
    boardState &&
      currentStep &&
      feedbackState !== 'correct' &&
      feedbackState !== 'complete' &&
      (currentStep.kind === 'play' || currentStep.kind === 'free-play'),
  );

  const canPass = Boolean(
    boardState &&
      currentStep &&
      (currentStep.kind === 'pass' || currentStep.kind === 'free-play') &&
      feedbackState !== 'correct' &&
      feedbackState !== 'complete',
  );

  const showBoard = Boolean(
    boardState &&
      currentStep &&
      (currentStep.kind === 'play' ||
        currentStep.kind === 'pass' ||
        currentStep.kind === 'free-play' ||
        (currentStep.kind === 'info' && (currentStep.stones?.length || currentStep.showTerritory))),
  );

  return {
    stepIndex,
    currentStep,
    isComplete,
    boardState,
    lastMove,
    feedbackState,
    feedbackMessage,
    hint,
    tipMessage,
    territoryMap,
    conceptHighlights,
    showBoard,
    canPlay,
    canPass,
    showHint,
    handlePlay,
    handlePass,
    handleContinue,
    advanceStep,
    goToPreviousStep,
    restartLesson,
  };
}
