import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatAnalysisError } from '../analysis/errors';
import type { AnalysisResult, AnalysisStatus, GoAnalysisService } from '../analysis/types';
import { evaluateCoach, getConceptHighlights } from '../coach/evaluateCoach';
import type { CoachExplanation } from '../coach/types';
import type { DetectedConcept } from '../concepts/types';
import { buildVariationPreview, getVariationMarkerMap, type VariationPreviewResult } from '../coach/variationPreview';
import {
  ReviewAnalysisCache,
  buildAnalysisRequest,
  clampReviewMoveIndex,
  getCandidateMarkers,
  getLastMoveAtIndex,
  getReviewMoveCount,
  getReviewNavigation,
  reconstructStateAtIndex,
} from '../engine/reviewState';
import { getMoveList } from '../engine/gameState';
import type { GameState, Position, StoneColor } from '../engine/types';
import type { GoConcept } from '../concepts/types';
import {
  getMistakeMoveIndices,
  getMistakeNavigation,
  getNextMistakeIndex,
  getPreviousMistakeIndex,
  type MoveEvaluation,
} from '../review/moveEvaluation';
import {
  scanGameForMistakes,
  tryEvaluateCurrentMove,
  type ScanProgress,
  type ScanStatus,
} from '../review/reviewScan';

export type { ScanProgress, ScanStatus };

export interface UseGoReviewOptions {
  sourceState: GameState | null;
  analysis: GoAnalysisService;
  enabled: boolean;
}

export interface UseGoReviewResult {
  moveIndex: number;
  moveCount: number;
  reviewState: GameState | null;
  lastMove: Position | null;
  analysisResult: AnalysisResult | null;
  beforeAnalysis: AnalysisResult | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;
  currentEvaluation: MoveEvaluation | null;
  coachExplanation: CoachExplanation | null;
  candidateMarkers: Map<string, number>;
  emphasizeBestMove: boolean;
  variationMarkers: Map<string, { step: number; color: StoneColor }>;
  variationPreview: VariationPreviewResult | null;
  showBestMove: boolean;
  showVariationLine: boolean;
  canShowVariationLine: boolean;
  toggleShowBestMove: () => void;
  toggleShowVariationLine: () => void;
  expandedConceptId: GoConcept | null;
  conceptHighlightKeys: Set<string>;
  toggleConcept: (concept: DetectedConcept) => void;
  navigation: ReturnType<typeof getReviewNavigation>;
  scanStatus: ScanStatus;
  scanProgress: ScanProgress | null;
  scanError: string | null;
  mistakeIndices: number[];
  mistakeNavigation: ReturnType<typeof getMistakeNavigation>;
  goFirst: () => void;
  goPrevious: () => void;
  goNext: () => void;
  goLast: () => void;
  goPreviousMistake: () => void;
  goNextMistake: () => void;
  findMistakes: () => void;
  retryScan: () => void;
  exitReview: () => void;
}

