import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiGoAI, parseApiMoveResponse } from '../ai/ApiGoAI';
import { ApiTransportError } from '../api/client';
import { AiError, aiOfflineMessage, formatAiError } from '../ai/errors';
import { serializeMoveRequest } from '../ai/serializeRequest';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import { getMoveList } from '../engine/gameState';
import { createAiSetup } from '../utils/gameSetup';
import {
  resetNetworkStatusForTests,
  simulateNetworkOfflineForTests,
} from '../../../native/networkStatus';

describe('serializeMoveRequest', () => {
  it('serializes engine moves to API coordinates', () => {
    let state = createGameFromSetup(createAiSetup({ difficulty: 'strong' }));
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 3 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const payload = serializeMoveRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'white',
      difficulty: 'strong',
      moves: getMoveList(state),
      state,
    });

    expect(payload).toEqual({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'white',
      difficulty: 'strong',
      moves: [{ color: 'black', x: 3, y: 2 }],
    });
  });

  it('includes board size and komi for 19×19 games', () => {
    const state = createGameFromSetup(createAiSetup({ size: 19, komi: 7.5 }));
    const payload = serializeMoveRequest({
      boardSize: 19,
      komi: 7.5,
      colorToMove: 'black',
      difficulty: 'casual',
      moves: [],
      state,
    });

    expect(payload.boardSize).toBe(19);
    expect(payload.komi).toBe(7.5);
  });
});

describe('parseApiMoveResponse', () => {
  it('maps play responses to engine positions', () => {
    expect(parseApiMoveResponse({ move: { type: 'play', position: { x: 3, y: 5 } } })).toEqual({
      type: 'play',
      position: { row: 5, col: 3 },
    });
  });

  it('maps pass responses', () => {
    expect(parseApiMoveResponse({ move: { type: 'pass' } })).toEqual({ type: 'pass' });
  });

  it('rejects invalid payloads', () => {
    expect(() => parseApiMoveResponse({})).toThrow(ApiTransportError);
    expect(() => parseApiMoveResponse({ move: { type: 'play', position: { x: 1.5, y: 2 } } })).toThrow(
      ApiTransportError,
    );
  });
});

describe('ApiGoAI', () => {
  beforeEach(() => {
    resetNetworkStatusForTests();
  });

  afterEach(() => {
    resetNetworkStatusForTests();
  });

  it('returns a play move from the backend', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ move: { type: 'play', position: { x: 4, y: 4 } } }),
    });

    const ai = new ApiGoAI({ baseUrl: '/api', fetchImpl, timeoutMs: 1_000 });
    const state = createGameFromSetup(createAiSetup());

    const result = await ai.generateMove({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'white',
      difficulty: 'casual',
      moves: [],
      state,
    });

    expect(result).toEqual({ type: 'play', position: { row: 4, col: 4 } });
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/ai/move',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws a friendly error when the backend is unavailable', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'AI is unavailable right now.' }),
    });

    const ai = new ApiGoAI({ baseUrl: '/api', fetchImpl, timeoutMs: 1_000 });
    const state = createGameFromSetup(createAiSetup());

    await expect(
      ai.generateMove({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [],
        state,
      }),
    ).rejects.toMatchObject({ message: 'AI is unavailable right now.' });
  });

  it('maps aborts to timeout errors', async () => {
    const fetchImpl = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const ai = new ApiGoAI({ baseUrl: '/api', fetchImpl, timeoutMs: 5 });
    const state = createGameFromSetup(createAiSetup());

    await expect(
      ai.generateMove({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [],
        state,
      }),
    ).rejects.toMatchObject({ message: 'The AI took too long to respond.' });
  });

  it('aborts in-flight requests when the caller signal is aborted', async () => {
    const fetchImpl = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const ai = new ApiGoAI({ baseUrl: '/api', fetchImpl, timeoutMs: 5_000 });
    const state = createGameFromSetup(createAiSetup());
    const controller = new AbortController();

    const pending = ai.generateMove(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [],
        state,
      },
      { signal: controller.signal },
    );

    controller.abort();

    await expect(pending).rejects.toMatchObject({ message: 'The AI took too long to respond.' });
  });

  it('does not call the backend while offline', async () => {
    simulateNetworkOfflineForTests();
    const fetchImpl = vi.fn();
    const ai = new ApiGoAI({ baseUrl: '/api', fetchImpl, timeoutMs: 1_000 });
    const state = createGameFromSetup(createAiSetup());

    await expect(
      ai.generateMove({
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        difficulty: 'casual',
        moves: [],
        state,
      }),
    ).rejects.toMatchObject({ code: 'offline', message: aiOfflineMessage() });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('formatAiError', () => {
  it('returns friendly messages for known AI errors', () => {
    expect(formatAiError(new AiError('timeout', 'The AI took too long to respond.'))).toBe(
      'The AI took too long to respond.',
    );
    expect(formatAiError(new DOMException('Aborted', 'AbortError'))).toBe(
      'The AI took too long to respond.',
    );
  });
});
