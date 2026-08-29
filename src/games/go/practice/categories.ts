import type { GoConcept } from '../concepts/types';
import type { PuzzleCategory } from './types';

export type PracticeCategoryMeta = {
  id: PuzzleCategory;
  label: string;
  concept: GoConcept;
  description: string;
};

export const PRACTICE_CATEGORIES: PracticeCategoryMeta[] = [
  {
    id: 'capture',
    label: 'Capture in 1',
    concept: 'capture',
    description: 'Remove a group by filling its last liberty.',
  },
  {
    id: 'save-group',
    label: 'Save a Group',
    concept: 'missed_defense',
    description: 'Rescue a friendly group from immediate danger.',
  },
  {
    id: 'atari',
    label: 'Atari',
    concept: 'atari',
    description: 'Reduce an enemy group to one liberty.',
  },
  {
    id: 'connect',
    label: 'Connect',
    concept: 'connect',
    description: 'Join separate friendly stones into one group.',
  },
  {
    id: 'cut',
    label: 'Cut',
    concept: 'cut',
    description: 'Separate nearby enemy stones.',
  },
  {
    id: 'ladder',
    label: 'Ladder',
    concept: 'ladder',
    description: 'Start or continue a forcing capture sequence.',
  },
  {
    id: 'net',
    label: 'Net',
    concept: 'net',
    description: 'Trap a group by blocking its escape routes.',
  },
  {
    id: 'snapback',
    label: 'Snapback',
    concept: 'snapback',
    description: 'Sacrifice one stone to capture a larger group.',
  },
  {
    id: 'ko',
    label: 'Ko Timing',
    concept: 'ko',
    description: 'Play correctly around the ko rule.',
  },
];

export function getCategoryMeta(category: PuzzleCategory): PracticeCategoryMeta {
  const meta = PRACTICE_CATEGORIES.find((entry) => entry.id === category);
  if (!meta) {
    throw new Error(`Unknown puzzle category: ${category}`);
  }
  return meta;
}

export function getPracticeCategoryUrl(category: PuzzleCategory): string {
  return `/practice?category=${category}`;
}

export function getPracticeConceptUrl(concept: GoConcept): string {
  const category = PRACTICE_CATEGORIES.find((entry) => entry.concept === concept);
  return category ? getPracticeCategoryUrl(category.id) : '/practice';
}

export const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'] as const;

export function difficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
  }
}
