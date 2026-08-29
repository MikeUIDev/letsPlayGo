import { getGridSpan } from '../coordinates/boardGridGeometry';
import type { BoardSize } from '../engine/types';
import type { IntersectionState, Position } from '../engine/types';
import { positionsEqual } from '../engine/board';

/** Minimum ms between stone placements (direct tap and touch confirm). */
export const STONE_PLACEMENT_COOLDOWN_MS = 350;

/** Board sizes that use confirm-on-second-tap touch placement (13×13 and 19×19). */
export const TOUCH_PLACEMENT_MIN_SIZE = 13 as BoardSize;

export type TouchPlacementBoardRect = Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>;

export type TouchPlacementTapAction =
  | { type: 'ignore' }
  | { type: 'select'; position: Position }
  | { type: 'confirm'; position: Position };

/** True when this board uses geometry-based touch placement instead of per-intersection targets. */
export function shouldUseTouchPlacement(boardSize: BoardSize, touchFriendly = true): boolean {
  return touchFriendly && boardSize >= TOUCH_PLACEMENT_MIN_SIZE;
}

/**
 * Map a client point to the nearest intersection within a forgiving radius.
 * Coordinates are relative to the `.go-board__intersections` bounding rect.
 */
export function nearestIntersectionFromClientPoint(
  clientX: number,
  clientY: number,
  rect: TouchPlacementBoardRect,
  boardSize: BoardSize,
  maxRadiusScale = 0.58,
): Position | null {
  const span = getGridSpan(boardSize);
  if (span <= 0 || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;

  if (nx < -0.1 || nx > 1.1 || ny < -0.1 || ny > 1.1) {
    return null;
  }

  let bestRow = 0;
  let bestCol = 0;
  let bestDistSq = Infinity;

  for (let row = 0; row < boardSize; row++) {
    for (let col = 0; col < boardSize; col++) {
      const gx = col / span;
      const gy = row / span;
      const dx = nx - gx;
      const dy = ny - gy;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestRow = row;
        bestCol = col;
      }
    }
  }

  const anchorX = bestCol / span;
  const anchorY = bestRow / span;
  const dxPx = (nx - anchorX) * rect.width;
  const dyPx = (ny - anchorY) * rect.height;
  const distPx = Math.hypot(dxPx, dyPx);
  const cellPx = Math.min(rect.width, rect.height) / span;
  const maxRadiusPx = cellPx * maxRadiusScale;

  if (distPx > maxRadiusPx) {
    return null;
  }

  return { row: bestRow, col: bestCol };
}

/** Two-tap confirm flow: select legal empty points, confirm when tapping the same point again. */
export function resolveTouchPlacementTap(
  pending: Position | null,
  tapped: Position,
  isLegalEmpty: boolean,
  stone: IntersectionState,
): TouchPlacementTapAction {
  if (stone !== null || !isLegalEmpty) {
    return { type: 'ignore' };
  }

  if (!pending) {
    return { type: 'select', position: tapped };
  }

  if (positionsEqual(pending, tapped)) {
    return { type: 'confirm', position: tapped };
  }

  return { type: 'select', position: tapped };
}
