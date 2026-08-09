import type { Move, StoneColor } from '../../engine/types';
import type { CoachInsight } from '../types';
import { getStonesCapturedFromPlayer } from '../libertyAnalysis';
import type { Board } from '../../engine/types';

export function detectAllowedCapture(options: {
  afterBoard: Board;
  nextMove: Move | null;
  player: StoneColor;
}): CoachInsight | null {
  const { afterBoard, nextMove, player } = options;

  if (!nextMove || nextMove.type !== 'play') {
    return null;
  }

  const capturedCount = getStonesCapturedFromPlayer(afterBoard, nextMove, player);
  if (capturedCount <= 0) {
    return null;
  }

  const captor = nextMove.color === 'black' ? 'Black' : 'White';
  const playerLabel = player === 'black' ? 'black' : 'white';
  const stoneWord = capturedCount === 1 ? 'stone' : 'stones';

  return {
    type: 'allowed_capture',
    severity: capturedCount >= 3 ? 'critical' : 'warning',
    title: 'Stones were captured',
    explanation: `${captor} captured ${capturedCount} ${playerLabel} ${stoneWord} on the next move.`,
  };
}
