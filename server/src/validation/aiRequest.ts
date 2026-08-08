import type { AiMoveRequest, ApiMove, StoneColor } from '../katago/types.js';

export const SUPPORTED_AI_BOARD_SIZE = 9 as const;
export const MIN_KOMI = 0;
export const MAX_KOMI = 20;
export const MAX_MOVE_COUNT = 200;

export type ValidationResult =
  | { ok: true; request: AiMoveRequest }
  | { ok: false; error: string };

function isStoneColor(value: unknown): value is StoneColor {
  return value === 'black' || value === 'white';
}

function parseMove(value: unknown, boardSize: number): ApiMove | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const move = value as Record<string, unknown>;
  if (!isStoneColor(move.color)) {
    return null;
  }

  if (move.type === 'pass') {
    return { color: move.color, type: 'pass' };
  }

  if (!Number.isInteger(move.x) || !Number.isInteger(move.y)) {
    return null;
  }

  const x = move.x as number;
  const y = move.y as number;
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) {
    return null;
  }

  return { color: move.color, x, y };
}

export function validateAiMoveRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_body' };
  }

  const payload = body as Record<string, unknown>;

  if (payload.boardSize !== SUPPORTED_AI_BOARD_SIZE) {
    return { ok: false, error: 'unsupported_board_size' };
  }

  if (typeof payload.komi !== 'number' || !Number.isFinite(payload.komi)) {
    return { ok: false, error: 'invalid_komi' };
  }

  if (payload.komi < MIN_KOMI || payload.komi > MAX_KOMI) {
    return { ok: false, error: 'komi_out_of_range' };
  }

  if (!isStoneColor(payload.colorToMove)) {
    return { ok: false, error: 'invalid_color_to_move' };
  }

  if (!Array.isArray(payload.moves)) {
    return { ok: false, error: 'invalid_moves' };
  }

  if (payload.moves.length > MAX_MOVE_COUNT) {
    return { ok: false, error: 'too_many_moves' };
  }

  const moves: ApiMove[] = [];
  for (const entry of payload.moves) {
    const parsed = parseMove(entry, SUPPORTED_AI_BOARD_SIZE);
    if (!parsed) {
      return { ok: false, error: 'invalid_move' };
    }
    moves.push(parsed);
  }

  return {
    ok: true,
    request: {
      boardSize: SUPPORTED_AI_BOARD_SIZE,
      komi: payload.komi,
      colorToMove: payload.colorToMove,
      moves,
    },
  };
}

export function toAiMoveResponse(result: { type: 'play'; position: { x: number; y: number } } | { type: 'pass' }) {
  if (result.type === 'pass') {
    return { move: { type: 'pass' as const } };
  }

  return {
    move: {
      type: 'play' as const,
      position: {
        x: result.position.x,
        y: result.position.y,
      },
    },
  };
}

export function validationErrorMessage(code: string): string {
  switch (code) {
    case 'unsupported_board_size':
      return 'AI currently supports 9×9 boards only.';
    case 'invalid_komi':
    case 'komi_out_of_range':
      return 'Komi must be a valid number within the allowed range.';
    case 'invalid_color_to_move':
      return 'colorToMove must be black or white.';
    case 'invalid_moves':
    case 'invalid_move':
    case 'too_many_moves':
      return 'Move history is invalid.';
    default:
      return 'Invalid AI request.';
  }
}
