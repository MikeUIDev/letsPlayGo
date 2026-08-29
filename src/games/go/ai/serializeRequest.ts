import type { ApiMoveRequestBody } from '../api/contracts';
import type { GenerateMoveRequest } from './types';
import type { Move } from '../engine/types';

export function serializeMoveRequest(request: GenerateMoveRequest): ApiMoveRequestBody {
  return {
    boardSize: request.boardSize,
    komi: request.komi,
    colorToMove: request.colorToMove,
    difficulty: request.difficulty,
    moves: request.moves.flatMap(serializeMove),
  };
}

function serializeMove(move: Move): import('../api/contracts').ApiMovePayload[] {
  if (move.type === 'pass') {
    return [{ color: move.color, type: 'pass' }];
  }

  if (move.type === 'resign') {
    return [];
  }

  return [{ color: move.color, x: move.position.col, y: move.position.row }];
}
