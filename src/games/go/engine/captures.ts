import { getStone, withoutStone } from './board';
import { getAdjacentOpponentGroups, getGroupAfterPlacement } from './groups';
import type { Board, Position, StoneColor } from './types';

export interface CaptureResult {
  board: Board;
  captured: Position[];
}

function dedupePositions(positions: Position[]): Position[] {
  const seen = new Map<string, Position>();
  for (const pos of positions) {
    seen.set(`${pos.row},${pos.col}`, pos);
  }
  return [...seen.values()];
}

/**
 * Opponent stones that would be removed if `color` plays at `pos`.
 * Simulates the placement without mutating the board.
 */
export function getCapturedStones(
  board: Board,
  pos: Position,
  color: StoneColor,
): Position[] {
  const opponentGroups = getAdjacentOpponentGroups(board, pos, color);
  const captured: Position[] = [];

  for (const group of opponentGroups) {
    let hasLiberty = false;

    for (const stone of group.stones) {
      const neighbors = [
        { row: stone.row - 1, col: stone.col },
        { row: stone.row + 1, col: stone.col },
        { row: stone.row, col: stone.col - 1 },
        { row: stone.row, col: stone.col + 1 },
      ];

      for (const neighbor of neighbors) {
        if (
          neighbor.row < 0 ||
          neighbor.row >= board.size ||
          neighbor.col < 0 ||
          neighbor.col >= board.size
        ) {
          continue;
        }

        if (neighbor.row === pos.row && neighbor.col === pos.col) {
          continue;
        }

        if (getStone(board, neighbor) === null) {
          hasLiberty = true;
          break;
        }
      }

      if (hasLiberty) break;
    }

    if (!hasLiberty) {
      captured.push(...group.stones);
    }
  }

  return dedupePositions(captured);
}

/** Apply captures to the board, returning a new board and captured positions. */
export function applyCaptures(
  board: Board,
  pos: Position,
  color: StoneColor,
): CaptureResult {
  const captured = getCapturedStones(board, pos, color);
  let nextBoard = board;

  for (const capturedPos of captured) {
    nextBoard = withoutStone(nextBoard, capturedPos);
  }

  return { board: nextBoard, captured };
}

/** True when the placed stone's own group would have zero liberties and no captures occur. */
export function isSuicide(
  board: Board,
  pos: Position,
  color: StoneColor,
): boolean {
  const captured = getCapturedStones(board, pos, color);
  if (captured.length > 0) return false;

  const ownGroup = getGroupAfterPlacement(board, pos, color);
  const ownSet = new Set(ownGroup.stones.map((s) => `${s.row},${s.col}`));

  for (const stone of ownGroup.stones) {
    const neighbors = [
      { row: stone.row - 1, col: stone.col },
      { row: stone.row + 1, col: stone.col },
      { row: stone.row, col: stone.col - 1 },
      { row: stone.row, col: stone.col + 1 },
    ];

    for (const neighbor of neighbors) {
      if (
        neighbor.row < 0 ||
        neighbor.row >= board.size ||
        neighbor.col < 0 ||
        neighbor.col >= board.size
      ) {
        continue;
      }

      const key = `${neighbor.row},${neighbor.col}`;
      if (ownSet.has(key)) continue;

      if (getStone(board, neighbor) === null) {
        return false;
      }
    }
  }

  return true;
}
