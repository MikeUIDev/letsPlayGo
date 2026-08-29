import type { CoordinatesPreference } from './defaults';
import { readLocalStorageItem, writeLocalStorageItem } from '../persistence/localStorageAccess';

const STORAGE_KEY = 'letsplaygo.preferences.showCoordinates';

export function loadCoordinatesPreference(): CoordinatesPreference {
  const raw = readLocalStorageItem(STORAGE_KEY);
  if (raw === 'default' || raw === 'on' || raw === 'off') {
    return raw;
  }

  return 'default';
}

export function saveCoordinatesPreference(preference: CoordinatesPreference): void {
  writeLocalStorageItem(STORAGE_KEY, preference);
}
