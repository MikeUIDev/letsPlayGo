import type { BoardSize } from '../engine/types';

/** Shared board grid constants — must stay aligned with go.css and GoBoard intersection layout. */
export const BOARD_GRID_STONE_RATIO = 0.93;
export const BOARD_GRID_WOOD_PADDING = 0.0035;

/** Minimum cell size so intersections stay finger-friendly on touch devices. */
export const MIN_TOUCH_CELL_PX = 40;

/** Board sizes that scale to the viewport on touch instead of using a fixed min cell size. */
export const BOARD_PAN_MIN_SIZE: BoardSize = 13;

export type GridSpan = number;

export function getGridSpan(boardSize: BoardSize): GridSpan {
  return boardSize - 1;
}

/** Horizontal intersection anchor within the playable grid (0 = left edge). */
export function intersectionLeftPercent(col: number, boardSize: BoardSize): number {
  const span = getGridSpan(boardSize);
  if (span <= 0) {
    return 0;
  }

  return (col / span) * 100;
}

/** Vertical intersection anchor within the playable grid (0 = top edge). */
export function intersectionTopPercent(row: number, boardSize: BoardSize): number {
  const span = getGridSpan(boardSize);
  if (span <= 0) {
    return 0;
  }

  return (row / span) * 100;
}

/** Minimum inset fraction that keeps edge stones fully visible. */
export function boardInsetMinFraction(stoneRatio: number, gridSpan: GridSpan): number {
  return stoneRatio / (2 * (gridSpan + stoneRatio));
}

/** Total inset fraction including wood padding. */
export function boardInsetFraction(
  boardSize: BoardSize,
  stoneRatio = BOARD_GRID_STONE_RATIO,
  woodPadding = BOARD_GRID_WOOD_PADDING,
): number {
  const gridSpan = getGridSpan(boardSize);
  return boardInsetMinFraction(stoneRatio, gridSpan) + woodPadding;
}

export function intersectionTopWithinBoardPercent(row: number, boardSize: BoardSize): number {
  const inset = boardInsetFraction(boardSize) * 100;
  const gridLength = 100 - inset * 2;
  return inset + (intersectionTopPercent(row, boardSize) / 100) * gridLength;
}

export function intersectionLeftWithinBoardPercent(col: number, boardSize: BoardSize): number {
  const inset = boardInsetFraction(boardSize) * 100;
  const gridLength = 100 - inset * 2;
  return inset + (intersectionLeftPercent(col, boardSize) / 100) * gridLength;
}

/** Anchor within a board-sized container matching `.go-board__intersections` geometry. */
export function intersectionAnchorTop(row: number, boardSize: BoardSize): string {
  return toPercent(intersectionTopWithinBoardPercent(row, boardSize));
}

/** Anchor within a board-sized container matching `.go-board__intersections` geometry. */
export function intersectionAnchorLeft(col: number, boardSize: BoardSize): string {
  return toPercent(intersectionLeftWithinBoardPercent(col, boardSize));
}

export function toPercent(value: number): string {
  return `${value}%`;
}

/** True when the board should scale to the viewport instead of a fixed min cell size (13×13 / 19×19 on touch). */
export function shouldFitBoardInViewport(boardSize: BoardSize, touchFriendly = true): boolean {
  return touchFriendly && boardSize >= BOARD_PAN_MIN_SIZE;
}

/**
 * Minimum pixel width/height of the square wood board so each cell stays
 * at least `minCellPx` (independent of viewport).
 */
export function minPlayableBoardSidePx(
  boardSize: BoardSize,
  minCellPx = MIN_TOUCH_CELL_PX,
): number {
  const span = getGridSpan(boardSize);
  if (span <= 0) {
    return minCellPx;
  }

  const inset = boardInsetFraction(boardSize);
  return (minCellPx * span) / (1 - 2 * inset);
}
