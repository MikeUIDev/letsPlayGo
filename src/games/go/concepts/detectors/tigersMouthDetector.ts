import { getStone, positionsEqual } from '../../engine/board';
import type { Position } from '../../engine/types';
import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';
import { isInteriorPoint, orthogonalNeighbors } from '../patternUtils';

function countFriendlyNeighbors(
  board: MoveConceptContext['afterBoard'],
  mouth: Position,
  color: MoveConceptContext['player'],
): number {
  return orthogonalNeighbors(board, mouth).filter((neighbor) => getStone(board, neighbor) === color)
    .length;
}

function friendlyNeighbors(
  board: MoveConceptContext['afterBoard'],
  mouth: Position,
  color: MoveConceptContext['player'],
): Position[] {
  return orthogonalNeighbors(board, mouth).filter((neighbor) => getStone(board, neighbor) === color);
}

export function detectTigersMouthConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const played = playedMove.position;

  for (let row = 1; row < afterBoard.size - 1; row += 1) {
    for (let col = 1; col < afterBoard.size - 1; col += 1) {
      const mouth: Position = { row, col };

      if (!isInteriorPoint(afterBoard, mouth)) {
        continue;
      }

      if (getStone(afterBoard, mouth) !== null) {
        continue;
      }

      const afterCount = countFriendlyNeighbors(afterBoard, mouth, player);
      if (afterCount !== 3) {
        continue;
      }

      const beforeCount = countFriendlyNeighbors(beforeBoard, mouth, player);
      if (beforeCount !== 2) {
        continue;
      }

      const stonesAfter = friendlyNeighbors(afterBoard, mouth, player);
      const includesPlayedMove = stonesAfter.some((stone) => positionsEqual(stone, played));
      if (!includesPlayedMove) {
        continue;
      }

      if (getStone(beforeBoard, played) !== null) {
        continue;
      }

      return {
        concept: 'tigers_mouth',
        relatedPositions: [mouth, ...stonesAfter],
        teachingLine: 'This move creates a tiger\'s mouth shape.',
      };
    }
  }

  return null;
}

export function isTigersMouthShape(
  board: MoveConceptContext['afterBoard'],
  mouth: Position,
  color: MoveConceptContext['player'],
): boolean {
  if (!isInteriorPoint(board, mouth) || getStone(board, mouth) !== null) {
    return false;
  }

  return countFriendlyNeighbors(board, mouth, color) === 3;
}
