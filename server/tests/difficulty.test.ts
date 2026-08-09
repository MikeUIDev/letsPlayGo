import { describe, expect, it } from 'vitest';
import {
  AI_DIFFICULTY_PRESETS,
  getDifficultyPreset,
  getMaxVisitsForDifficulty,
  isAIDifficulty,
} from '../src/ai/difficulty.js';
import { buildAnalysisQuery } from '../src/katago/protocol.js';
import { KataGoProcess } from '../src/katago/KataGoProcess.js';
import {
  toAiMoveResponse,
  validateAiMoveRequest,
  validationErrorMessage,
} from '../src/validation/aiRequest.js';

const baseRequest = {
  boardSize: 9,
  komi: 6.5,
  colorToMove: 'white' as const,
  moves: [] as [],
};

describe('AI difficulty presets', () => {
  it.each([
    ['beginner', 24],
    ['casual', 64],
    ['strong', 256],
    ['expert', 1000],
  ] as const)('maps %s to maxVisits %i', (difficulty, maxVisits) => {
    expect(getDifficultyPreset(difficulty)).toEqual({ maxVisits });
    expect(getMaxVisitsForDifficulty(difficulty)).toBe(maxVisits);
    expect(AI_DIFFICULTY_PRESETS[difficulty].maxVisits).toBe(maxVisits);
  });

  it('rejects invalid difficulty values', () => {
    expect(isAIDifficulty('master')).toBe(false);
    const result = validateAiMoveRequest({ ...baseRequest, difficulty: 'master' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('invalid_difficulty');
      expect(validationErrorMessage(result.error)).toBe('Invalid AI request.');
    }
  });

  it.each(['beginner', 'casual', 'strong', 'expert'] as const)(
    'accepts %s difficulty requests',
    (difficulty) => {
      const result = validateAiMoveRequest({ ...baseRequest, difficulty });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.request.difficulty).toBe(difficulty);
      }
    },
  );

  it('includes selected maxVisits in the KataGo analysis query', () => {
    const query = buildAnalysisQuery(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'strong',
        moves: [],
      },
      'move-strong',
    );

    expect(query.maxVisits).toBe(256);
  });

  it('rejects client-provided maxVisits overrides', () => {
    const result = validateAiMoveRequest({
      ...baseRequest,
      difficulty: 'casual',
      maxVisits: 9999,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('forbidden_field');
    }
  });

  it('still validates move history alongside difficulty', () => {
    const result = validateAiMoveRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'black',
      difficulty: 'strong',
      moves: [{ color: 'white', x: 2, y: 2 }],
    });

    expect(result.ok).toBe(true);
  });

  it('still maps pass responses to the API contract', () => {
    expect(toAiMoveResponse({ type: 'pass' })).toEqual({ move: { type: 'pass' } });
  });

  it('still rejects pending KataGo queries on timeout', async () => {
    const process = new KataGoProcess({
      binaryPath: '/katago',
      modelPath: '/model',
      configPath: '/cfg',
      startupTimeoutMs: 1_000,
    });

    (process as unknown as { process: { stdin: { writable: boolean; write: Function } } }).process = {
      stdin: {
        writable: true,
        write: (_chunk: string, callback: (error?: Error | null) => void) => callback(),
      },
    };

    await expect(process.sendQuery({ id: 'slow-query' }, 10)).rejects.toThrow('katago_query_timeout');
  });
});
