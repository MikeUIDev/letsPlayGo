import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';
import { getCaptureCountForPlayer } from '../../coach/libertyAnalysis';
import {
  buildLadderTeachingLine,
  createLadderStartState,
  findLadderTargetsAfterMove,
  limitLadderPath,
  readLadder,
} from '../../tactics/ladder';

export function detectLadderConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, afterState, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  if (getCaptureCountForPlayer(playedMove, player) > 0) {
    return null;
  }

  const targets = findLadderTargetsAfterMove(
    beforeBoard,
    afterBoard,
    playedMove.position,
    player,
  );

  for (const target of targets) {
    const startState = createLadderStartState(afterBoard, afterState, player);
    const read = readLadder(startState, target.stones[0], player);

    if (read.outcome !== 'success' || read.sequence.length < 2) {
      continue;
    }

    const path = limitLadderPath(read.path);
    const relatedPositions = [
      playedMove.position,
      ...target.stones.slice(0, 3),
      ...path,
    ];

    const seen = new Set<string>();
    const uniqueRelated = relatedPositions.filter((position) => {
      const key = `${position.row},${position.col}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    return {
      concept: 'ladder',
      relatedPositions: uniqueRelated,
      tacticalSequence: [
        { color: player, position: playedMove.position },
        ...read.sequence.slice(0, 4),
      ],
      metadata: {
        opponentColor: target.color,
        searchDepth: read.searchDepth,
      },
      teachingLine: buildLadderTeachingLine(player, true, true),
    };
  }

  return null;
}
