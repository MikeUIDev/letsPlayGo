import type { TutorialProgress } from './types';
import { readLocalStorageItem, writeLocalStorageItem } from '../persistence/localStorageAccess';

const STORAGE_KEY = 'letsplaygo.tutorial.progress';

export const DEFAULT_TUTORIAL_PROGRESS: TutorialProgress = {
  completedLessonIds: [],
  lastLessonId: null,
  lastStepIndex: 0,
};

export function loadTutorialProgress(): TutorialProgress {
  const raw = readLocalStorageItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_TUTORIAL_PROGRESS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TutorialProgress>;
    return {
      completedLessonIds: Array.isArray(parsed.completedLessonIds)
        ? parsed.completedLessonIds.filter((id): id is string => typeof id === 'string')
        : [],
      lastLessonId: typeof parsed.lastLessonId === 'string' ? parsed.lastLessonId : null,
      lastStepIndex: typeof parsed.lastStepIndex === 'number' ? parsed.lastStepIndex : 0,
    };
  } catch {
    return { ...DEFAULT_TUTORIAL_PROGRESS };
  }
}

export function saveTutorialProgress(progress: TutorialProgress): void {
  writeLocalStorageItem(STORAGE_KEY, JSON.stringify(progress));
}

export function markLessonComplete(progress: TutorialProgress, lessonId: string): TutorialProgress {
  const completedLessonIds = progress.completedLessonIds.includes(lessonId)
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lessonId];

  return {
    ...progress,
    completedLessonIds,
    lastLessonId: lessonId,
    lastStepIndex: 0,
  };
}

export function updateLessonResume(
  progress: TutorialProgress,
  lessonId: string,
  stepIndex: number,
): TutorialProgress {
  return {
    ...progress,
    lastLessonId: lessonId,
    lastStepIndex: stepIndex,
  };
}

export function resetTutorialProgress(): TutorialProgress {
  saveTutorialProgress(DEFAULT_TUTORIAL_PROGRESS);
  return { ...DEFAULT_TUTORIAL_PROGRESS };
}
