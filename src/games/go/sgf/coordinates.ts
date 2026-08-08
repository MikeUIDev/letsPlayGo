import type { BoardSize, Position } from '../engine/types';

/** Convert board position to lowercase SGF coordinates (e.g. dd). */
export function positionToSgf({ row, col }: Position): string {
  return `${String.fromCharCode(97 + col)}${String.fromCharCode(97 + row)}`;
}

/** Convert lowercase SGF coordinates to a board position. */
export function sgfToPosition(coordinate: string, size: BoardSize): Position | null {
  if (coordinate.length !== 2) return null;

  const col = coordinate.charCodeAt(0) - 97;
  const row = coordinate.charCodeAt(1) - 97;

  if (col < 0 || row < 0 || col >= size || row >= size) {
    return null;
  }

  return { row, col };
}
