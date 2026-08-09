import { getStone, positionKey } from '../../engine/board';
import { getAdjacentOpponentGroups, getGroup } from '../../engine/groups';
import type { StoneColor } from '../../engine/types';
import { OPPONENT } from '../../engine/types';
import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';

function opponentLabel(player: StoneColor): string {
  return player === 'black' ? 'White' : 'Black';
}

export function detectCutConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const position = playedMove.position;
  if (getStone(beforeBoard, position) !== null) {
    return null;
  }

  const opponent = OPPONENT[player];
  const opponentGroupsBefore = getAdjacentOpponentGroups(beforeBoard, position, player);

  if (opponentGroupsBefore.length < 2) {
    return null;
  }

  const distinctAfter = new Set<string>();
  for (const group of opponentGroupsBefore) {
    const anchor = group.stones[0];
    if (getStone(afterBoard, anchor) !== opponent) {
      continue;
    }

    const afterGroup = getGroup(afterBoard, anchor);
    if (!afterGroup) {
      continue;
    }

    distinctAfter.add(positionKey(afterGroup.stones[0]));
  }

  if (distinctAfter.size < 2) {
    return null;
  }

  const relatedPositions = [
    position,
    ...opponentGroupsBefore.flatMap((group) => group.stones.slice(0, 2)),
  ];

  return {
    concept: 'cut',
    relatedPositions,
    metadata: { groupCount: opponentGroupsBefore.length, opponentColor: opponent },
    teachingLine: `This move cuts between two ${opponentLabel(player)} groups.`,
  };
}
