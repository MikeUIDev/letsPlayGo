import { useId } from 'react';
import { getConceptDefinition } from '../concepts/concepts';
import type { DetectedConcept } from '../concepts/types';
import { LearnMoreLink } from '../learn/components/ConceptReference';

interface ConceptLabelProps {
  concept: DetectedConcept;
  expanded: boolean;
  onToggle: () => void;
}

export function ConceptLabel({ concept, expanded, onToggle }: ConceptLabelProps) {
  const definition = getConceptDefinition(concept.concept);
  const popoverId = useId();

  return (
    <div className="go-concept">
      <p className="review-panel__concept-section-label">Go concept</p>
      <button
        type="button"
        className="go-concept__trigger"
        aria-expanded={expanded}
        aria-controls={popoverId}
        onClick={onToggle}
      >
        <span className="go-concept__name">{definition.name}</span>
        <span className="go-concept__info" aria-hidden="true">
          ⓘ
        </span>
        <span className="visually-hidden">Show definition</span>
      </button>

      {concept.teachingLine && (
        <p className="go-concept__teaching">{concept.teachingLine}</p>
      )}

      {expanded && (
        <div id={popoverId} role="note">
          <p className="go-concept__definition">{definition.shortDefinition}</p>
          <p className="go-concept__learn-more">
            <LearnMoreLink conceptId={concept.concept} />
          </p>
        </div>
      )}
    </div>
  );
}

interface ConceptListProps {
  primaryConcept: DetectedConcept | null;
  secondaryConcept: DetectedConcept | null;
  expandedConceptId: GoConceptId | null;
  onToggleConcept: (concept: DetectedConcept) => void;
}

type GoConceptId = DetectedConcept['concept'];

export function ConceptList({
  primaryConcept,
  secondaryConcept,
  expandedConceptId,
  onToggleConcept,
}: ConceptListProps) {
  const concepts = [primaryConcept, secondaryConcept].filter(
    (concept): concept is DetectedConcept => concept !== null,
  );

  if (concepts.length === 0) {
    return null;
  }

  return (
    <div className="review-panel__concepts">
      {concepts.map((concept) => (
        <ConceptLabel
          key={concept.concept}
          concept={concept}
          expanded={expandedConceptId === concept.concept}
          onToggle={() => onToggleConcept(concept)}
        />
      ))}
    </div>
  );
}
