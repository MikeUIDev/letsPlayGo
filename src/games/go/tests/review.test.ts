import { describe, expect, it, vi } from 'vitest';
import {
  formatScoreLeadLabel,
  formatWinRatePercent,
  parseAnalysisResponse,
} from '../analysis/ApiGoAnalysis';
import { AnalysisError } from '../analysis/errors';
import { serializeAnalyzeRequest } from '../analysis/serializeRequest';
import type { GoAnalysisService } from '../analysis/types';
import { createEmptyBoard, withStone } from '../engine/board';
import {
  ReviewAnalysisCache,
  buildAnalysisRequest,
  getCandidateMarkers,
  getReviewMoveCount,
  getReviewNavigation,
  reconstructStateAtIndex,
} from '../engine/reviewState';
import { createGameFromSetup, dispatch, getMoveList } from '../engine/gameState';
import { createAiSetup, createLocalSetup } from '../utils/gameSetup';

describe('Review navigation and reconstruction', () => {
  it('allows entering review from a finished game', () => {
    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const scored = dispatch(
      { ...state, phase: 'scoring', consecutivePasses: 2 },
      { type: 'confirmScore' },
    );
    if (!scored.ok) throw new Error('confirm failed');

    expect(scored.state.phase).toBe('ended');
    expect(getReviewMoveCount(scored.state)).toBe(1);
  });

  it('supports next and previous navigation indices', () => {
    const navigationAtStart = getReviewNavigation(0, 4);
    expect(navigationAtStart.canGoNext).toBe(true);
    expect(navigationAtStart.canGoPrevious).toBe(false);

    const navigationAtEnd = getReviewNavigation(4, 4);
    expect(navigationAtEnd.canGoNext).toBe(false);
    expect(navigationAtEnd.canGoLast).toBe(false);
  });

  it('supports jump to start and end', () => {
    expect(getReviewNavigation(0, 6).canGoFirst).toBe(false);
    expect(getReviewNavigation(6, 6).canGoLast).toBe(false);
  });

  it('displays the correct move index out of total moves', () => {
    let state = createGameFromSetup(createLocalSetup());
    for (const col of [2, 3, 4]) {
      const played = dispatch(state, { type: 'play', position: { row: 2, col } });
      if (!played.ok) throw new Error('play failed');
      state = played.state;
    }

    expect(getReviewNavigation(2, getReviewMoveCount(state))).toEqual({
      moveIndex: 2,
      moveCount: 3,
      canGoFirst: true,
      canGoPrevious: true,
      canGoNext: true,
      canGoLast: true,
    });
  });

  it('reconstructs historical boards exactly through replay', () => {
    let state = createGameFromSetup(createLocalSetup());
    const first = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    if (!first.ok) throw new Error('first move failed');
    state = first.state;

    const second = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!second.ok) throw new Error('second move failed');

    const reviewAtOne = reconstructStateAtIndex(second.state, 1);
    expect(getMoveList(reviewAtOne)).toHaveLength(1);
    expect(reviewAtOne.currentPlayer).toBe('white');
  });

  it('reflects captures in reviewed positions', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 9 }));
    const setupMoves = [
      { row: 1, col: 0 },
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];

    for (const position of setupMoves) {
      const played = dispatch(state, { type: 'play', position });
      if (!played.ok) throw new Error('capture setup failed');
      state = played.state;
    }

    expect(state.captures.black).toBe(1);
    const reviewBeforeCapture = reconstructStateAtIndex(state, setupMoves.length - 1);
    expect(reviewBeforeCapture.captures.black).toBe(0);
  });
});

