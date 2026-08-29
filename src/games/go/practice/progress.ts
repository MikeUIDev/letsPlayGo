import type { PracticeProgress, PuzzleCategory, PuzzleDifficulty } from './types';
import { readLocalStorageItem, writeLocalStorageItem } from '../persistence/localStorageAccess';

const STORAGE_KEY = 'letsplaygo.practice.progress';

export const DEFAULT_PRACTICE_PROGRESS: PracticeProgress = {
  solvedPuzzleIds: [],
  attempts: {},
  lastCategory: null,
  lastDifficulty: null,
};

export function loadPracticeProgress(): PracticeProgress {
  const raw = readLocalStorageItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_PRACTICE_PROGRESS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PracticeProgress>;
    return {
      solvedPuzzleIds: Array.isArray(parsed.solvedPuzzleIds)
        ? parsed.solvedPuzzleIds.filter((id): id is string => typeof id === 'string')
        : [],
      attempts:
        parsed.attempts && typeof parsed.attempts === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.attempts).filter(
                (entry): entry is [string, number] => typeof entry[1] === 'number',
              ),
            )
          : {},
      lastCategory: parsed.lastCategory ?? null,
      lastDifficulty: parsed.lastDifficulty ?? null,
    };
  } catch {
    return { ...DEFAULT_PRACTICE_PROGRESS };
  }
}

export function savePracticeProgress(progress: PracticeProgress): void {
  writeLocalStorageItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markPuzzleSolved(progress: PracticeProgress, puzzleId: string): PracticeProgress {
  const solvedPuzzleIds = progress.solvedPuzzleIds.includes(puzzleId)
    ? progress.solvedPuzzleIds
    : [...progress.solvedPuzzleIds, puzzleId];

  return { ...progress, solvedPuzzleIds };
}

export function incrementPuzzleAttempt(progress: PracticeProgress, puzzleId: string): PracticeProgress {
  return {
    ...progress,
    attempts: {
      ...progress.attempts,
      [puzzleId]: (progress.attempts[puzzleId] ?? 0) + 1,
    },
  };
}

export function updatePracticeBrowse(
  progress: PracticeProgress,
  category: PuzzleCategory | null,
  difficulty: PuzzleDifficulty | null,
): PracticeProgress {
  return {
    ...progress,
    lastCategory: category,
    lastDifficulty: difficulty,
  };
}

export function resetPracticeProgress(): PracticeProgress {
  savePracticeProgress(DEFAULT_PRACTICE_PROGRESS);
  return { ...DEFAULT_PRACTICE_PROGRESS };
}
