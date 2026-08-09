import type { BoardSize, Position } from '../engine/types';

/** Standard Go column letters; I is omitted to avoid confusion with 1. */
export const GO_COLUMNS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
] as const;

const COORDINATE_PATTERN = /^([A-Za-z])(\d+)$/;

/** Convert internal top-indexed position to human Go notation (e.g. A9, D4). */
export function positionToGoCoordinate(position: Position, boardSize: BoardSize): string {
  const letter = columnIndexToLetter(position.col, boardSize);
  if (!letter) {
    return '?';
  }

  const rowNumber = boardSize - position.row;
  return `${letter}${rowNumber}`;
}

/** Parse human Go notation back to an internal top-indexed position. */
export function goCoordinateToPosition(coordinate: string, boardSize: BoardSize): Position | null {
  const trimmed = coordinate.trim();
  if (!trimmed) {
    return null;
  }

  const match = COORDINATE_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const col = columnLetterToIndex(match[1]);
  if (col === null || col >= boardSize) {
    return null;
  }

  const rowNumber = Number(match[2]);
  if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > boardSize) {
    return null;
  }

  return {
    row: boardSize - rowNumber,
    col,
  };
}

export function columnIndexToLetter(col: number, boardSize: BoardSize): string | null {
  if (col < 0 || col >= boardSize || col >= GO_COLUMNS.length) {
    return null;
  }

  return GO_COLUMNS[col] ?? null;
}

export function columnLetterToIndex(letter: string): number | null {
  const normalized = letter.toUpperCase();
  if (normalized === 'I') {
    return null;
  }

  const index = GO_COLUMNS.indexOf(normalized as (typeof GO_COLUMNS)[number]);
  return index >= 0 ? index : null;
}

/** Column labels for the active board size, left to right. */
export function getColumnLabels(boardSize: BoardSize): readonly string[] {
  return GO_COLUMNS.slice(0, boardSize);
}

/** Row labels for the active board size, top to bottom (highest number first). */
export function getRowLabels(boardSize: BoardSize): readonly string[] {
  return Array.from({ length: boardSize }, (_, index) => String(boardSize - index));
}

export function formatBoardSize(size: BoardSize): string {
  return `${size} × ${size}`;
}
