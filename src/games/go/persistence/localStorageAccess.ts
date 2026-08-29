/** Read from localStorage without throwing when storage is unavailable. */
export function readLocalStorageItem(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Write to localStorage without throwing when storage is unavailable. */
export function writeLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  } catch {
    // Ignore quota / privacy mode failures.
  }
}
