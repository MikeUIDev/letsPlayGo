import { detectSelfAtari } from '../coach/detectors/atariDetector';
import { detectLeftGroupInAtari } from '../coach/detectors/libertyDetector';
import {
  COACH_INSIGHT_PRIORITY,
  MAX_VISIBLE_COACH_INSIGHTS,
  type CoachInsight,
} from '../coach/types';
import { detectMoveConcepts, selectConcepts } from '../concepts/detectors';
import type { DetectedConcept } from '../concepts/types';
import type { GameState, Move } from '../engine/types';
import type { LiveCoachFeedback } from './types';

export type LiveCoachEvaluationContext = {
  beforeState: GameState;
  afterState: GameState;
  playedMove: Move;
  player: Move['color'];
  nextMove?: Move | null;
};

function rankInsights(insights: CoachInsight[]): CoachInsight[] {
  return [...insights].sort(
    (left, right) => COACH_INSIGHT_PRIORITY[left.type] - COACH_INSIGHT_PRIORITY[right.type],
  );
}

function collectLocalInsights(context: LiveCoachEvaluationContext): CoachInsight[] {
  const { afterState, playedMove } = context;
  const insights: CoachInsight[] = [];

  if (playedMove.type !== 'play') {
    return insights;
  }

  const selfAtari = detectSelfAtari({
    afterBoard: afterState.board,
    playedMove,
  });
  if (selfAtari) {
    insights.push(selfAtari);
  }

  const leftInAtari = detectLeftGroupInAtari({
    afterBoard: afterState.board,
    playedMove,
  });
  if (leftInAtari && !selfAtari) {
    insights.push(leftInAtari);
  }

  return rankInsights(insights).slice(0, MAX_VISIBLE_COACH_INSIGHTS);
}

function detectConcepts(context: LiveCoachEvaluationContext): {
  primaryConcept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
} {
  const { beforeState, afterState, playedMove, player, nextMove } = context;

  if (playedMove.type !== 'play') {
    return { primaryConcept: null, secondaryConcept: null };
  }

  const detected = detectMoveConcepts({
    beforeBoard: beforeState.board,
    afterBoard: afterState.board,
    afterState,
    beforeState,
    playedMove,
    player,
    nextMove: nextMove ?? null,
  });

  const selected = selectConcepts(detected);
  return {
    primaryConcept: selected.primary,
    secondaryConcept: selected.secondary,
  };
}

function insightIsWarning(insight: CoachInsight): boolean {
  return insight.severity === 'warning' || insight.severity === 'critical';
}

/**
 * Deterministic live-coach evaluation using local detectors only.
 * Returns null when there is nothing meaningful to show.
 */
export function evaluateLiveCoach(context: LiveCoachEvaluationContext): LiveCoachFeedback | null {
  const { afterState, playedMove } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const insights = collectLocalInsights(context);
  const concepts = detectConcepts(context);
  const primaryInsight = insights[0] ?? null;
  const secondaryInsight = insights[1] ?? null;

  if (!primaryInsight && !concepts.primaryConcept) {
    return null;
  }

  if (primaryInsight && insightIsWarning(primaryInsight)) {
    return {
      primaryInsight,
      secondaryInsight,
      primaryConcept: concepts.primaryConcept,
      secondaryConcept:
        concepts.secondaryConcept &&
        concepts.secondaryConcept.concept !== concepts.primaryConcept?.concept
          ? concepts.secondaryConcept
          : null,
      moveIndex: afterState.history.length,
    };
  }

  if (primaryInsight) {
    return {
      primaryInsight,
      secondaryInsight,
      primaryConcept: concepts.primaryConcept,
      secondaryConcept:
        concepts.secondaryConcept &&
        concepts.secondaryConcept.concept !== concepts.primaryConcept?.concept
          ? concepts.secondaryConcept
          : null,
      moveIndex: afterState.history.length,
    };
  }

  return {
    primaryInsight: null,
    secondaryInsight: null,
    primaryConcept: concepts.primaryConcept,
    secondaryConcept:
      concepts.secondaryConcept &&
      concepts.secondaryConcept.concept !== concepts.primaryConcept?.concept
        ? concepts.secondaryConcept
        : null,
    moveIndex: afterState.history.length,
  };
}

export function shouldCoachMove(
  config: GameState['config'],
  mover: Move['color'],
): boolean {
  if (config.mode === 'local') {
    return true;
  }

  return mover === config.humanColor;
}
