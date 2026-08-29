import type { BoardSize } from './types';

/** All playable board dimensions — single source of truth. */
export const BOARD_SIZES: readonly BoardSize[] = [9, 13, 19];

export function isBoardSize(value: number): value is BoardSize {
  return (BOARD_SIZES as readonly number[]).includes(value);
}

/** Default komi by board size (Chinese area scoring). */
export const DEFAULT_KOMI_BY_SIZE: Record<BoardSize, number> = {
  9: 6.5,
  13: 6.5,
  19: 7.5,
};

export function getDefaultKomiForSize(size: BoardSize): number {
  return DEFAULT_KOMI_BY_SIZE[size];
}

export const BOARD_SIZE_OPTIONS: ReadonlyArray<{
  size: BoardSize;
  label: string;
  descriptor: string;
}> = [
  { size: 9, label: '9×9', descriptor: 'Quick' },
  { size: 13, label: '13×13', descriptor: 'Medium' },
  { size: 19, label: '19×19', descriptor: 'Standard' },
];

/** Board sizes supported by the remote KataGo HTTP API (matches server validation). */
export const AI_SUPPORTED_BOARD_SIZES: readonly BoardSize[] = [9, 13, 19];

export function isAiSupportedBoardSize(size: number): size is BoardSize {
  return (AI_SUPPORTED_BOARD_SIZES as readonly number[]).includes(size);
}

export function formatBoardSizeLabel(size: BoardSize): string {
  return `${size}×${size}`;
}
