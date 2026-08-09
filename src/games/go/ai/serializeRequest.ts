import type { GenerateMoveRequest } from './types';
import type { Move } from '../engine/types';

type ApiMovePayload =
  | { color: 'black' | 'white'; type: 'pass' }
  | { color: 'black' | 'white'; x: number; y: number };

export type ApiMoveRequestPayload = {
  boardSize: number;
  komi: number;
  colorToMove: 'black' | 'white';
  difficulty: GenerateMoveRequest['difficulty'];
  moves: ApiMovePayload[];
};

export function serializeMoveRequest(request: GenerateMoveRequest): ApiMoveRequestPayload {
  return {
    boardSize: request.boardSize,
    komi: request.komi,
    colorToMove: request.colorToMove,
    difficulty: request.difficulty,
    moves: request.moves.flatMap(serializeMove),
  };
}

function serializeMove(move: Move): ApiMovePayload[] {
  if (move.type === 'pass') {
    return [{ color: move.color, type: 'pass' }];
  }

  if (move.type === 'resign') {
    return [];
  }

  return [{ color: move.color, x: move.position.col, y: move.position.row }];
}