export function useGoReview({
  sourceState,
  analysis,
  enabled,
}: UseGoReviewOptions): UseGoReviewResult {
  const moveCount = sourceState ? getReviewMoveCount(sourceState) : 0;
  const [moveIndex, setMoveIndex] = useState(moveCount);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [beforeAnalysis, setBeforeAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Map<number, MoveEvaluation>>(new Map());
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showBestMove, setShowBestMove] = useState(false);
  const [showVariationLine, setShowVariationLine] = useState(false);
  const [expandedConceptId, setExpandedConceptId] = useState<GoConcept | null>(null);

  const cacheRef = useRef(new ReviewAnalysisCache());
  const scanGenerationRef = useRef(0);
  const enabledRef = useRef(enabled);

  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled || !sourceState) {
      return;
    }

    scanGenerationRef.current += 1;
    setMoveIndex(getReviewMoveCount(sourceState));
    cacheRef.current = new ReviewAnalysisCache();
    setAnalysisResult(null);
    setBeforeAnalysis(null);
    setAnalysisStatus('idle');
    setAnalysisError(null);
    setEvaluations(new Map());
    setScanStatus('idle');
    setScanProgress(null);
    setScanError(null);
    setShowBestMove(false);
    setShowVariationLine(false);
    setExpandedConceptId(null);
  }, [enabled, sourceState]);

  useEffect(() => {
    setShowBestMove(false);
    setShowVariationLine(false);
    setExpandedConceptId(null);
  }, [moveIndex]);

  const reviewState = useMemo(() => {
    if (!enabled || !sourceState) {
      return null;
    }

    return reconstructStateAtIndex(sourceState, moveIndex);
  }, [enabled, moveIndex, sourceState]);

  const lastMove = useMemo(() => {
    if (!enabled || !sourceState) {
      return null;
    }

    return getLastMoveAtIndex(sourceState, moveIndex);
  }, [enabled, moveIndex, sourceState]);

  const syncBeforeAnalysis = useCallback((index: number) => {
    if (index <= 0) {
      setBeforeAnalysis(null);
      return;
    }

    setBeforeAnalysis(cacheRef.current.get(index - 1) ?? null);
  }, []);

  useEffect(() => {
    if (!enabled || !sourceState) {
      return;
    }

    const cache = cacheRef.current;
    syncBeforeAnalysis(moveIndex);

    const cached = cache.get(moveIndex);
    if (cached) {
      setAnalysisResult(cached);
      setAnalysisStatus('ready');
      setAnalysisError(null);

      const evaluation = tryEvaluateCurrentMove(sourceState, moveIndex, cache);
      if (evaluation) {
        setEvaluations((current) => {
          const next = new Map(current);
          next.set(moveIndex, evaluation);
          return next;
        });
      }

      return;
    }

    const requestGeneration = cache.beginRequest();
    setAnalysisStatus('loading');
    setAnalysisError(null);

    const request = buildAnalysisRequest(sourceState, moveIndex);
    analysis
      .analyze(request)
      .then((result) => {
        if (!cache.isCurrent(requestGeneration) || !enabledRef.current) {
          return;
        }

        cache.set(moveIndex, result);
        setAnalysisResult(result);
        setAnalysisStatus('ready');
        setAnalysisError(null);
        syncBeforeAnalysis(moveIndex);

        const evaluation = tryEvaluateCurrentMove(sourceState, moveIndex, cache);
        if (evaluation) {
          setEvaluations((current) => {
            const next = new Map(current);
            next.set(moveIndex, evaluation);
            return next;
          });
        }
      })
      .catch((error) => {
        if (!cache.isCurrent(requestGeneration) || !enabledRef.current) {
          return;
        }

        setAnalysisResult(null);
        setAnalysisStatus('error');
        setAnalysisError(formatAnalysisError(error));
      });
  }, [analysis, enabled, moveIndex, sourceState, syncBeforeAnalysis]);

  const runScan = useCallback(async () => {
    if (!sourceState) {
      return;
    }

    const generation = scanGenerationRef.current + 1;
    scanGenerationRef.current = generation;
    setScanStatus('scanning');
    setScanError(null);
    setScanProgress({ completed: 0, total: moveCount + 1 });

    const result = await scanGameForMistakes({
      sourceState,
      analysis,
      cache: cacheRef.current,
      isCancelled: () => !enabledRef.current || scanGenerationRef.current !== generation,
      onProgress: (progress) => {
        if (scanGenerationRef.current !== generation) {
          return;
        }

        setScanProgress(progress);
      },
    });

    if (scanGenerationRef.current !== generation || !enabledRef.current) {
      return;
    }

    setEvaluations((current) => {
      const next = new Map(current);
      for (const [index, evaluation] of result.evaluations) {
        next.set(index, evaluation);
      }
      return next;
    });

    syncBeforeAnalysis(moveIndex);
    setAnalysisResult(cacheRef.current.get(moveIndex) ?? null);

    if (result.failed) {
      setScanStatus(result.evaluations.size > 0 ? 'partial' : 'idle');
      setScanError(
        result.evaluations.size > 0
          ? "Analysis couldn't finish. You can still review completed moves."
          : (result.errorMessage ?? 'Analysis is unavailable right now.'),
      );
      return;
    }

    setScanStatus('complete');
    setScanError(null);
  }, [analysis, moveCount, moveIndex, sourceState, syncBeforeAnalysis]);

  const findMistakes = useCallback(() => {
    if (scanStatus === 'scanning') {
      return;
    }

    void runScan();
  }, [runScan, scanStatus]);

  const retryScan = useCallback(() => {
    void runScan();
  }, [runScan]);

  const setClampedIndex = useCallback(
    (nextIndex: number) => {
      setMoveIndex(clampReviewMoveIndex(nextIndex, moveCount));
    },
    [moveCount],
  );

  const goFirst = useCallback(() => setClampedIndex(0), [setClampedIndex]);
  const goPrevious = useCallback(() => setClampedIndex(moveIndex - 1), [moveIndex, setClampedIndex]);
  const goNext = useCallback(() => setClampedIndex(moveIndex + 1), [moveIndex, setClampedIndex]);
  const goLast = useCallback(() => setClampedIndex(moveCount), [moveCount, setClampedIndex]);
  const exitReview = useCallback(() => {}, []);

  const mistakeIndices = useMemo(() => getMistakeMoveIndices(evaluations), [evaluations]);
  const mistakeNavigation = useMemo(
    () => getMistakeNavigation(moveIndex, mistakeIndices),
    [mistakeIndices, moveIndex],
  );

  const goPreviousMistake = useCallback(() => {
    const previous = getPreviousMistakeIndex(moveIndex, mistakeIndices);
    if (previous !== null) {
      setClampedIndex(previous);
    }
  }, [mistakeIndices, moveIndex, setClampedIndex]);

  const goNextMistake = useCallback(() => {
    const next = getNextMistakeIndex(moveIndex, mistakeIndices);
    if (next !== null) {
      setClampedIndex(next);
    }
  }, [mistakeIndices, moveIndex, setClampedIndex]);

  const currentEvaluation = moveIndex >= 1 ? (evaluations.get(moveIndex) ?? null) : null;

  const beforeState = useMemo(() => {
    if (!enabled || !sourceState || moveIndex < 1) {
      return null;
    }

    return reconstructStateAtIndex(sourceState, moveIndex - 1);
  }, [enabled, moveIndex, sourceState]);

  const coachExplanation = useMemo((): CoachExplanation | null => {
    if (!sourceState || moveIndex < 1 || !currentEvaluation || !beforeAnalysis || !beforeState) {
      return null;
    }

    const afterState = reconstructStateAtIndex(sourceState, moveIndex);
    const moves = getMoveList(sourceState);
    const nextMove = moveIndex < moves.length ? moves[moveIndex] : null;

    return evaluateCoach({
      beforeState,
      afterState,
      nextMove,
      evaluation: currentEvaluation,
      beforeAnalysis,
    });
  }, [beforeAnalysis, beforeState, currentEvaluation, moveIndex, sourceState]);

  const bestCandidateVariation = currentEvaluation?.bestCandidates[0]?.variation;

  const tacticalSequence = useMemo(() => {
    if (!coachExplanation) {
      return null;
    }

    const concepts = [
      coachExplanation.primaryConcept,
      coachExplanation.secondaryConcept,
    ].filter((concept): concept is DetectedConcept => concept !== null);

    for (const concept of concepts) {
      if (concept.tacticalSequence && concept.tacticalSequence.length > 0) {
        return concept.tacticalSequence;
      }
    }

    return null;
  }, [coachExplanation]);

  const variationPreview = useMemo(() => {
    if (!beforeState) {
      return null;
    }

    if (tacticalSequence) {
      return buildVariationPreview(beforeState, tacticalSequence, 8);
    }

    if (!bestCandidateVariation) {
      return null;
    }

    return buildVariationPreview(beforeState, bestCandidateVariation);
  }, [beforeState, bestCandidateVariation, tacticalSequence]);

  const canShowVariationLine = Boolean(
    variationPreview && (variationPreview.canRender || variationPreview.textMoves.length > 0),
  );

  const candidateSource =
    moveIndex >= 1 ? (beforeAnalysis ?? cacheRef.current.get(moveIndex - 1)) : analysisResult;

  const candidateMarkers = useMemo(() => {
    if (!reviewState || !candidateSource) {
      return new Map<string, number>();
    }

    return getCandidateMarkers(reviewState.board, candidateSource.candidates);
  }, [candidateSource, reviewState]);

  const variationMarkers = useMemo(() => {
    if (!showVariationLine || !variationPreview) {
      return new Map<string, { step: number; color: StoneColor }>();
    }

    return getVariationMarkerMap(variationPreview);
  }, [showVariationLine, variationPreview]);

  const toggleShowBestMove = useCallback(() => {
    setShowBestMove((current) => !current);
  }, []);

  const toggleShowVariationLine = useCallback(() => {
    setShowVariationLine((current) => !current);
  }, []);

  const toggleConcept = useCallback((concept: DetectedConcept) => {
    setExpandedConceptId((current) => (current === concept.concept ? null : concept.concept));
  }, []);

  const expandedConcept = useMemo(() => {
    if (!coachExplanation || !expandedConceptId) {
      return null;
    }

    if (coachExplanation.primaryConcept?.concept === expandedConceptId) {
      return coachExplanation.primaryConcept;
    }

    if (coachExplanation.secondaryConcept?.concept === expandedConceptId) {
      return coachExplanation.secondaryConcept;
    }

    return null;
  }, [coachExplanation, expandedConceptId]);

  const conceptHighlightKeys = useMemo(
    () => getConceptHighlights(coachExplanation, expandedConcept),
    [coachExplanation, expandedConcept],
  );

  const navigation = getReviewNavigation(moveIndex, moveCount);

  return {
    moveIndex,
    moveCount,
    reviewState,
    lastMove,
    analysisResult,
    beforeAnalysis,
    analysisStatus,
    analysisError,
    currentEvaluation,
    coachExplanation,
    variationPreview,
    candidateMarkers,
    emphasizeBestMove: showBestMove,
    variationMarkers,
    showBestMove,
    showVariationLine,
    canShowVariationLine,
    toggleShowBestMove,
    toggleShowVariationLine,
    expandedConceptId,
    conceptHighlightKeys,
    toggleConcept,
    navigation,
    scanStatus,
    scanProgress,
    scanError,
    mistakeIndices,
    mistakeNavigation,
    goFirst,
    goPrevious,
    goNext,
    goLast,
    goPreviousMistake,
    goNextMistake,
    findMistakes,
    retryScan,
    exitReview,
  };
}
