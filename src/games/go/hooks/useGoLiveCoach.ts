import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatAnalysisError } from '../analysis/errors';
import type { GoAnalysisService } from '../analysis/types';
import { formatCandidateLabel } from '../analysis/ApiGoAnalysis';
import { getConceptHighlights } from '../coach/evaluateCoach';
import type { DetectedConcept } from '../concepts/types';
import type { GoConcept } from '../concepts/types';
import { aiOfflineMessage } from '../ai/errors';
import { isHumanTurn } from '../engine/gameConfig';
import {
  buildAnalysisRequest,
  getCandidateMarkers,
  reconstructStateAtIndex,
} from '../engine/reviewState';
import type { GameState } from '../engine/types';
import { evaluateLiveCoach, shouldCoachMove } from '../liveCoach/evaluateLiveCoach';
import { formatLiveCoachPanel } from '../liveCoach/formatLiveCoachPanel';
import type { LiveCoachFeedback, LiveCoachHint, LiveCoachHintStatus } from '../liveCoach/types';
import { isNetworkOnline } from '../../../native/networkStatus';

export type UseGoLiveCoachOptions = {
  state: GameState | null;
  analysis: GoAnalysisService;
  enabled: boolean;
  aiStatus: 'idle' | 'thinking' | 'error';
};

export type UseGoLiveCoachResult = {
  feedback: LiveCoachFeedback | null;
  panel: ReturnType<typeof formatLiveCoachPanel>;
  hint: LiveCoachHint | null;
  hintStatus: LiveCoachHintStatus;
  hintError: string | null;
  canRequestHint: boolean;
  hintMarkers: Map<string, number>;
  emphasizeHint: boolean;
  conceptHighlightKeys: Set<string>;
  expandedConceptId: GoConcept | null;
  toggleConcept: (concept: DetectedConcept) => void;
  dismissFeedback: () => void;
  requestHint: () => void;
  clearHint: () => void;
};

export function useGoLiveCoach({
  state,
  analysis,
  enabled,
  aiStatus,
}: UseGoLiveCoachOptions): UseGoLiveCoachResult {
  const [feedback, setFeedback] = useState<LiveCoachFeedback | null>(null);
  const [hint, setHint] = useState<LiveCoachHint | null>(null);
  const [hintStatus, setHintStatus] = useState<LiveCoachHintStatus>('idle');
  const [hintError, setHintError] = useState<string | null>(null);
  const [expandedConceptId, setExpandedConceptId] = useState<GoConcept | null>(null);

  const hintGenerationRef = useRef(0);
  const lastHistoryLengthRef = useRef(0);
  const stateRef = useRef(state);

  stateRef.current = state;

  const clearHint = useCallback(() => {
    hintGenerationRef.current += 1;
    setHint(null);
    setHintStatus('idle');
    setHintError(null);
  }, []);

  const dismissFeedback = useCallback(() => {
    setFeedback(null);
    setExpandedConceptId(null);
  }, []);

  useEffect(() => {
    if (!enabled || !state || state.phase !== 'playing') {
      setFeedback(null);
      clearHint();
      lastHistoryLengthRef.current = state?.history.length ?? 0;
      return;
    }

    const historyLength = state.history.length;

    if (historyLength < lastHistoryLengthRef.current) {
      setFeedback(null);
      setExpandedConceptId(null);
      clearHint();
      lastHistoryLengthRef.current = historyLength;
      return;
    }

    if (historyLength === lastHistoryLengthRef.current) {
      return;
    }

    clearHint();
    lastHistoryLengthRef.current = historyLength;

    const lastEntry = state.history[historyLength - 1];
    if (!lastEntry) {
      return;
    }

    const playedMove = lastEntry.move;
    if (playedMove.type === 'resign') {
      setFeedback(null);
      return;
    }

    if (!shouldCoachMove(state.config, playedMove.color)) {
      return;
    }

    if (playedMove.type !== 'play') {
      setFeedback(null);
      return;
    }

    const beforeState = reconstructStateAtIndex(state, historyLength - 1);
    const nextFeedback = evaluateLiveCoach({
      beforeState,
      afterState: state,
      playedMove,
      player: playedMove.color,
      nextMove: null,
    });

    setFeedback(nextFeedback);
    setExpandedConceptId(null);
  }, [clearHint, enabled, state]);

  const canRequestHint = Boolean(
    enabled &&
      state &&
      state.phase === 'playing' &&
      isHumanTurn(state.config, state.currentPlayer) &&
      aiStatus !== 'thinking',
  );

  const requestHint = useCallback(() => {
    if (!state || !canRequestHint) {
      return;
    }

    if (!isNetworkOnline()) {
      setHintStatus('error');
      setHintError(aiOfflineMessage());
      setHint(null);
      return;
    }

    const generation = hintGenerationRef.current + 1;
    hintGenerationRef.current = generation;
    const requestMoveIndex = state.history.length;

    setHintStatus('loading');
    setHintError(null);
    setHint(null);

    const request = buildAnalysisRequest(state, requestMoveIndex);

    void analysis.analyze(request).then(
      (result) => {
        if (hintGenerationRef.current !== generation) {
          return;
        }

        const current = stateRef.current;
        if (!current || current.history.length !== requestMoveIndex) {
          return;
        }

        if (!isHumanTurn(current.config, current.currentPlayer)) {
          return;
        }

        const candidate = result.candidates.find((entry) => entry.type === 'play') ?? null;
        if (!candidate || candidate.type !== 'play') {
          setHintStatus('error');
          setHintError('AI hint is unavailable right now.');
          return;
        }

        setHint({
          position: candidate.position,
          label: `Consider ${formatCandidateLabel(candidate, current.board.size)}.`,
          why: null,
        });
        setHintStatus('ready');
      },
      (error: unknown) => {
        if (hintGenerationRef.current !== generation) {
          return;
        }

        setHintStatus('error');
        setHintError(formatAnalysisError(error));
        setHint(null);
      },
    );
  }, [analysis, canRequestHint, state]);

  const toggleConcept = useCallback((concept: DetectedConcept) => {
    setExpandedConceptId((current) => (current === concept.concept ? null : concept.concept));
  }, []);

  const panel = useMemo(() => formatLiveCoachPanel(feedback), [feedback]);

  const expandedConcept = useMemo(() => {
    if (!feedback || !expandedConceptId) {
      return null;
    }

    if (feedback.primaryConcept?.concept === expandedConceptId) {
      return feedback.primaryConcept;
    }

    if (feedback.secondaryConcept?.concept === expandedConceptId) {
      return feedback.secondaryConcept;
    }

    return null;
  }, [expandedConceptId, feedback]);

  const conceptHighlightKeys = useMemo(
    () => getConceptHighlights(null, expandedConcept),
    [expandedConcept],
  );

  const hintMarkers = useMemo(() => {
    if (!hint?.position || !state) {
      return new Map<string, number>();
    }

    return getCandidateMarkers(state.board, [{ type: 'play', position: hint.position }]);
  }, [hint?.position, state]);

  return {
    feedback,
    panel,
    hint,
    hintStatus,
    hintError,
    canRequestHint,
    hintMarkers,
    emphasizeHint: hintStatus === 'ready' && hintMarkers.size > 0,
    conceptHighlightKeys,
    expandedConceptId,
    toggleConcept,
    dismissFeedback,
    requestHint,
    clearHint,
  };
}
