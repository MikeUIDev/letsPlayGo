import type { AnalysisRequest } from './types';
import type { Move } from '../engine/types';

type ApiMovePayload =
  | { color: 'black' | 'white'; type: 'pass' }
  | { color: 'black' | 'white'; x: number; y: number };

export type ApiAnalyzeRequestPayload = {
  boardSize: number;
  komi: number;
  colorToMove: 'black' | 'white';
  moves: ApiMovePayload[];
};

export function serializeAnalyzeRequest(request: AnalysisRequest): ApiAnalyzeRequestPayload {
  return {
    boardSize: request.boardSize,
    komi: request.komi,
    colorToMove: request.colorToMove,
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
