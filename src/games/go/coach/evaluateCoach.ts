import type { AnalysisResult } from '../analysis/types';
import {
  conceptFromInsightType,
  detectMoveConcepts,
  mergeConceptSources,
  selectConcepts,
} from '../concepts/detectors';
import type { DetectedConcept } from '../concepts/types';
import type { GameState, Move } from '../engine/types';
import type { MoveEvaluation } from '../review/moveEvaluation';
import { formatEstimatedScoreLoss } from '../review/scorePerspective';
import { detectAllowedCapture } from './detectors/allowedCaptureDetector';
import { detectSelfAtari } from './detectors/atariDetector';
import { detectMissedCapture } from './detectors/captureDetector';
import { detectMissedDefense } from './detectors/defenseDetector';
import { detectLeftGroupInAtari } from './detectors/libertyDetector';
import { detectPrematurePass } from './detectors/passDetector';
import {
  COACH_INSIGHT_PRIORITY,
  MAX_VISIBLE_COACH_INSIGHTS,
  type CoachExplanation,
  type CoachInsight,
} from './types';

export type CoachEvaluationContext = {
  beforeState: GameState;
  afterState: GameState;
  nextMove: Move | null;
  evaluation: MoveEvaluation;
  beforeAnalysis: AnalysisResult;
};

function detectLargeScoreLossFallback(evaluation: MoveEvaluation): CoachInsight | null {
  if (evaluation.quality !== 'mistake' && evaluation.quality !== 'big_mistake') {
    return null;
  }

  const lossPhrase = formatEstimatedScoreLoss(evaluation.scoreLoss)
    .replace('Lost about ', '')
    .replace(' points', '');

  return {
    type: 'large_score_loss',
    severity: evaluation.quality === 'big_mistake' ? 'critical' : 'warning',
    title: 'A stronger move was available',
    explanation: `KataGo preferred another move here. The played move lost about ${lossPhrase} points compared with the best continuation.`,
  };
}

function detectBetterMoveAvailable(evaluation: MoveEvaluation): CoachInsight | null {
  if (evaluation.quality !== 'inaccuracy') {
    return null;
  }

  return {
    type: 'better_move_available',
    severity: 'info',
    title: 'A slightly stronger move was available',
    explanation: formatEstimatedScoreLoss(evaluation.scoreLoss),
  };
}

function rankInsights(insights: CoachInsight[]): CoachInsight[] {
  return [...insights].sort(
    (left, right) => COACH_INSIGHT_PRIORITY[left.type] - COACH_INSIGHT_PRIORITY[right.type],
  );
}

function selectVisibleInsights(insights: CoachInsight[]): {
  primary: CoachInsight | null;
  secondary: CoachInsight | null;
} {
  const ranked = rankInsights(insights);
  return {
    primary: ranked[0] ?? null,
    secondary: ranked[1] ?? null,
  };
}

function conceptFromInsight(insight: CoachInsight): DetectedConcept | null {
  const concept = insight.concept ?? conceptFromInsightType(insight.type);
  if (!concept) {
    return null;
  }

  return {
    concept,
    relatedPositions: insight.relatedPositions ?? [],
    teachingLine: insight.explanation,
  };
}

function resolveConcepts(
  context: CoachEvaluationContext,
  insights: CoachInsight[],
): { primaryConcept: DetectedConcept | null; secondaryConcept: DetectedConcept | null } {
  const { beforeState, afterState, nextMove, evaluation } = context;
  const detected = detectMoveConcepts({
    beforeBoard: beforeState.board,
    afterBoard: afterState.board,
    afterState,
    beforeState,
    playedMove: evaluation.playedMove,
    player: evaluation.player,
    nextMove,
  });

  const insightConcepts = insights
    .map(conceptFromInsight)
    .filter((concept): concept is DetectedConcept => concept !== null);

  const { primary, secondary } = selectConcepts(mergeConceptSources(detected, insightConcepts));
  return { primaryConcept: primary, secondaryConcept: secondary };
}

