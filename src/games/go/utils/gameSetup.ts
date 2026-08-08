import type { NewGameSetup } from '../engine/types';
import { DEFAULT_KOMI } from '../engine/types';

export const BOARD_SIZE_OPTIONS = [
  { size: 9 as const, label: '9×9', descriptor: 'Quick' },
  { size: 13 as const, label: '13×13', descriptor: 'Medium' },
  { size: 19 as const, label: '19×19', descriptor: 'Standard' },
];

/** Parse komi from a form input string. Returns null when invalid. */
export function parseKomiInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed * 10) / 10;
}

export function isValidKomi(komi: number | null): komi is number {
  return komi !== null && Number.isFinite(komi) && komi >= 0;
}

export function setupFromConfig(config: {
  size: NewGameSetup['size'];
  komi: number;
  firstPlayer?: NewGameSetup['firstPlayer'];
}): NewGameSetup {
  return {
    size: config.size,
    komi: config.komi,
    firstPlayer: config.firstPlayer ?? 'black',
  };
}

export function formatKomiInput(komi: number): string {
  return Number.isInteger(komi) ? String(komi) : komi.toFixed(1);
}

export const DEFAULT_KOMI_DISPLAY = formatKomiInput(DEFAULT_KOMI);
