import type { GoAnalysisService } from '../analysis/types';
import type { ReviewAnalysisCache } from '../engine/reviewState';
import { buildAnalysisRequest } from '../engine/reviewState';
import type { GameState } from '../engine/types';
import { getMoveList } from '../engine/gameState';
import {
  evaluateMove,
  getEvaluableMoveIndices,
  type MoveEvaluation,
} from './moveEvaluation';

export type ScanStatus = 'idle' | 'scanning' | 'complete' | 'partial';

export type ScanProgress = {
  completed: number;
  total: number;
};

export type ScanResult = {
  evaluations: Map<number, MoveEvaluation>;
  completed: number;
  total: number;
  failed: boolean;
  errorMessage?: string;
};

export async function ensurePositionAnalysis(
  sourceState: GameState,
  positionIndex: number,
  cache: ReviewAnalysisCache,
  analysis: GoAnalysisService,
): Promise<void> {
  if (cache.has(positionIndex)) {
    return;
  }

  const request = buildAnalysisRequest(sourceState, positionIndex);
  const result = await analysis.analyze(request);
  cache.set(positionIndex, result);
}

export async function scanGameForMistakes(options: {
  sourceState: GameState;
  analysis: GoAnalysisService;
  cache: ReviewAnalysisCache;
  isCancelled: () => boolean;
  onProgress: (progress: ScanProgress) => void;
}): Promise<ScanResult> {
  const moveCount = getMoveList(options.sourceState).length;
  const evaluableMoveIndices = getEvaluableMoveIndices(getMoveList(options.sourceState));
  const total = moveCount + 1;
  let completed = 0;
  const evaluations = new Map<number, MoveEvaluation>();

  options.onProgress({ completed, total });

  try {
    for (let positionIndex = 0; positionIndex <= moveCount; positionIndex += 1) {
      if (options.isCancelled()) {
        return {
          evaluations,
          completed,
          total,
          failed: true,
          errorMessage: 'Scan cancelled.',
        };
      }

      if (!options.cache.has(positionIndex)) {
        await ensurePositionAnalysis(
          options.sourceState,
          positionIndex,
          options.cache,
          options.analysis,
        );
      }

      completed += 1;
      options.onProgress({ completed, total });
    }

    const moves = getMoveList(options.sourceState);
    for (const moveIndex of evaluableMoveIndices) {
      if (options.isCancelled()) {
        return {
          evaluations,
          completed,
          total,
          failed: true,
          errorMessage: 'Scan cancelled.',
        };
      }

      const beforeAnalysis = options.cache.get(moveIndex - 1);
      const afterAnalysis = options.cache.get(moveIndex);
      const playedMove = moves[moveIndex - 1];

      if (!beforeAnalysis || !afterAnalysis || !playedMove) {
        continue;
      }

      const evaluation = evaluateMove(moveIndex, playedMove, beforeAnalysis, afterAnalysis);
      if (evaluation) {
        evaluations.set(moveIndex, evaluation);
      }
    }

    return {
      evaluations,
      completed,
      total,
      failed: false,
    };
  } catch (error) {
    return {
      evaluations,
      completed,
      total,
      failed: true,
      errorMessage: error instanceof Error ? error.message : 'Analysis failed.',
    };
  }
}

export function buildEvaluationsFromCache(
  sourceState: GameState,
  cache: ReviewAnalysisCache,
): Map<number, MoveEvaluation> {
  const evaluations = new Map<number, MoveEvaluation>();
  const moves = getMoveList(sourceState);

  for (const moveIndex of getEvaluableMoveIndices(moves)) {
    const beforeAnalysis = cache.get(moveIndex - 1);
    const afterAnalysis = cache.get(moveIndex);
    const playedMove = moves[moveIndex - 1];

    if (!beforeAnalysis || !afterAnalysis || !playedMove) {
      continue;
    }

    const evaluation = evaluateMove(moveIndex, playedMove, beforeAnalysis, afterAnalysis);
    if (evaluation) {
      evaluations.set(moveIndex, evaluation);
    }
  }

  return evaluations;
}

export function tryEvaluateCurrentMove(
  sourceState: GameState,
  moveIndex: number,
  cache: ReviewAnalysisCache,
): MoveEvaluation | null {
  if (moveIndex < 1) {
    return null;
  }

  const moves = getMoveList(sourceState);
  const playedMove = moves[moveIndex - 1];
  const beforeAnalysis = cache.get(moveIndex - 1);
  const afterAnalysis = cache.get(moveIndex);

  if (!playedMove || !beforeAnalysis || !afterAnalysis) {
    return null;
  }

  return evaluateMove(moveIndex, playedMove, beforeAnalysis, afterAnalysis);
}
