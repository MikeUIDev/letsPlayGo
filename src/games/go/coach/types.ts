import type { Position } from '../engine/types';
import type { GoConcept } from '../concepts/types';
import type { DetectedConcept } from '../concepts/types';

export type CoachInsightType =
  | 'missed_capture'
  | 'allowed_capture'
  | 'self_atari'
  | 'left_group_in_atari'
  | 'missed_defense'
  | 'liberty_loss'
  | 'premature_pass'
  | 'large_score_loss'
  | 'better_move_available';

export type CoachInsightSeverity = 'info' | 'warning' | 'critical';

export type CoachInsight = {
  type: CoachInsightType;
  severity: CoachInsightSeverity;
  title: string;
  explanation: string;
  relatedPositions?: Position[];
  concept?: GoConcept;
};

export type CoachExplanation = {
  primary: CoachInsight | null;
  secondary: CoachInsight | null;
  primaryConcept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
  positiveHeadline?: string;
  positiveDetail?: string;
  lightweightHeadline?: string;
  showScoreLoss: boolean;
};

/** Priority order for ranking insights (lower = higher priority). */
export const COACH_INSIGHT_PRIORITY: Record<CoachInsightType, number> = {
  missed_defense: 1,
  allowed_capture: 2,
  missed_capture: 3,
  self_atari: 4,
  premature_pass: 5,
  left_group_in_atari: 6,
  liberty_loss: 6,
  large_score_loss: 7,
  better_move_available: 8,
};

export const MAX_VISIBLE_COACH_INSIGHTS = 2;
