import { getCaptureCountForPlayer } from '../../coach/libertyAnalysis';
import {
  buildNetRelatedPositions,
  buildNetTeachingLine,
  findNetTargetsAfterMove,
  readNet,
} from '../../tactics/net';
import { createSimulationState } from '../../tactics/simulate';
import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';

export function detectNetConcept(context: MoveConceptContext): DetectedConcept | null {
  const { beforeBoard, afterBoard, afterState, playedMove, player } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  if (getCaptureCountForPlayer(playedMove, player) > 0) {
    return null;
  }

  const targets = findNetTargetsAfterMove(
    beforeBoard,
    afterBoard,
    playedMove.position,
    player,
  );

  for (const target of targets) {
    const startState = createSimulationState(
      afterBoard,
      afterState.currentPlayer,
      afterState.config,
    );

    const read = readNet(startState, target.stones[0], player);
    if (read.outcome !== 'success') {
      continue;
    }

    return {
      concept: 'net',
      relatedPositions: buildNetRelatedPositions(target, playedMove.position, read.blockedEscapes),
      tacticalSequence: [
        { color: player, position: playedMove.position },
        ...read.sequence.slice(0, 3),
      ],
      metadata: {
        opponentColor: target.color,
        searchDepth: read.searchDepth,
      },
      teachingLine: buildNetTeachingLine(player),
    };
  }

  return null;
}
