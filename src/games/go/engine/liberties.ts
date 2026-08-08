import { getNeighbors, getStone } from './board';
import type { Board, Position } from './types';
import type { StoneGroup } from './groups';

/** Count unique empty intersections adjacent to any stone in the group. */
export function countLiberties(board: Board, group: StoneGroup): number {
  return getLibertyPositions(board, group).length;
}

/** Empty intersections that are liberties of the group. */
export function getLibertyPositions(board: Board, group: StoneGroup): Position[] {
  const liberties = new Map<string, Position>();

  for (const stone of group.stones) {
    for (const neighbor of getNeighbors(board, stone)) {
      if (getStone(board, neighbor) === null) {
        liberties.set(`${neighbor.row},${neighbor.col}`, neighbor);
      }
    }
  }

  return [...liberties.values()];
}

/** True when the group has zero liberties. */
export function isCaptured(board: Board, group: StoneGroup): boolean {
  return countLiberties(board, group) === 0;
}
