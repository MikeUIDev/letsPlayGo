import { GO_CONCEPTS } from '../concepts/concepts';
import type { GoConcept } from '../concepts/types';
import { getLearnConceptAnchor } from './conceptAnchors';
import { getKomiGlossaryDefinition } from './komiCopy';
import type { GlossaryEntry } from './types';

const CONCEPT_GLOSSARY: GoConcept[] = [
  'atari',
  'capture',
  'connect',
  'cut',
  'extend',
  'hane',
  'ko',
  'ladder',
  'missed_capture',
  'missed_defense',
  'net',
  'self_atari',
  'snapback',
  'tigers_mouth',
];

const EXTRA_GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Dan',
    slug: 'dan',
    definition: 'Advanced amateur or professional rank above kyu. Higher dan numbers indicate stronger players.',
    learnAnchor: 'ranking-system',
  },
  {
    term: 'Eye',
    slug: 'eye',
    definition: 'An empty intersection fully surrounded by friendly stones that helps a group stay alive.',
    learnAnchor: 'two-eyes',
  },
  {
    term: 'False Eye',
    slug: 'false-eye',
    definition: 'A point that looks like an eye but can still be filled or destroyed because it is not truly secure.',
    learnAnchor: 'two-eyes',
  },
  {
    term: 'Gote',
    slug: 'gote',
    definition: 'A move or sequence after which the opponent gains the initiative.',
    learnAnchor: 'sente-gote',
  },
  {
    term: 'Group',
    slug: 'group',
    definition: 'Connected stones of the same color that share liberties.',
    learnAnchor: 'groups',
  },
  {
    term: 'Komi',
    slug: 'komi',
    definition: getKomiGlossaryDefinition(),
    learnAnchor: 'komi',
  },
  {
    term: 'Kyu',
    slug: 'kyu',
    definition: 'Beginner and intermediate rank. Lower kyu numbers indicate stronger players.',
    learnAnchor: 'ranking-system',
  },
  {
    term: 'Liberty',
    slug: 'liberty',
    definition: 'An empty intersection directly adjacent to a stone or connected group.',
    learnAnchor: 'liberties',
  },
  {
    term: 'Pass',
    slug: 'pass',
    definition: 'Skipping a turn instead of placing a stone.',
    learnAnchor: 'passing',
  },
  {
    term: 'Seki',
    slug: 'seki',
    definition: 'A local position where neither side can capture the other without harming themselves.',
  },
  {
    term: 'Sente',
    slug: 'sente',
    definition: 'A move that keeps the initiative, often because the opponent needs to respond.',
    learnAnchor: 'sente-gote',
  },
  {
    term: 'Suicide',
    slug: 'suicide',
    definition: 'An illegal move that would leave your own group with no liberties unless it captures opponent stones.',
    learnAnchor: 'suicide',
  },
  {
    term: 'Territory',
    slug: 'territory',
    definition: 'Empty points surrounded and controlled by one player’s stones.',
    learnAnchor: 'territory',
  },
  {
    term: 'Tesuji',
    slug: 'tesuji',
    definition: 'A skillful local move or sequence that achieves a clear tactical goal.',
  },
];

function conceptEntry(conceptId: GoConcept): GlossaryEntry {
  const definition = GO_CONCEPTS[conceptId];
  return {
    term: definition.name,
    slug: conceptId.replace(/_/g, '-'),
    definition: definition.shortDefinition,
    conceptId,
  };
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  ...CONCEPT_GLOSSARY.map(conceptEntry),
  ...EXTRA_GLOSSARY,
].sort((left, right) => left.term.localeCompare(right.term));

export function filterGlossaryEntries(query: string): GlossaryEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return GLOSSARY_ENTRIES;
  }

  return GLOSSARY_ENTRIES.filter(
    (entry) =>
      entry.term.toLowerCase().includes(normalized) ||
      entry.definition.toLowerCase().includes(normalized),
  );
}

export function getGlossaryAnchor(entry: GlossaryEntry): string {
  if (entry.conceptId) {
    return getLearnConceptAnchor(entry.conceptId);
  }

  return entry.learnAnchor ?? entry.slug;
}
