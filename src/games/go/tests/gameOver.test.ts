import { describe, expect, it } from 'vitest';
import { formatGameOverReasonLine } from '../components/gameOverResult';
import { formatWinnerLabel } from '../components/ScoreBreakdownView';
import type { GameResult } from '../engine/types';

describe('game over result presentation', () => {
  it('presents resignation as by resignation, not by points', () => {
    const result: GameResult = {
      winner: 'white',
      blackScore: 12,
      whiteScore: 40.5,
      reason: 'resign',
    };

    expect(formatWinnerLabel(result)).toBe('White wins');
    expect(formatGameOverReasonLine(result)).toBe('by resignation');
    expect(formatGameOverReasonLine(result)).not.toContain('points');
  });

  it('presents black resignation as a white win by resignation', () => {
    const result: GameResult = {
      winner: 'black',
      blackScore: 8,
      whiteScore: 6.5,
      reason: 'resign',
    };

    expect(formatWinnerLabel(result)).toBe('Black wins');
    expect(formatGameOverReasonLine(result)).toBe('by resignation');
  });

  it('presents scored wins with a point margin', () => {
    expect(
      formatGameOverReasonLine({
        winner: 'black',
        blackScore: 48.5,
        whiteScore: 36,
        reason: 'score',
      }),
    ).toBe('by 12.5 points');

    expect(
      formatGameOverReasonLine({
        winner: 'white',
        blackScore: 30,
        whiteScore: 41.5,
        reason: 'double_pass',
      }),
    ).toBe('by 11.5 points');
  });

  it('presents jigo as a tied score', () => {
    const result: GameResult = {
      winner: 'draw',
      blackScore: 40.5,
      whiteScore: 40.5,
      reason: 'score',
    };

    expect(formatWinnerLabel(result)).toBe('Draw');
    expect(formatGameOverReasonLine(result)).toBe('Scores are tied');
  });
});
