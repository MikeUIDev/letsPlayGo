import {
  DEFAULT_FEEDBACK_PREFERENCES,
  type FeedbackPreferences,
} from './types';
import { readLocalStorageItem, writeLocalStorageItem } from '../persistence/localStorageAccess';

const STORAGE_KEY = 'letsplaygo.preferences.feedback';

export function loadFeedbackPreferences(): FeedbackPreferences {
  const raw = readLocalStorageItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_FEEDBACK_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FeedbackPreferences>;
    return {
      sound: parsed.sound !== false,
      haptics: parsed.haptics !== false,
    };
  } catch {
    return DEFAULT_FEEDBACK_PREFERENCES;
  }
}

export function saveFeedbackPreferences(preferences: FeedbackPreferences): void {
  writeLocalStorageItem(STORAGE_KEY, JSON.stringify(preferences));
}
