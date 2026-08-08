import { getMoveList } from '../engine/gameState';
import type { GameState } from '../engine/types';
import { positionToSgf } from './coordinates';
import { gameResultToSgfRe, type ExportedSgfResult } from './types';

function formatSgfFilename(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `lets-play-go-${year}-${month}-${day}.sgf`;
}

/** Export a game record as FF[4] SGF text. */
export function exportSgf(state: GameState): ExportedSgfResult {
  const { config } = state;
  const moves = getMoveList(state);
  const parts: string[] = [
    `(;GM[1]FF[4]SZ[${config.size}]KM[${config.komi}]`,
  ];

  for (const move of moves) {
    if (move.type === 'play') {
      parts.push(`;${move.color === 'black' ? 'B' : 'W'}[${positionToSgf(move.position)}]`);
    } else if (move.type === 'pass') {
      parts.push(`;${move.color === 'black' ? 'B' : 'W'}[]`);
    } else if (move.type === 'resign') {
      // Resignation is represented via RE, not as a move node in V1 export.
      break;
    }
  }

  if (state.phase === 'ended' && state.result) {
    const re = gameResultToSgfRe(state.result);
    if (re) {
      parts.push(`RE[${re}]`);
    }
  }

  parts.push(')');

  return {
    content: parts.join('\n'),
    filename: formatSgfFilename(),
  };
}
