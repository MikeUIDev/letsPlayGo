import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  applyDevAiFailureSim,
  createSimulatedAiError,
  getAiFailureSim,
  initAiFailureSimFromUrl,
  isAiFailureSimAllowed,
  resetAiFailureSimForTests,
  setAiFailureSim,
  wrapGoAIWithDevFailureSim,
  type AiFailureSimKind,
} from '../ai/devAiFailureSim';
import type { GoAI, GenerateMoveRequest } from '../ai/types';
import { createGameFromSetup } from '../engine/gameState';
import { createAiSetup } from '../utils/gameSetup';

describe('dev AI failure simulation', () => {
  beforeEach(() => {
    resetAiFailureSimForTests();
  });

  afterEach(() => {
    resetAiFailureSimForTests();
  });

  it('is allowed in development or test mode', () => {
    expect(isAiFailureSimAllowed()).toBe(true);
  });

  it.each([
    ['offline', 'offline'],
    ['timeout', 'timeout'],
    ['unavailable', 'unavailable'],
    ['malformed', 'invalid_response'],
  ] as const)('maps %s simulation to %s AiError', (kind, code) => {
    const error = createSimulatedAiError(kind);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('throws the selected failure from applyDevAiFailureSim', async () => {
    const kinds: AiFailureSimKind[] = ['offline', 'timeout', 'unavailable', 'malformed'];

    for (const kind of kinds) {
      setAiFailureSim(kind);
      await expect(applyDevAiFailureSim()).rejects.toMatchObject({
        name: 'AiError',
        code: createSimulatedAiError(kind).code,
      });
    }
  });

  it('wraps GoAI and fails before the underlying provider runs', async () => {
    let called = false;
    const inner: GoAI = {
      generateMove: async () => {
        called = true;
        return { type: 'pass' };
      },
    };

    setAiFailureSim('timeout');
    const wrapped = wrapGoAIWithDevFailureSim(inner);
    const state = createGameFromSetup(createAiSetup());
    const request = {
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'black',
      difficulty: 'casual',
      moves: [],
      state,
    } satisfies GenerateMoveRequest;

    await expect(wrapped.generateMove(request)).rejects.toMatchObject({ code: 'timeout' });
    expect(called).toBe(false);
  });

  it('passes through to the provider when simulation is off', async () => {
    const inner: GoAI = {
      generateMove: async () => ({ type: 'pass' }),
    };

    const wrapped = wrapGoAIWithDevFailureSim(inner);
    const state = createGameFromSetup(createAiSetup());
    await expect(
      wrapped.generateMove({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [],
        state,
      }),
    ).resolves.toEqual({ type: 'pass' });
  });

  it('reads ?aiFail= from the URL in development/test', () => {
    initAiFailureSimFromUrl('?aiFail=malformed');
    expect(getAiFailureSim()).toBe('malformed');

    initAiFailureSimFromUrl('?aiFail=off');
    expect(getAiFailureSim()).toBeNull();
  });
});
