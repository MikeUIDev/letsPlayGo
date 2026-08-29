import { getConceptDefinition } from '../concepts/concepts';
import type { LiveCoachFeedback, LiveCoachPanelModel } from './types';

export function formatLiveCoachPanel(feedback: LiveCoachFeedback | null): LiveCoachPanelModel | null {
  if (!feedback) {
    return null;
  }

  if (feedback.primaryInsight) {
    return {
      sectionTitle: 'Coach',
      headline: feedback.primaryInsight.title,
      detail: feedback.primaryInsight.explanation,
      secondaryDetail: feedback.secondaryInsight?.explanation ?? null,
      isWarning:
        feedback.primaryInsight.severity === 'warning' ||
        feedback.primaryInsight.severity === 'critical',
      concept: feedback.primaryConcept,
      secondaryConcept: feedback.secondaryConcept,
    };
  }

  if (feedback.primaryConcept) {
    const definition = getConceptDefinition(feedback.primaryConcept.concept);
    return {
      sectionTitle: 'Coach',
      headline: definition.name,
      detail: feedback.primaryConcept.teachingLine ?? definition.shortDefinition,
      secondaryDetail: feedback.secondaryConcept?.teachingLine ?? null,
      isWarning: false,
      concept: feedback.primaryConcept,
      secondaryConcept: feedback.secondaryConcept,
    };
  }

  return null;
}
