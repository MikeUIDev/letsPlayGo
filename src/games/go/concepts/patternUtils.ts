import { isInBounds } from '../engine/board';
import type { Board, Position } from '../engine/types';

export type RelativeOffset = {
  dr: number;
  dc: number;
};

export function applyOffset(origin: Position, offset: RelativeOffset): Position {
  return { row: origin.row + offset.dr, col: origin.col + offset.dc };
}

export function rotateOffset90(offset: RelativeOffset): RelativeOffset {
  return { dr: offset.dc, dc: -offset.dr };
}

export function reflectOffsetHorizontal(offset: RelativeOffset): RelativeOffset {
  return { dr: offset.dr, dc: -offset.dc };
}

export function offsetKey(offset: RelativeOffset): string {
  return `${offset.dr},${offset.dc}`;
}

/** All four rotations of an offset (deduplicated). */
export function rotationOffsets(base: RelativeOffset): RelativeOffset[] {
  const seen = new Set<string>();
  const offsets: RelativeOffset[] = [];
  let current = base;

  for (let rotation = 0; rotation < 4; rotation += 1) {
    const key = offsetKey(current);
    if (!seen.has(key)) {
      seen.add(key);
      offsets.push(current);
    }
    current = rotateOffset90(current);
  }

  return offsets;
}

/** Eight orientations via rotation and horizontal reflection. */
export function symmetryOffsets(base: RelativeOffset): RelativeOffset[] {
  const seen = new Set<string>();
  const offsets: RelativeOffset[] = [];

  for (const rotated of rotationOffsets(base)) {
    for (const candidate of [rotated, reflectOffsetHorizontal(rotated)]) {
      const key = offsetKey(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        offsets.push(candidate);
      }
    }
  }

  return offsets;
}

export function isOrthogonalOffset(offset: RelativeOffset): boolean {
  return (Math.abs(offset.dr) === 1 && offset.dc === 0) ||
    (Math.abs(offset.dc) === 1 && offset.dr === 0);
}

export function isDiagonalOffset(offset: RelativeOffset): boolean {
  return Math.abs(offset.dr) === 1 && Math.abs(offset.dc) === 1;
}

export function isInteriorPoint(board: Board, position: Position): boolean {
  return (
    position.row > 0 &&
    position.row < board.size - 1 &&
    position.col > 0 &&
    position.col < board.size - 1
  );
}

export const ORTHOGONAL_OFFSETS: RelativeOffset[] = [
  { dr: -1, dc: 0 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
];

export function orthogonalNeighbors(board: Board, position: Position): Position[] {
  return ORTHOGONAL_OFFSETS.map((offset) => applyOffset(position, offset)).filter((neighbor) =>
    isInBounds(board, neighbor),
  );
}
