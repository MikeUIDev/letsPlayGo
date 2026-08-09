import type { CoordinatesPreference } from './defaults';

const STORAGE_KEY = 'letsplaygo.preferences.showCoordinates';

export function loadCoordinatesPreference(): CoordinatesPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'default' || raw === 'on' || raw === 'off') {
      return raw;
    }
  } catch {
    // Ignore storage failures; fall back to contextual defaults.
  }

  return 'default';
}

export function saveCoordinatesPreference(preference: CoordinatesPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Ignore storage failures.
  }
}
