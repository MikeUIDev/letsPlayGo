import type { BoardSize, Position } from '../engine/types';

const LETTERS_19 = 'ABCDEFGHJKLMNOPQRST';

/** Convert board position to standard Go coordinates (e.g. Q4). */
export function formatCoordinate(position: Position, boardSize: BoardSize): string {
  const col =
    boardSize === 19
      ? LETTERS_19[position.col] ?? '?'
      : String.fromCharCode(65 + position.col);
  const row = boardSize - position.row;
  return `${col}${row}`;
}

export function formatBoardSize(size: BoardSize): string {
  return `${size} × ${size}`;
}
