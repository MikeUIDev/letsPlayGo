import type { BoardSize, StoneColor } from '../engine/types';
import type { GoConcept } from '../concepts/types';

/** Compact sizes for static Learn diagrams; full game sizes are also supported. */
export type DiagramSize = 5 | 7 | BoardSize;

export type DiagramStone = {
  row: number;
  col: number;
  color: StoneColor;
};

export type DiagramHighlight = {
  row: number;
  col: number;
};

export type DiagramPosition = {
  size: DiagramSize;
  stones: DiagramStone[];
  highlights?: DiagramHighlight[];
  caption?: string;
  ariaLabel?: string;
};

export type SequenceStep = DiagramPosition & {
  title?: string;
};

export type LearnNavItem = {
  id: string;
  label: string;
  children?: LearnNavItem[];
};

export type LearnCard = {
  id: string;
  title: string;
  description: string;
  sectionId: string;
};

export type GlossaryEntry = {
  term: string;
  slug: string;
  definition: string;
  conceptId?: GoConcept;
  /** Learn section id when the term is not a GO_CONCEPTS entry. */
  learnAnchor?: string;
};

export type ConceptLearnMeta = {
  conceptId: GoConcept;
  extra?: string;
};
