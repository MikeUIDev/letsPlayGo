import { violatesKo } from '../../engine/ko';
import {
  buildSnapbackRelatedPositions,
  buildSnapbackTeachingLine,
  readHistoricalSnapback,
  readSnapbackOpportunity,
  readSnapbackTrap,
} from '../../tactics/snapback';
import type { DetectedConcept } from '../types';
import type { MoveConceptContext } from '../detectors';

export function detectSnapbackConcept(context: MoveConceptContext): DetectedConcept | null {
  const { afterState, playedMove, player, nextMove } = context;

  if (playedMove.type !== 'play') {
    return null;
  }

  const historyMoves = afterState.history.map((entry) => entry.move);

  const historical = readHistoricalSnapback(historyMoves, playedMove);
  if (historical && historical.outcome === 'success') {
    if (violatesKo(afterState, playedMove.position)) {
      return null;
    }

    return {
      concept: 'snapback',
      relatedPositions: buildSnapbackRelatedPositions(
        historical.recapturePoint,
        playedMove.captured ?? [],
      ),
      tacticalSequence: historical.sequence,
      metadata: {
        opponentColor: player === 'black' ? 'white' : 'black',
        capturedCount: historical.recaptureCount,
        sacrificedCount: historical.sacrificedCount,
      },
      teachingLine: buildSnapbackTeachingLine(
        player,
        historical.recaptureCount,
        historical.sacrificedCount,
        false,
      ),
    };
  }

  const opportunity = readSnapbackOpportunity(afterState, playedMove);
  if (opportunity && opportunity.outcome === 'success') {
    return {
      concept: 'snapback',
      relatedPositions: buildSnapbackRelatedPositions(
        opportunity.sacrificePoint,
        playedMove.captured ?? [],
      ),
      tacticalSequence: opportunity.sequence,
      metadata: {
        opponentColor: player === 'black' ? 'white' : 'black',
        capturedCount: opportunity.recaptureCount,
        sacrificedCount: opportunity.sacrificedCount,
      },
      teachingLine: buildSnapbackTeachingLine(
        player,
        opportunity.recaptureCount,
        opportunity.sacrificedCount,
        false,
      ),
    };
  }

  if (nextMove) {
    const trap = readSnapbackTrap(afterState, playedMove, nextMove);
    if (trap && trap.outcome === 'success') {
      return {
        concept: 'snapback',
        relatedPositions: buildSnapbackRelatedPositions(
          trap.sacrificePoint,
          nextMove.type === 'play' ? nextMove.captured ?? [] : [],
        ),
        tacticalSequence: trap.sequence,
        metadata: {
          opponentColor: player === 'black' ? 'white' : 'black',
          capturedCount: trap.recaptureCount,
          sacrificedCount: trap.sacrificedCount,
        },
        teachingLine: buildSnapbackTeachingLine(
          player,
          trap.recaptureCount,
          trap.sacrificedCount,
          true,
        ),
      };
    }
  }

  return null;
}
