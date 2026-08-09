import { getGroup } from '../../engine/groups';
import type { Move } from '../../engine/types';
import type { CoachInsight } from '../types';
import {
  getCaptureCountForPlayer,
  isAtari,
} from '../libertyAnalysis';
import type { Board } from '../../engine/types';

export function detectSelfAtari(options: {
  afterBoard: Board;
  playedMove: Move;
}): CoachInsight | null {
  const { afterBoard, playedMove } = options;

  if (playedMove.type !== 'play') {
    return null;
  }

  const captureCount = getCaptureCountForPlayer(playedMove, playedMove.color);
  if (captureCount > 0) {
    return null;
  }

  const groupAfter = getGroup(afterBoard, playedMove.position);
  if (!groupAfter || !isAtari(afterBoard, groupAfter)) {
    return null;
  }

  return {
    type: 'self_atari',
    severity: 'warning',
    title: 'Your group was left in atari',
    explanation:
      'This move left the connected group with only one liberty, making it vulnerable to capture.',
    relatedPositions: [playedMove.position],
    concept: 'self_atari',
  };
}
