import { BEGINNER_TUNING } from './beginnerConfig.js';

export type AIDifficulty = 'beginner' | 'casual' | 'strong' | 'expert';

export const DEFAULT_AI_DIFFICULTY: AIDifficulty = 'casual';

export type AiDifficultyPreset = {
  maxVisits: number;
};

export const AI_DIFFICULTY_PRESETS: Record<AIDifficulty, AiDifficultyPreset> = {
  beginner: {
    maxVisits: BEGINNER_TUNING.maxVisits,
  },
  casual: {
    maxVisits: 64,
  },
  strong: {
    maxVisits: 256,
  },
  expert: {
    maxVisits: 1000,
  },
};

export function isAIDifficulty(value: unknown): value is AIDifficulty {
  return value === 'beginner' || value === 'casual' || value === 'strong' || value === 'expert';
}

export function getDifficultyPreset(difficulty: AIDifficulty): AiDifficultyPreset {
  return AI_DIFFICULTY_PRESETS[difficulty];
}

export function getMaxVisitsForDifficulty(difficulty: AIDifficulty): number {
  return getDifficultyPreset(difficulty).maxVisits;
}
