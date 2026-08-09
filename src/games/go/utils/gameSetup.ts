import { configToSetup } from '../engine/gameConfig';
import { DEFAULT_AI_DIFFICULTY } from '../engine/aiDifficulty';
import type { BoardSize, GameConfig, NewGameSetup, NewGameSetupAI, NewGameSetupLocal } from '../engine/types';
import { DEFAULT_KOMI } from '../engine/types';
import { defaultKomi } from '../engine/scoring';

export function getDefaultKomi(size: BoardSize): number {
  return defaultKomi(size);
}

export const AI_SUPPORTED_BOARD_SIZES = [9] as const;
export type AiSupportedBoardSize = (typeof AI_SUPPORTED_BOARD_SIZES)[number];

export function isAiSupportedBoardSize(size: number): size is AiSupportedBoardSize {
  return (AI_SUPPORTED_BOARD_SIZES as readonly number[]).includes(size);
}

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

export function setupFromConfig(config: GameConfig): NewGameSetup {
  return configToSetup(config);
}

export function formatKomiInput(komi: number): string {
  return Number.isInteger(komi) ? String(komi) : komi.toFixed(1);
}

/** True when komi differs from the default for the given board size. */
export function isKomiCustomizedForBoardSize(komi: number, size: BoardSize): boolean {
  return komi !== getDefaultKomi(size);
}

/** Komi to use after a board-size change, respecting manual customization. */
export function resolveKomiForBoardSizeChange(
  currentKomi: number,
  newSize: BoardSize,
  isKomiCustomized: boolean,
): number {
  return isKomiCustomized ? currentKomi : getDefaultKomi(newSize);
}

export const DEFAULT_KOMI_DISPLAY = formatKomiInput(DEFAULT_KOMI);

export function createLocalSetup(
  overrides: Partial<Omit<NewGameSetupLocal, 'mode'>> = {},
): NewGameSetupLocal {
  const size = overrides.size ?? 9;
  return {
    mode: 'local',
    size,
    komi: overrides.komi ?? getDefaultKomi(size),
    firstPlayer: 'black',
    ...overrides,
  };
}

export function createAiSetup(
  overrides: Partial<Omit<NewGameSetupAI, 'mode'>> = {},
): NewGameSetupAI {
  const size = overrides.size ?? 9;
  return {
    mode: 'ai',
    size,
    komi: overrides.komi ?? getDefaultKomi(size),
    humanColor: 'black',
    difficulty: DEFAULT_AI_DIFFICULTY,
    ...overrides,
  };
}
