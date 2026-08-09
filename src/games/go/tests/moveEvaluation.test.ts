import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../analysis/types';
import {
  evaluateMove,
  getEvaluableMoveIndices,
  getMistakeMoveIndices,
  getMistakeNavigation,
  getNextMistakeIndex,
  getPreviousMistakeIndex,
  isPlayedBestMove,
} from '../review/moveEvaluation';
import {
  classifyMoveQuality,
  MOVE_QUALITY_THRESHOLDS,
} from '../review/moveQuality';
import {
  formatEstimatedScoreLoss,
  roundScoreLoss,
  signedScoreFromPerspective,
} from '../review/scorePerspective';

function analysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    winRate: { black: 0.5, white: 0.5 },
    scoreLead: { leader: 'black', points: 0 },
    candidates: [],
    ...overrides,
  };
}

describe('score perspective', () => {
  it('returns positive score when Black leads from Black perspective', () => {
    expect(signedScoreFromPerspective({ leader: 'black', points: 4 }, 'black')).toBe(4);
  });

  it('returns negative score when Black leads from White perspective', () => {
    expect(signedScoreFromPerspective({ leader: 'black', points: 4 }, 'white')).toBe(-4);
  });

  it('returns positive score when White leads from White perspective', () => {
    expect(signedScoreFromPerspective({ leader: 'white', points: 2 }, 'white')).toBe(2);
  });

  it('returns negative score when White leads from Black perspective', () => {
    expect(signedScoreFromPerspective({ leader: 'white', points: 2 }, 'black')).toBe(-2);
  });
});

describe('move evaluation', () => {
  it('calculates Black move score loss', () => {
    const before = analysis({ scoreLead: { leader: 'black', points: 4 }, winRate: { black: 0.72, white: 0.28 } });
    const after = analysis({ scoreLead: { leader: 'black', points: 1 }, winRate: { black: 0.51, white: 0.49 } });

    const result = evaluateMove(1, { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] }, before, after);

    expect(result?.scoreLoss).toBe(3);
    expect(result?.winRateLoss).toBe(21);
    expect(result?.quality).toBe('mistake');
  });

  it('calculates White move score loss', () => {
    const before = analysis({ scoreLead: { leader: 'white', points: 3 }, winRate: { black: 0.35, white: 0.65 } });
    const after = analysis({ scoreLead: { leader: 'black', points: 1 }, winRate: { black: 0.55, white: 0.45 } });

    const result = evaluateMove(2, { type: 'play', color: 'white', position: { row: 2, col: 2 }, captured: [] }, before, after);

    expect(result?.scoreLoss).toBe(4);
    expect(result?.player).toBe('white');
  });

  it('clamps improvement to zero loss', () => {
    const before = analysis({ scoreLead: { leader: 'black', points: 1 } });
    const after = analysis({ scoreLead: { leader: 'black', points: 4 } });

    const result = evaluateMove(1, { type: 'play', color: 'black', position: { row: 1, col: 1 }, captured: [] }, before, after);

    expect(result?.scoreLoss).toBe(0);
    expect(result?.quality).toBe('good');
  });

  it('classifies quality thresholds', () => {
    expect(classifyMoveQuality(0.5)).toBe('good');
    expect(classifyMoveQuality(MOVE_QUALITY_THRESHOLDS.inaccuracy)).toBe('inaccuracy');
    expect(classifyMoveQuality(MOVE_QUALITY_THRESHOLDS.mistake)).toBe('mistake');
    expect(classifyMoveQuality(MOVE_QUALITY_THRESHOLDS.bigMistake)).toBe('big_mistake');
  });

  it('evaluates the first move at index 1', () => {
    const before = analysis({ scoreLead: { leader: 'black', points: 0.5 } });
    const after = analysis({ scoreLead: { leader: 'black', points: 0.2 } });
    const result = evaluateMove(1, { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] }, before, after);

    expect(result?.moveIndex).toBe(1);
  });

  it('evaluates the final normal move', () => {
    const before = analysis({ scoreLead: { leader: 'white', points: 2 } });
    const after = analysis({ scoreLead: { leader: 'white', points: 0.5 } });
    const result = evaluateMove(
      12,
      { type: 'pass', color: 'black' },
      before,
      after,
    );

    expect(result?.moveIndex).toBe(12);
  });

  it('evaluates pass moves', () => {
    const before = analysis({
      scoreLead: { leader: 'black', points: 5 },
      candidates: [{ type: 'play', position: { row: 3, col: 3 }, winRate: 0.7, scoreLead: 5, visits: 10 }],
    });
    const after = analysis({ scoreLead: { leader: 'white', points: 2 } });

    const result = evaluateMove(3, { type: 'pass', color: 'black' }, before, after);

    expect(result?.playedMove.type).toBe('pass');
    expect(result?.quality).not.toBe('good');
  });

  it('excludes resignation from evaluable moves', () => {
    expect(
      getEvaluableMoveIndices([
        { type: 'play', color: 'black', position: { row: 1, col: 1 }, captured: [] },
        { type: 'resign', color: 'white' },
      ]),
    ).toEqual([1]);
  });

  it('detects when the played move matches candidate #1', () => {
    const before = analysis({
      candidates: [{ type: 'play', position: { row: 4, col: 4 }, winRate: 0.6, scoreLead: 1, visits: 20 }],
    });

    expect(
      isPlayedBestMove({ type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] }, before),
    ).toBe(true);
  });

  it('formats estimated score loss copy', () => {
    expect(formatEstimatedScoreLoss(roundScoreLoss(3.428937))).toBe('Lost about 3.4 points');
  });
});

describe('mistake navigation helpers', () => {
  const evaluations = new Map([
    [2, { moveIndex: 2, quality: 'inaccuracy' } as never],
    [5, { moveIndex: 5, quality: 'mistake' } as never],
    [8, { moveIndex: 8, quality: 'big_mistake' } as never],
  ]);

  it('lists mistake move indices in order', () => {
    expect(getMistakeMoveIndices(evaluations)).toEqual([2, 5, 8]);
  });

  it('navigates previous and next mistakes with boundaries', () => {
    expect(getPreviousMistakeIndex(5, [2, 5, 8])).toBe(2);
    expect(getNextMistakeIndex(5, [2, 5, 8])).toBe(8);
    expect(getMistakeNavigation(2, [2, 5, 8]).canGoPreviousMistake).toBe(false);
    expect(getMistakeNavigation(8, [2, 5, 8]).canGoNextMistake).toBe(false);
  });
});
