import type { Move, Position } from '../../engine/types';
import type { CoachInsight } from '../types';
import {
  getNearbyPlayerGroups,
  isAtari,
} from '../libertyAnalysis';
import type { Board } from '../../engine/types';
import { getLibertyPositions } from '../../engine/liberties';

export function detectLeftGroupInAtari(options: {
  afterBoard: Board;
  playedMove: Move;
}): CoachInsight | null {
  const { afterBoard, playedMove } = options;

  if (playedMove.type !== 'play') {
    return null;
  }

  const nearbyGroups = getNearbyPlayerGroups(afterBoard, playedMove.color, playedMove.position);
  const atariGroups = nearbyGroups.filter((group) => isAtari(afterBoard, group));

  if (atariGroups.length === 0) {
    return null;
  }

  const group = atariGroups[0];
  const relatedPositions: Position[] = group.stones.slice(0, 3);

  const liberty = getLibertyPositions(afterBoard, group)[0];

  return {
    type: 'left_group_in_atari',
    severity: 'warning',
    title: 'A group needed attention',
    explanation: 'This group had only one liberty remaining after the move.',
    relatedPositions: liberty ? [...relatedPositions, liberty] : relatedPositions,
    concept: 'atari',
  };
}
