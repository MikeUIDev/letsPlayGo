import {
  getNeighbors,
  getStone,
  isInBounds,
  positionKey,
  positionsEqual,
} from './board';
import type { Board, Position, StoneColor } from './types';

export interface StoneGroup {
  color: StoneColor;
  stones: Position[];
}

/**
 * Flood-fill from `start` to collect all connected same-color stones.
 * Returns null if start is empty or out of bounds.
 */
export function getGroup(board: Board, start: Position): StoneGroup | null {
  if (!isInBounds(board, start)) return null;

  const color = getStone(board, start);
  if (color === null) return null;

  const visited = new Set<string>();
  const stones: Position[] = [];
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = positionKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    if (getStone(board, current) !== color) continue;

    stones.push(current);
    for (const neighbor of getNeighbors(board, current)) {
      if (!visited.has(positionKey(neighbor))) {
        stack.push(neighbor);
      }
    }
  }

  return { color, stones };
}

/** All distinct opponent groups adjacent to `pos`. */
export function getAdjacentOpponentGroups(
  board: Board,
  pos: Position,
  color: StoneColor,
): StoneGroup[] {
  const opponent = color === 'black' ? 'white' : 'black';
  const seen = new Set<string>();
  const groups: StoneGroup[] = [];

  for (const neighbor of getNeighbors(board, pos)) {
    if (getStone(board, neighbor) !== opponent) continue;

    const key = positionKey(neighbor);
    if (seen.has(key)) continue;

    const group = getGroup(board, neighbor);
    if (!group) continue;

    for (const stone of group.stones) {
      seen.add(positionKey(stone));
    }
    groups.push(group);
  }

  return groups;
}

/** Group containing `pos` after hypothetically placing `color` there. */
export function getGroupAfterPlacement(
  board: Board,
  pos: Position,
  color: StoneColor,
): StoneGroup {
  const stones: Position[] = [];
  const visited = new Set<string>();
  const stack = [pos];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const key = positionKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    const stone = positionsEqual(current, pos)
      ? color
      : getStone(board, current);

    if (stone !== color) continue;

    stones.push(current);
    for (const neighbor of getNeighbors(board, current)) {
      if (!visited.has(positionKey(neighbor))) {
        stack.push(neighbor);
      }
    }
  }

  return { color, stones };
}
