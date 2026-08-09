export type AIDifficulty = 'beginner' | 'casual' | 'strong' | 'expert';

export const DEFAULT_AI_DIFFICULTY: AIDifficulty = 'casual';

export const AI_DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: AIDifficulty;
  label: string;
  description: string;
}> = [
  { value: 'beginner', label: 'Beginner', description: 'Learning the basics' },
  { value: 'casual', label: 'Casual', description: 'Relaxed game' },
  { value: 'strong', label: 'Strong', description: 'Challenging play' },
  { value: 'expert', label: 'Expert', description: 'Maximum strength' },
];

export function isAIDifficulty(value: unknown): value is AIDifficulty {
  return value === 'beginner' || value === 'casual' || value === 'strong' || value === 'expert';
}

export function normalizeAiDifficulty(value: unknown): AIDifficulty {
  return isAIDifficulty(value) ? value : DEFAULT_AI_DIFFICULTY;
}

export function formatAiDifficultyLabel(difficulty: AIDifficulty): string {
  const option = AI_DIFFICULTY_OPTIONS.find((entry) => entry.value === difficulty);
  return option?.label ?? 'Casual';
}

export function formatAiPlayerSubtitle(difficulty: AIDifficulty): string {
  return `AI · ${formatAiDifficultyLabel(difficulty)}`;
}

export function shouldShowAiDifficultySelector(mode: 'local' | 'ai'): boolean {
  return mode === 'ai';
}
