import type { AIDifficulty } from '../engine/aiDifficulty';

/** Wire format for a move in the /api/ai/move request body. */
export type ApiMovePayload =
  | { color: 'black' | 'white'; type: 'pass' }
  | { color: 'black' | 'white'; x: number; y: number };

/** POST /api/ai/move request body (matches server validation). */
export type ApiMoveRequestBody = {
  boardSize: number;
  komi: number;
  colorToMove: 'black' | 'white';
  difficulty: AIDifficulty;
  moves: ApiMovePayload[];
};

/** Successful POST /api/ai/move response body. */
export type ApiMoveResponseBody =
  | {
      move: {
        type: 'play';
        position: {
          x: number;
          y: number;
        };
      };
    }
  | {
      move: {
        type: 'pass';
      };
    };

/** Error payloads returned by the AI HTTP API. */
export type ApiErrorResponseBody = {
  error?: string;
  message?: string;
};

export const AI_MOVE_PATH = '/ai/move';
export const AI_ANALYZE_PATH = '/ai/analyze';
