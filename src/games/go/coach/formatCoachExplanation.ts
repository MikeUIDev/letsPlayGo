import type { BoardSize, StoneColor } from '../engine/types';
import type { MoveEvaluation } from '../review/moveEvaluation';
import { formatEstimatedScoreLoss } from '../review/scorePerspective';
import { formatCandidateLabel } from '../analysis/ApiGoAnalysis';
import { formatCoordinate } from '../utils/coordinates';
import type { CoachExplanation } from './types';

export type CoachPanelContent = {
  sectionTitle: string;
  qualityLabel: string;
  playedMoveLabel: string;
  primaryTitle: string | null;
  primaryExplanation: string | null;
  secondaryExplanation: string | null;
  scoreLossText: string | null;
  positiveHeadline: string | null;
  positiveDetail: string | null;
  bestMoveLabel: string | null;
  showBetterMoves: boolean;
  showScoreLoss: boolean;
};

export function formatCoachPanelContent(options: {
  evaluation: MoveEvaluation;
  explanation: CoachExplanation;
  boardSize: BoardSize;
}): CoachPanelContent {
  const { evaluation, explanation, boardSize } = options;
  const bestCandidate = evaluation.bestCandidates[0] ?? null;

  return {
    sectionTitle: 'Coach',
    qualityLabel: evaluation.quality,
    playedMoveLabel: '',
    primaryTitle: explanation.primary?.title ?? explanation.positiveHeadline ?? explanation.lightweightHeadline ?? null,
    primaryExplanation: explanation.primary?.explanation ?? explanation.positiveDetail ?? null,
    secondaryExplanation: explanation.secondary?.explanation ?? null,
    scoreLossText:
      explanation.showScoreLoss && evaluation.scoreLoss > 0
        ? formatEstimatedScoreLoss(evaluation.scoreLoss)
        : null,
    positiveHeadline: explanation.positiveHeadline ?? null,
    positiveDetail: explanation.positiveDetail ?? null,
    bestMoveLabel: bestCandidate ? formatCandidateLabel(bestCandidate, boardSize) : null,
    showBetterMoves: evaluation.bestCandidates.length > 0 && evaluation.quality !== 'good',
    showScoreLoss: explanation.showScoreLoss,
  };
}

export function formatVariationMoveLabel(
  color: StoneColor,
  position: { row: number; col: number } | 'pass',
  boardSize: BoardSize,
): string {
  const colorLabel = color === 'black' ? 'Black' : 'White';
  if (position === 'pass') {
    return `${colorLabel} Pass`;
  }

  return `${colorLabel} ${formatCoordinate(position, boardSize)}`;
}
