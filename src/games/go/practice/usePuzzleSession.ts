import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dispatch } from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import { highlightKeys } from '../learn/utils/staticBoard';
import { buildPuzzleState } from './buildState';
import { getHintForAttempt } from '../tutorial/hints';
import {
  incrementPuzzleAttempt,
  loadPracticeProgress,
  markPuzzleSolved,
  savePracticeProgress,
  updatePracticeBrowse,
} from './progress';
import type { GoPuzzle, PuzzleFeedbackState, PuzzleHint } from './types';
import { getIllegalMoveMessage, validatePuzzleMove } from './validate';
import { notifyGameplayMove, notifyIllegalMove, notifyPuzzleSuccess } from '../feedback';
import type { GameState, Position } from '../engine/types';

export function usePuzzleSession(puzzle: GoPuzzle) {
  const [stepIndex, setStepIndex] = useState(0);
  const [boardState, setBoardState] = useState<GameState>(() => buildPuzzleState(puzzle));
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [feedbackState, setFeedbackState] = useState<PuzzleFeedbackState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [hint, setHint] = useState<PuzzleHint | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const submittingRef = useRef(false);

  const currentStep = puzzle.solution[stepIndex];
  const isSolved = feedbackState === 'solved';
  const awaitingOpponent = currentStep?.type === 'opponent';

  const resetSession = useCallback(() => {
    submittingRef.current = false;
    setStepIndex(0);
    setBoardState(buildPuzzleState(puzzle));
    setLastMove(null);
    setFeedbackState('idle');
    setFeedbackMessage('');
    setHint(null);
    setAttemptCount(0);
  }, [puzzle]);

  const retryStep = useCallback(() => {
    submittingRef.current = false;
    setFeedbackState('idle');
    setFeedbackMessage('');
  }, []);

  useEffect(() => {
    resetSession();
  }, [puzzle.id, resetSession]);

  useEffect(() => {
    const progress = updatePracticeBrowse(
      loadPracticeProgress(),
      puzzle.category,
      puzzle.difficulty,
    );
    savePracticeProgress(progress);
  }, [puzzle.category, puzzle.difficulty, puzzle.id]);

  useEffect(() => {
    if (!awaitingOpponent || !currentStep || currentStep.type !== 'opponent') {
      return;
    }

    const timer = window.setTimeout(() => {
      const result = dispatch(boardState, { type: 'play', position: currentStep.position });
      if (!result.ok) {
        return;
      }
      setBoardState(result.state);
      setLastMove(currentStep.position);
      setStepIndex((index) => index + 1);
      setFeedbackState('idle');
      setFeedbackMessage('');
    }, 450);

    return () => window.clearTimeout(timer);
  }, [awaitingOpponent, boardState, currentStep]);

  const conceptHighlights = useMemo(() => {
    if (hint?.highlights?.length) {
      return highlightKeys(hint.highlights);
    }
    return new Set<string>();
  }, [hint]);

  const showHint = useCallback(() => {
    const nextHint = getHintForAttempt(puzzle.hints, attemptCount + 1);
    if (nextHint) {
      setHint(nextHint);
      setAttemptCount((count) => count + 1);
    }
  }, [attemptCount, puzzle.hints]);

  const completePuzzle = useCallback(() => {
    const progress = markPuzzleSolved(loadPracticeProgress(), puzzle.id);
    savePracticeProgress(progress);
    setFeedbackState('solved');
    notifyPuzzleSuccess();
  }, [puzzle.id]);

  const handlePlay = useCallback(
    (position: Position) => {
      if (
        submittingRef.current ||
        isSolved ||
        awaitingOpponent ||
        feedbackState === 'correct' ||
        !currentStep ||
        currentStep.type !== 'play'
      ) {
        return;
      }

      submittingRef.current = true;

      const legality = isLegalPlay(boardState, position);
      if (!legality.legal) {
        setFeedbackState('try-again');
        setFeedbackMessage(getIllegalMoveMessage(legality.reason ?? 'illegal_move'));
        notifyIllegalMove();
        const progress = incrementPuzzleAttempt(loadPracticeProgress(), puzzle.id);
        savePracticeProgress(progress);
        setAttemptCount((count) => count + 1);
        submittingRef.current = false;
        return;
      }

      const beforeState = boardState;
      const result = dispatch(boardState, { type: 'play', position });
      if (!result.ok) {
        setFeedbackState('try-again');
        setFeedbackMessage(getIllegalMoveMessage(result.error));
        notifyIllegalMove();
        submittingRef.current = false;
        return;
      }

      const move = result.state.history.at(-1)?.move;
      if (!move || move.type !== 'play') {
        submittingRef.current = false;
        return;
      }

      const validation = validatePuzzleMove(
        beforeState,
        result.state,
        move,
        currentStep.validation,
        beforeState.currentPlayer,
      );

      if (!validation.ok) {
        setFeedbackState('try-again');
        setFeedbackMessage(
          validation.reason === 'legal-but-wrong'
            ? currentStep.wrongFeedback
            : 'That move is not allowed.',
        );
        notifyIllegalMove();
        const progress = incrementPuzzleAttempt(loadPracticeProgress(), puzzle.id);
        savePracticeProgress(progress);
        setAttemptCount((count) => count + 1);
        submittingRef.current = false;
        return;
      }

      setBoardState(result.state);
      setLastMove(position);
      setFeedbackState('correct');
      setFeedbackMessage('Correct!');
      notifyGameplayMove(beforeState, result.state);

      if (stepIndex >= puzzle.solution.length - 1) {
        completePuzzle();
        submittingRef.current = false;
        return;
      }

      setStepIndex((index) => index + 1);
      if (puzzle.solution[stepIndex + 1]?.type !== 'opponent') {
        setFeedbackState('idle');
        setFeedbackMessage('');
      }
      submittingRef.current = false;
    },
    [
      awaitingOpponent,
      boardState,
      completePuzzle,
      currentStep,
      feedbackState,
      isSolved,
      puzzle.id,
      puzzle.solution,
      stepIndex,
    ],
  );

  const canPlay = Boolean(
    boardState &&
      currentStep?.type === 'play' &&
      !isSolved &&
      !awaitingOpponent &&
      feedbackState !== 'correct',
  );

  return {
    boardState,
    lastMove,
    stepIndex,
    feedbackState,
    feedbackMessage,
    hint,
    conceptHighlights,
    isSolved,
    awaitingOpponent,
    canPlay,
    showHint,
    handlePlay,
    resetSession,
    retryStep,
  };
}
