import { getNeighbors, getStone, positionKey, positionsEqual } from '../engine/board';
import { getCapturedStones } from '../engine/captures';
import { getGroup, getGroupAfterPlacement } from '../engine/groups';
import { countLiberties, getLibertyPositions } from '../engine/liberties';
import type { Board, GameState, Move, Position, StoneColor } from '../engine/types';
import type { StoneGroup } from '../engine/groups';

export function isAtari(board: Board, group: StoneGroup): boolean {
  return countLiberties(board, group) === 1;
}

export function getPlayerGroups(board: Board, player: StoneColor): StoneGroup[] {
  const seen = new Set<string>();
  const groups: StoneGroup[] = [];

  for (let row = 0; row < board.size; row += 1) {
    for (let col = 0; col < board.size; col += 1) {
      const position = { row, col };
      const key = positionKey(position);
      if (seen.has(key) || getStone(board, position) !== player) {
        continue;
      }

      const group = getGroup(board, position);
      if (!group) {
        continue;
      }

      for (const stone of group.stones) {
        seen.add(positionKey(stone));
      }
      groups.push(group);
    }
  }

  return groups;
}

export function getGroupsInAtari(board: Board, player: StoneColor): StoneGroup[] {
  return getPlayerGroups(board, player).filter((group) => isAtari(board, group));
}

export function groupTouchesPosition(group: StoneGroup, position: Position): boolean {
  return group.stones.some((stone) => positionsEqual(stone, position));
}

export function groupIsAdjacentToPosition(board: Board, group: StoneGroup, position: Position): boolean {
  for (const stone of group.stones) {
    for (const neighbor of getNeighbors(board, stone)) {
      if (positionsEqual(neighbor, position)) {
        return true;
      }
    }
  }

  return false;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function groupIsNearPosition(group: StoneGroup, position: Position, maxDistance = 2): boolean {
  return group.stones.some((stone) => manhattanDistance(stone, position) <= maxDistance);
}

/** Groups of `player` near the played move. */
export function getNearbyPlayerGroups(
  board: Board,
  player: StoneColor,
  position: Position,
): StoneGroup[] {
  return getPlayerGroups(board, player).filter(
    (group) =>
      groupTouchesPosition(group, position) ||
      groupIsAdjacentToPosition(board, group, position) ||
      groupIsNearPosition(group, position),
  );
}

export function getOpponentGroupsInAtari(
  board: Board,
  player: StoneColor,
): Array<{ group: StoneGroup; capturePoint: Position }> {
  const opponent = player === 'black' ? 'white' : 'black';
  const results: Array<{ group: StoneGroup; capturePoint: Position }> = [];

  for (const group of getPlayerGroups(board, opponent)) {
    if (!isAtari(board, group)) {
      continue;
    }

    const liberties = getLibertyPositions(board, group);
    if (liberties.length === 1) {
      results.push({ group, capturePoint: liberties[0] });
    }
  }

  return results;
}

export function moveCapturesOpponentGroup(
  _board: Board,
  move: Move,
  capturePoint: Position,
): boolean {
  if (move.type !== 'play') {
    return false;
  }

  return positionsEqual(move.position, capturePoint);
}

export function getCaptureCountForPlayer(move: Move, player: StoneColor): number {
  if (move.type !== 'play' || move.color !== player) {
    return 0;
  }

  return move.captured?.length ?? 0;
}

export function getOwnGroupAfterPlay(
  board: Board,
  move: Move,
): StoneGroup | null {
  if (move.type !== 'play') {
    return null;
  }

  return getGroupAfterPlacement(board, move.position, move.color);
}

export function moveIncreasesGroupLiberties(
  beforeBoard: Board,
  afterBoard: Board,
  groupBefore: StoneGroup,
  playedPosition: Position,
): boolean {
  const anchor = groupBefore.stones[0];
  const beforeGroup = getGroup(beforeBoard, anchor);
  const afterGroup = getGroup(afterBoard, anchor);

  if (!beforeGroup || !afterGroup) {
    return positionsEqual(playedPosition, getLibertyPositions(beforeBoard, groupBefore)[0] ?? playedPosition);
  }

  return countLiberties(afterBoard, afterGroup) > countLiberties(beforeBoard, beforeGroup);
}

export function getAvailableCaptures(
  board: Board,
  player: StoneColor,
): Array<{ group: StoneGroup; capturePoint: Position; capturedCount: number }> {
  return getOpponentGroupsInAtari(board, player).map(({ group, capturePoint }) => ({
    group,
    capturePoint,
    capturedCount: group.stones.length,
  }));
}

export function wouldCaptureAt(
  board: Board,
  position: Position,
  player: StoneColor,
): Position[] {
  return getCapturedStones(board, position, player);
}

/** Opponent captures of `player` stones on the next move. */
export function getStonesCapturedFromPlayer(
  boardBeforeOpponentMove: Board,
  nextMove: Move,
  player: StoneColor,
): number {
  if (nextMove.type !== 'play' || nextMove.color === player) {
    return 0;
  }

  let count = 0;
  for (const captured of nextMove.captured ?? []) {
    if (getStone(boardBeforeOpponentMove, captured) === player) {
      count += 1;
    }
  }

  return count;
}

export function getBoardFromState(state: GameState): Board {
  return state.board;
}
