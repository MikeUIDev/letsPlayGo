import { describe, expect, it } from 'vitest';
import {
  validateAiMoveRequest,
  validationErrorMessage,
  toAiMoveResponse,
} from '../src/validation/aiRequest.js';

describe('AI request validation', () => {
  it('accepts a valid 9x9 request', () => {
    const result = validateAiMoveRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'white',
      difficulty: 'casual',
      moves: [{ color: 'black', x: 4, y: 4 }],
    });

    expect(result.ok).toBe(true);
  });

  it('rejects unsupported board sizes', () => {
    const result = validateAiMoveRequest({
      boardSize: 19,
      komi: 6.5,
      colorToMove: 'black',
      difficulty: 'casual',
      moves: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(validationErrorMessage(result.error)).toContain('9×9');
    }
  });

  it('rejects invalid komi and colors', () => {
    expect(validateAiMoveRequest({ boardSize: 9, komi: NaN, colorToMove: 'black', difficulty: 'casual', moves: [] }).ok).toBe(
      false,
    );
    expect(validateAiMoveRequest({ boardSize: 9, komi: 99, colorToMove: 'black', difficulty: 'casual', moves: [] }).ok).toBe(
      false,
    );
    expect(
      validateAiMoveRequest({ boardSize: 9, komi: 6.5, colorToMove: 'red', difficulty: 'casual', moves: [] }).ok,
    ).toBe(false);
  });

  it('rejects out-of-bounds moves and excessive histories', () => {
    expect(
      validateAiMoveRequest({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [{ color: 'white', x: 9, y: 0 }],
      }).ok,
    ).toBe(false);

    expect(
      validateAiMoveRequest({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: Array.from({ length: 201 }, () => ({ color: 'black', type: 'pass' })),
      }).ok,
    ).toBe(false);
  });

  it('maps domain responses to API contract', () => {
    expect(toAiMoveResponse({ type: 'pass' })).toEqual({ move: { type: 'pass' } });
    expect(toAiMoveResponse({ type: 'play', position: { x: 3, y: 5 } })).toEqual({
      move: { type: 'play', position: { x: 3, y: 5 } },
    });
  });
});
