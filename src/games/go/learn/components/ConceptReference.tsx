import { Link } from 'react-router-dom';
import { getConceptDefinition } from '../../concepts/concepts';
import type { GoConcept } from '../../concepts/types';
import { getLearnConceptUrl } from '../conceptAnchors';
import { GoDiagram } from './GoDiagram';
import { GoSequenceDiagram } from './GoSequenceDiagram';
import type { DiagramPosition, SequenceStep } from '../types';

type ConceptReferenceProps = {
  conceptId: GoConcept;
  extra?: string;
  diagram?: DiagramPosition;
  sequence?: SequenceStep[];
};

export function ConceptReference({ conceptId, extra, diagram, sequence }: ConceptReferenceProps) {
  const definition = getConceptDefinition(conceptId);

  return (
    <article className="learn-concept" id={conceptId}>
      <h3 className="learn-concept__title">{definition.name}</h3>
      <p className="learn-concept__definition">{definition.shortDefinition}</p>
      {definition.description ? (
        <p className="learn-concept__detail">{definition.description}</p>
      ) : null}
      {extra ? <p className="learn-concept__extra">{extra}</p> : null}
      {diagram ? (
        <GoDiagram
          size={diagram.size}
          stones={diagram.stones}
          highlights={diagram.highlights}
          caption={diagram.caption}
          ariaLabel={diagram.ariaLabel}
        />
      ) : null}
      {sequence ? <GoSequenceDiagram steps={sequence} ariaLabel={`${definition.name} sequence`} /> : null}
    </article>
  );
}

export function LearnMoreLink({ conceptId }: { conceptId: GoConcept }) {
  return (
    <Link to={getLearnConceptUrl(conceptId)} className="learn-more-link">
      Learn more
    </Link>
  );
}