export function collectCoachInsights(context: CoachEvaluationContext): CoachInsight[] {
  const { beforeState, afterState, nextMove, evaluation, beforeAnalysis } = context;
  const beforeBoard = beforeState.board;
  const afterBoard = afterState.board;
  const playedMove = evaluation.playedMove;
  const player = evaluation.player;

  const insights: CoachInsight[] = [];

  const missedDefense = detectMissedDefense({
    beforeBoard,
    afterBoard,
    playedMove,
    nextMove,
    player,
    beforeCandidates: beforeAnalysis.candidates,
  });
  if (missedDefense) {
    insights.push(missedDefense);
  }

  const allowedCapture = detectAllowedCapture({
    afterBoard,
    nextMove,
    player,
  });
  if (allowedCapture) {
    insights.push(allowedCapture);
  }

  const missedCapture = detectMissedCapture({
    beforeBoard,
    playedMove,
    player,
    beforeCandidates: beforeAnalysis.candidates,
  });
  if (missedCapture) {
    insights.push(missedCapture);
  }

  const selfAtari = detectSelfAtari({ afterBoard, playedMove });
  if (selfAtari) {
    insights.push(selfAtari);
  }

  const prematurePass = detectPrematurePass({
    playedMove,
    beforeCandidates: beforeAnalysis.candidates,
    scoreLoss: evaluation.scoreLoss,
  });
  if (prematurePass) {
    insights.push(prematurePass);
  }

  const leftInAtari = detectLeftGroupInAtari({ afterBoard, playedMove });
  if (leftInAtari && !selfAtari) {
    insights.push(leftInAtari);
  }

  const largeLoss = detectLargeScoreLossFallback(evaluation);
  if (largeLoss) {
    insights.push(largeLoss);
  }

  const betterMove = detectBetterMoveAvailable(evaluation);
  if (betterMove) {
    insights.push(betterMove);
  }

  return insights;
}

export function evaluateCoach(context: CoachEvaluationContext): CoachExplanation {
  const { evaluation } = context;
  const insights = collectCoachInsights(context);
  const { primary, secondary } = selectVisibleInsights(insights);
  const concepts = resolveConcepts(context, insights);

  if (evaluation.quality === 'good') {
    if (evaluation.playedBestMove) {
      return {
        primary: null,
        secondary: null,
        ...concepts,
        positiveHeadline: 'Best move',
        positiveDetail: 'This was KataGo\'s preferred move.',
        showScoreLoss: false,
      };
    }

    return {
      primary: null,
      secondary: null,
      ...concepts,
      positiveHeadline: 'Good move',
      showScoreLoss: false,
    };
  }

  if (evaluation.quality === 'inaccuracy') {
    return {
      primary: primary?.type === 'better_move_available' ? primary : {
        type: 'better_move_available',
        severity: 'info',
        title: 'A slightly stronger move was available',
        explanation: formatEstimatedScoreLoss(evaluation.scoreLoss),
      },
      secondary: primary?.type === 'better_move_available' ? secondary : secondary,
      ...concepts,
      lightweightHeadline: 'A slightly stronger move was available',
      showScoreLoss: true,
    };
  }

  if (!primary) {
    const fallback = detectLargeScoreLossFallback(evaluation);
    return {
      primary: fallback,
      secondary: null,
      ...concepts,
      showScoreLoss: true,
    };
  }

  return {
    primary,
    secondary: secondary && secondary.type !== primary.type ? secondary : null,
    ...concepts,
    showScoreLoss: true,
  };
}

export function getTopInsights(insights: CoachInsight[]): CoachInsight[] {
  return rankInsights(insights).slice(0, MAX_VISIBLE_COACH_INSIGHTS);
}

export function getConceptHighlights(
  _explanation: CoachExplanation | null,
  expandedConcept: DetectedConcept | null,
): Set<string> {
  if (!expandedConcept) {
    return new Set<string>();
  }

  return new Set(
    expandedConcept.relatedPositions.map((position) => `${position.row},${position.col}`),
  );
}
