import type { Board, BoardSize, IntersectionState, Position, StoneColor } from './types';

export function createEmptyBoard(size: BoardSize): Board {
  const intersections = Array.from({ length: size }, () =>
    Array.from<IntersectionState>({ length: size }).fill(null),
  );
  return { size, intersections };
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function isInBounds(board: Board, pos: Position): boolean {
  return (
    pos.row >= 0 &&
    pos.row < board.size &&
    pos.col >= 0 &&
    pos.col < board.size
  );
}

export function getStone(board: Board, pos: Position): IntersectionState {
  return board.intersections[pos.row][pos.col];
}

/** Return a new board with a stone placed at `pos`. Does not validate legality. */
export function withStone(board: Board, pos: Position, color: StoneColor): Board {
  const intersections = board.intersections.map((row, rowIndex) =>
    rowIndex === pos.row
      ? row.map((cell, colIndex) => (colIndex === pos.col ? color : cell))
      : row,
  );
  return { size: board.size, intersections };
}

/** Return a new board with the intersection at `pos` cleared. */
export function withoutStone(board: Board, pos: Position): Board {
  const intersections = board.intersections.map((row, rowIndex) =>
    rowIndex === pos.row
      ? row.map((cell, colIndex) => (colIndex === pos.col ? null : cell))
      : row,
  );
  return { size: board.size, intersections };
}

/** Orthogonal neighbors within board bounds. */
export function getNeighbors(board: Board, pos: Position): Position[] {
  const deltas = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  return deltas
    .map((delta) => ({ row: pos.row + delta.row, col: pos.col + delta.col }))
    .filter((neighbor) => isInBounds(board, neighbor));
}

/** Deep-copy a board (used for ko comparison and undo snapshots). */
export function cloneBoard(board: Board): Board {
  return {
    size: board.size,
    intersections: board.intersections.map((row) => [...row]),
  };
}

/** Serialize board stone layout for ko repetition checks. */
export function boardHash(board: Board): string {
  return board.intersections
    .map((row) => row.map((cell) => cell ?? '.').join(''))
    .join('|');
}
