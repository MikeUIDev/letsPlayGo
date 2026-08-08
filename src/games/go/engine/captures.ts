import { positionsEqual, withStone, withoutStone } from './board';
import { getAdjacentOpponentGroups, getGroup } from './groups';
import { countLiberties, getLibertyPositions } from './liberties';
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
    const liberties = getLibertyPositions(board, group);
    const remainingLiberties = liberties.filter(
      (liberty) => !positionsEqual(liberty, pos),
    );

    if (remainingLiberties.length === 0) {
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

  let nextBoard = board;
  for (const capturedPos of captured) {
    nextBoard = withoutStone(nextBoard, capturedPos);
  }
  nextBoard = withStone(nextBoard, pos, color);

  const ownGroup = getGroup(nextBoard, pos);
  if (!ownGroup) return true;

  return countLiberties(nextBoard, ownGroup) === 0;
}
