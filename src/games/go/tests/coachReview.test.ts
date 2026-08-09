import { describe, expect, it, vi } from 'vitest';
import type { AnalysisResult, GoAnalysisService } from '../analysis/types';
import { ReviewAnalysisCache } from '../engine/reviewState';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import { createAiSetup, createLocalSetup } from '../utils/gameSetup';
import {
  buildEvaluationsFromCache,
  scanGameForMistakes,
  tryEvaluateCurrentMove,
} from '../review/reviewScan';
import type { MoveEvaluation } from '../review/moveEvaluation';
import { getMistakeMoveIndices } from '../review/moveEvaluation';

function mockAnalysis(result: AnalysisResult): GoAnalysisService {
  return {
    analyze: vi.fn().mockResolvedValue(result),
  };
}

const evenAnalysis: AnalysisResult = {
  winRate: { black: 0.5, white: 0.5 },
  scoreLead: { leader: 'black', points: 0 },
  candidates: [{ type: 'play', position: { row: 4, col: 4 }, winRate: 0.55, scoreLead: 0.5, visits: 10 }],
};

const worseAnalysis: AnalysisResult = {
  winRate: { black: 0.4, white: 0.6 },
  scoreLead: { leader: 'white', points: 3 },
  candidates: [],
};

describe('Coach review scan flow', () => {
  it('starts a scan and stores evaluations by move index', async () => {
    const state = createGameFromSetup(createLocalSetup());
    const cache = new ReviewAnalysisCache();
    let call = 0;
    const analysis: GoAnalysisService = {
      analyze: vi.fn().mockImplementation(async () => {
        call += 1;
        return call <= 2 ? evenAnalysis : worseAnalysis;
      }),
    };

    const progress: Array<{ completed: number; total: number }> = [];
    const result = await scanGameForMistakes({
      sourceState: state,
      analysis,
      cache,
      isCancelled: () => false,
      onProgress: (value) => progress.push(value),
    });

    expect(result.failed).toBe(false);
    expect(result.evaluations.size).toBe(0);
    expect(progress.at(-1)).toEqual({ completed: 1, total: 1 });
  });

  it('reuses cached analyses during scan', async () => {
    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const cache = new ReviewAnalysisCache();
    cache.set(0, evenAnalysis);
    cache.set(1, worseAnalysis);

    const analysis = mockAnalysis(evenAnalysis);
    const result = await scanGameForMistakes({
      sourceState: state,
      analysis,
      cache,
      isCancelled: () => false,
      onProgress: () => {},
    });

    expect(analysis.analyze).not.toHaveBeenCalled();
    expect(result.evaluations.get(1)?.moveIndex).toBe(1);
  });

  it('does not duplicate cached requests when building evaluations', async () => {
    const cache = new ReviewAnalysisCache();
    cache.set(0, evenAnalysis);
    cache.set(1, worseAnalysis);

    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const evaluations = buildEvaluationsFromCache(state, cache);
    expect(evaluations.get(1)).toBeDefined();
  });

  it('generates mistake list in move order', () => {
    const evaluations = new Map<number, MoveEvaluation>([
      [
        3,
        {
          moveIndex: 3,
          player: 'black',
          playedMove: { type: 'pass', color: 'black' },
          quality: 'mistake',
          scoreLoss: 3,
          bestCandidates: [],
          playedBestMove: false,
        },
      ],
      [
        1,
        {
          moveIndex: 1,
          player: 'black',
          playedMove: { type: 'pass', color: 'black' },
          quality: 'inaccuracy',
          scoreLoss: 1.5,
          bestCandidates: [],
          playedBestMove: false,
        },
      ],
    ]);

    expect(getMistakeMoveIndices(evaluations)).toEqual([1, 3]);
  });

  it('preserves partial scan results on failure', async () => {
    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const cache = new ReviewAnalysisCache();
    cache.set(0, evenAnalysis);

    const analysis: GoAnalysisService = {
      analyze: vi.fn().mockRejectedValue(new Error('backend down')),
    };

    const result = await scanGameForMistakes({
      sourceState: state,
      analysis,
      cache,
      isCancelled: () => false,
      onProgress: () => {},
    });

    expect(result.failed).toBe(true);
    expect(cache.has(0)).toBe(true);
  });

  it('reports scan progress from completed evaluations', async () => {
    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 0, col: 0 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const analysis = mockAnalysis(evenAnalysis);
    const progress: number[] = [];

    await scanGameForMistakes({
      sourceState: state,
      analysis,
      cache: new ReviewAnalysisCache(),
      isCancelled: () => false,
      onProgress: ({ completed }) => progress.push(completed),
    });

    expect(progress).toEqual([0, 1, 2]);
  });

  it('ignores stale scan after cancellation', async () => {
    const analysis = mockAnalysis(evenAnalysis);
    const result = await scanGameForMistakes({
      sourceState: createGameFromSetup(createLocalSetup()),
      analysis,
      cache: new ReviewAnalysisCache(),
      isCancelled: () => true,
      onProgress: () => {},
    });

    expect(result.failed).toBe(true);
  });

  it('supports local games', () => {
    const state = createGameFromSetup(createLocalSetup());
    const cache = new ReviewAnalysisCache();
    cache.set(0, evenAnalysis);
    expect(tryEvaluateCurrentMove(state, 0, cache)).toBeNull();
  });

  it('supports AI games', () => {
    const cache = new ReviewAnalysisCache();
    cache.set(0, evenAnalysis);
    cache.set(1, worseAnalysis);

    let played = createGameFromSetup(createAiSetup());
    const move = dispatch(played, { type: 'play', position: { row: 4, col: 4 } });
    if (!move.ok) throw new Error('move failed');
    played = move.state;

    const evaluation = tryEvaluateCurrentMove(played, 1, cache);
    expect(evaluation?.moveIndex).toBe(1);
  });
});

describe('Coach review empty state', () => {
  it('returns no mistakes when every move is good', () => {
    const evaluations = new Map<number, MoveEvaluation>([
      [
        1,
        {
          moveIndex: 1,
          player: 'black',
          playedMove: { type: 'play', color: 'black', position: { row: 2, col: 2 }, captured: [] },
          quality: 'good',
          scoreLoss: 0.2,
          bestCandidates: [],
          playedBestMove: true,
        },
      ],
    ]);

    expect(getMistakeMoveIndices(evaluations)).toEqual([]);
  });
});
