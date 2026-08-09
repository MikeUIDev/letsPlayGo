import { getNeighbors, getStone, isInBounds, positionKey } from '../../engine/board';
import { getGroup } from '../../engine/groups';
import { getCaptureCountForPlayer } from '../../coach/libertyAnalysis';
import type { Board, Position, StoneColor } from '../../engine/types';
import type { StoneGroup } from '../../engine/groups';
import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';
import {
  applyOffset,
  isDiagonalOffset,
  isOrthogonalOffset,
  reflectOffsetHorizontal,
  rotateOffset90,
  type RelativeOffset,
} from '../patternUtils';

type LocalPattern = {
  friendly: RelativeOffset;
  opponent: RelativeOffset;
};

const HANE_PATTERN: LocalPattern = {
  friendly: { dr: 0, dc: -1 },
  opponent: { dr: -1, dc: -1 },
};

function patternOrientations(base: LocalPattern): LocalPattern[] {
  const seen = new Set<string>();
  const patterns: LocalPattern[] = [];
  let current = base;

  for (let rotation = 0; rotation < 4; rotation += 1) {
    for (const oriented of [current, { friendly: reflectOffsetHorizontal(current.friendly), opponent: reflectOffsetHorizontal(current.opponent) }]) {
      const key = `${oriented.friendly.dr},${oriented.friendly.dc}|${oriented.opponent.dr},${oriented.opponent.dc}`;
      if (!seen.has(key)) {
        seen.add(key);
        patterns.push(oriented);
      }
    }

    current = {
      friendly: rotateOffset90(current.friendly),
      opponent: rotateOffset90(current.opponent),
    };
  }

  return patterns;
}

function getAdjacentFriendlyGroups(
  board: Board,
  position: Position,
  color: StoneColor,
): StoneGroup[] {
  const groups: StoneGroup[] = [];
  const seen = new Set<string>();

  for (const neighbor of getNeighbors(board, position)) {
    if (getStone(board, neighbor) !== color) {
      continue;
    }

    const group = getGroup(board, neighbor);
    if (!group) {
      continue;
    }

    const key = positionKey(group.stones[0]);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    groups.push(group);
  }

  return groups;
}

function isOrthogonallyAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function detectHaneConcept(context: MoveConceptContext): DetectedConcept | null {
  const { afterBoard, beforeBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  if (getCaptureCountForPlayer(playedMove, player) > 0) {
    return null;
  }

  const played = playedMove.position;
  const opponent = player === 'black' ? 'white' : 'black';

  if (getAdjacentFriendlyGroups(beforeBoard, played, player).length >= 2) {
    return null;
  }

  for (const pattern of patternOrientations(HANE_PATTERN)) {
    if (!isOrthogonalOffset(pattern.friendly) || !isDiagonalOffset(pattern.opponent)) {
      continue;
    }

    const friendlyPos = applyOffset(played, pattern.friendly);
    const opponentPos = applyOffset(played, pattern.opponent);

    if (!isInBounds(afterBoard, friendlyPos) || !isInBounds(afterBoard, opponentPos)) {
      continue;
    }

    if (getStone(afterBoard, played) !== player) {
      continue;
    }

    if (getStone(afterBoard, friendlyPos) !== player) {
      continue;
    }

    if (getStone(afterBoard, opponentPos) !== opponent) {
      continue;
    }

    if (isOrthogonallyAdjacent(played, opponentPos)) {
      continue;
    }

    if (!isOrthogonallyAdjacent(friendlyPos, opponentPos)) {
      continue;
    }

    return {
      concept: 'hane',
      relatedPositions: [played, friendlyPos, opponentPos],
      metadata: { opponentColor: opponent },
      teachingLine: `This move bends around the ${opponent === 'white' ? 'White' : 'Black'} stone in a hane.`,
    };
  }

  return null;
}

export function getHanePatternOrientations(): LocalPattern[] {
  return patternOrientations(HANE_PATTERN);
}
