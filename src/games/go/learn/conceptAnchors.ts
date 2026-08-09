import type { GoConcept } from '../concepts/types';

/** Maps Coach concept ids to Learn page element ids when they differ. */
const LEARN_CONCEPT_ANCHOR_OVERRIDES: Partial<Record<GoConcept, string>> = {
  capture: 'capturing-stones',
};

export function getLearnConceptAnchor(conceptId: GoConcept): string {
  return LEARN_CONCEPT_ANCHOR_OVERRIDES[conceptId] ?? conceptId;
}

export function getLearnConceptUrl(conceptId: GoConcept): string {
  return `/learn#${getLearnConceptAnchor(conceptId)}`;
}
