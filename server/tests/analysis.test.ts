import { describe, expect, it } from 'vitest';
import {
  mapAnalysisResponse,
  normalizeScoreLead,
  normalizeVariation,
  normalizeWinRate,
  scoreLeadFromBlackPerspective,
} from '../src/ai/analysisResponse.js';
import { REVIEW_ANALYSIS } from '../src/ai/reviewConfig.js';
import { buildReviewAnalysisQuery } from '../src/katago/protocol.js';
import { KataGoProcess } from '../src/katago/KataGoProcess.js';
import {
  analyzeValidationErrorMessage,
  validateAnalyzeRequest,
} from '../src/validation/analyzeRequest.js';

const sampleMoveInfos = [
  { move: 'E5', order: 0, winrate: 0.62, scoreLead: 3.1, visits: 180 },
  { move: 'D6', order: 1, winrate: 0.59, scoreLead: 2.4, visits: 110 },
  { move: 'F4', order: 2, winrate: 0.57, scoreLead: 1.8, visits: 80 },
  { move: 'pass', order: 3, winrate: 0.4, scoreLead: -1.0, visits: 20 },
];

describe('analyze request validation', () => {
  it('validates supported board size and moves', () => {
    const result = validateAnalyzeRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'black',
      moves: [{ color: 'black', x: 4, y: 4 }],
    });

    expect(result.ok).toBe(true);
  });

  it('rejects unsupported board sizes', () => {
    const result = validateAnalyzeRequest({
      boardSize: 13,
      komi: 6.5,
      colorToMove: 'black',
      moves: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(analyzeValidationErrorMessage(result.error)).toContain('9×9');
    }
  });

  it('rejects invalid move histories', () => {
    const result = validateAnalyzeRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'white',
      moves: [{ color: 'black', x: 10, y: 1 }],
    });

    expect(result.ok).toBe(false);
  });

  it('rejects client-provided search budget overrides', () => {
    const result = validateAnalyzeRequest({
      boardSize: 9,
      komi: 6.5,
      colorToMove: 'black',
      moves: [],
      maxVisits: 999,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('forbidden_field');
    }
  });
});

describe('analysis response mapping', () => {
  it('normalizes black and white win rates from black to move', () => {
    expect(normalizeWinRate(0.62, 'black')).toEqual({ black: 0.62, white: 0.38 });
  });

  it('normalizes black and white win rates from white to move', () => {
    expect(normalizeWinRate(0.62, 'white')).toEqual({ black: 0.38, white: 0.62 });
  });

  it('normalizes score lead into leader and magnitude', () => {
    expect(normalizeScoreLead(3.1, 'black')).toEqual({ leader: 'black', points: 3.1 });
    expect(normalizeScoreLead(-2.5, 'black')).toEqual({ leader: 'white', points: 2.5 });
    expect(normalizeScoreLead(0.02, 'white')).toEqual({ leader: 'black', points: 0 });
  });

  it('maps top candidates strongest first with a maximum of three', () => {
    const mapped = mapAnalysisResponse(
      {
        id: 'analysis-1',
        isDuringSearch: false,
        rootInfo: { winrate: 0.62, scoreLead: 3.1 },
        moveInfos: sampleMoveInfos,
      },
      9,
      'black',
    );

    expect(mapped.candidates).toHaveLength(3);
    expect(mapped.candidates[0]).toMatchObject({
      type: 'play',
      position: { x: 4, y: 4 },
      visits: 180,
    });
    expect(mapped.candidates[1]).toMatchObject({
      type: 'play',
      position: { x: 3, y: 3 },
    });
  });

  it('parses pass candidates and converts coordinates', () => {
    const mapped = mapAnalysisResponse(
      {
        id: 'analysis-pass',
        isDuringSearch: false,
        moveInfos: [{ move: 'pass', order: 0, winrate: 0.51, scoreLead: 0.1, visits: 12 }],
      },
      9,
      'white',
    );

    expect(mapped.candidates[0]).toMatchObject({ type: 'pass', visits: 12 });
    expect(mapped.winRate.black + mapped.winRate.white).toBeCloseTo(1, 5);
  });

  it('uses review preset maxVisits in analysis queries', () => {
    const query = buildReviewAnalysisQuery(
      {
        boardSize: 9,
        komi: 6.5,
        colorToMove: 'black',
        moves: [],
      },
      'review-1',
    );

    expect(query.maxVisits).toBe(REVIEW_ANALYSIS.maxVisits);
    expect(query.maxVisits).toBe(400);
  });

  it('does not leak raw KataGo response fields', () => {
    const mapped = mapAnalysisResponse(
      {
        id: 'analysis-2',
        isDuringSearch: false,
        git_hash: 'secret',
        moveInfos: sampleMoveInfos,
      },
      9,
      'black',
    );

    expect(mapped).not.toHaveProperty('moveInfos');
    expect(mapped).not.toHaveProperty('rootInfo');
    expect(mapped.candidates[0]).not.toHaveProperty('order');
  });

  it('normalizes candidate score lead to black-positive points', () => {
    expect(scoreLeadFromBlackPerspective(2.5, 'black')).toBe(2.5);
    expect(scoreLeadFromBlackPerspective(2.5, 'white')).toBe(-2.5);
  });

  it('normalizes KataGo PV to a short variation', () => {
    const variation = normalizeVariation(['E5', 'E6', 'D5', 'D6', 'C5'], 9, 'black');

    expect(variation).toHaveLength(REVIEW_ANALYSIS.maxVariationMoves);
    expect(variation?.[0]).toEqual({ color: 'black', position: { x: 4, y: 4 } });
    expect(variation?.[1]).toEqual({ color: 'white', position: { x: 4, y: 3 } });
  });

  it('converts pass moves in PV', () => {
    const variation = normalizeVariation(['pass', 'E5'], 9, 'white');
    expect(variation?.[0]).toEqual({ color: 'white', position: 'pass' });
    expect(variation?.[1]).toEqual({ color: 'black', position: { x: 4, y: 4 } });
  });

  it('includes variation on mapped candidates without raw KataGo fields', () => {
    const mapped = mapAnalysisResponse(
      {
        id: 'analysis-pv',
        isDuringSearch: false,
        moveInfos: [
          {
            move: 'E5',
            order: 0,
            winrate: 0.62,
            scoreLead: 3.1,
            visits: 180,
            pv: ['E5', 'E6', 'D5'],
          },
        ],
      },
      9,
      'black',
    );

    expect(mapped.candidates[0]?.variation).toHaveLength(3);
    expect(mapped.candidates[0]).not.toHaveProperty('pv');
  });

  it('handles analysis timeouts cleanly', async () => {
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

    await expect(process.sendQuery({ id: 'slow-analysis' }, 10)).rejects.toThrow('katago_query_timeout');
  });
});