describe('Review analysis session', () => {
  it('tracks loading and success states through the cache helper', () => {
    const cache = new ReviewAnalysisCache();
    const generation = cache.beginRequest();

    expect(cache.isCurrent(generation)).toBe(true);
    expect(cache.has(3)).toBe(false);

    cache.set(3, {
      winRate: { black: 0.6, white: 0.4 },
      scoreLead: { leader: 'black', points: 2.5 },
      candidates: [],
    });

    expect(cache.get(3)?.winRate.black).toBe(0.6);
  });

  it('ignores stale analysis generations', () => {
    const cache = new ReviewAnalysisCache();
    const first = cache.beginRequest();
    cache.beginRequest();

    expect(cache.isCurrent(first)).toBe(false);
  });

  it('does not refetch cached positions', () => {
    const cache = new ReviewAnalysisCache();
    cache.set(2, {
      winRate: { black: 0.55, white: 0.45 },
      scoreLead: { leader: 'white', points: 1.2 },
      candidates: [],
    });

    expect(cache.has(2)).toBe(true);
    expect(cache.get(2)?.scoreLead.leader).toBe('white');
  });

  it('keeps navigation usable when analysis fails', async () => {
    const analysis: GoAnalysisService = {
      analyze: vi.fn().mockRejectedValue(new AnalysisError('unavailable', 'Analysis is unavailable right now.')),
    };

    const state = createGameFromSetup(createAiSetup());
    const request = buildAnalysisRequest(state, 0);

    await expect(analysis.analyze(request)).rejects.toMatchObject({
      message: 'Analysis is unavailable right now.',
    });
    expect(getReviewNavigation(0, getReviewMoveCount(state)).canGoNext).toBe(false);
  });
});

describe('Candidate overlays', () => {
  it('shows up to three numbered markers on empty intersections', () => {
    const board = createEmptyBoard(9);
    const markers = getCandidateMarkers(board, [
      { type: 'play', position: { row: 4, col: 4 } },
      { type: 'play', position: { row: 3, col: 3 } },
      { type: 'play', position: { row: 5, col: 5 } },
      { type: 'pass' },
    ]);

    expect(markers.size).toBe(3);
    expect(markers.get('4,4')).toBe(1);
    expect(markers.get('3,3')).toBe(2);
  });

  it('skips occupied intersections for candidate markers', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 4 }, 'black');

    const markers = getCandidateMarkers(board, [
      { type: 'play', position: { row: 4, col: 4 } },
      { type: 'play', position: { row: 2, col: 2 } },
    ]);

    expect(markers.size).toBe(1);
    expect(markers.get('2,2')).toBe(2);
  });
});

describe('Review mode game types and API parsing', () => {
  it('works for local games', () => {
    const state = createGameFromSetup(createLocalSetup());
    expect(buildAnalysisRequest(state, 0).colorToMove).toBe('black');
  });

  it('works for AI games', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));
    expect(buildAnalysisRequest(state, 0).colorToMove).toBe('black');
  });

  it('parses analysis API responses for the review sidebar', () => {
    const parsed = parseAnalysisResponse({
      winRate: { black: 0.62, white: 0.38 },
      scoreLead: { leader: 'black', points: 3.1 },
      candidates: [
        {
          type: 'play',
          position: { x: 4, y: 4 },
          winRate: 0.62,
          scoreLead: 3.1,
          visits: 180,
        },
      ],
    });

    expect(formatWinRatePercent(parsed.winRate.black)).toBe('62%');
    expect(formatScoreLeadLabel(parsed.scoreLead)).toBe('Black +3.1');
    expect(parsed.candidates[0].type).toBe('play');
    if (parsed.candidates[0].type === 'play') {
      expect(parsed.candidates[0].position).toEqual({ row: 4, col: 4 });
    }
  });

  it('serializes analyze requests without difficulty or maxVisits', () => {
    const state = createGameFromSetup(createAiSetup());
    const payload = serializeAnalyzeRequest(buildAnalysisRequest(state, 0));

    expect(payload).toEqual({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'black',
      moves: [],
    });
    expect(payload).not.toHaveProperty('difficulty');
    expect(payload).not.toHaveProperty('maxVisits');
  });
});
