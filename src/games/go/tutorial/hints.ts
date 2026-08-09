import type { TutorialHint } from './types';

export function getHintForAttempt(hints: TutorialHint[], attemptCount: number): TutorialHint | null {
  if (hints.length === 0 || attemptCount <= 0) {
    return null;
  }

  const index = Math.min(attemptCount - 1, hints.length - 1);
  return hints[index] ?? null;
}
