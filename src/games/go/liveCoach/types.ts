import type { CoachInsight } from '../coach/types';
import type { DetectedConcept } from '../concepts/types';
import type { Position } from '../engine/types';

export type LiveCoachHintStatus = 'idle' | 'loading' | 'ready' | 'error';

export type LiveCoachHint = {
  position: Position | null;
  label: string;
  why: string | null;
};

export type LiveCoachFeedback = {
  primaryInsight: CoachInsight | null;
  secondaryInsight: CoachInsight | null;
  primaryConcept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
  moveIndex: number;
};

export type LiveCoachPanelModel = {
  sectionTitle: string;
  headline: string | null;
  detail: string | null;
  secondaryDetail: string | null;
  isWarning: boolean;
  concept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
};
