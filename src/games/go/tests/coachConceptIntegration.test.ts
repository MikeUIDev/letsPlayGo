import { describe, expect, it } from 'vitest';
import { evaluateCoach, getConceptHighlights } from '../coach/evaluateCoach';
import { getConceptDefinition } from '../concepts/concepts';
import { createInitialState } from '../engine/gameState';
import type { MoveEvaluation } from '../review/moveEvaluation';

function evaluation(overrides: Partial<MoveEvaluation> = {}): MoveEvaluation {
  return {
    moveIndex: 1,
    player: 'black',
    playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
    quality: 'good',
    scoreLoss: 0,
    bestCandidates: [],
    playedBestMove: false,
    ...overrides,
  };
}

describe('coach concept integration', () => {
  it('keeps quality and concept independent for good moves', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: evaluation({ quality: 'good' }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [],
      },
    });

    expect(explanation.positiveHeadline).toBe('Good move');
    expect(explanation.primaryConcept).toBeNull();
  });

  it('allows insights without concepts', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: evaluation({ quality: 'mistake', scoreLoss: 4.2 }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [{ type: 'play', position: { row: 3, col: 3 }, winRate: 0.52, scoreLead: 1, visits: 1 }],
      },
    });

    expect(explanation.primary?.concept).toBeUndefined();
  });

  it('exposes concept definitions generically', () => {
    expect(getConceptDefinition('self_atari').shortDefinition).toContain('one liberty');
  });

  it('highlights related positions only when expanded', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: evaluation({ quality: 'good' }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [],
      },
    });

    expect(getConceptHighlights(explanation, null).size).toBe(0);

    const expanded = explanation.primaryConcept;
    expect(getConceptHighlights(explanation, expanded).size).toBe(0);
  });

  it('clears highlights when concept is collapsed', () => {
    const concept = {
      concept: 'atari' as const,
      relatedPositions: [{ row: 2, col: 2 }],
      teachingLine: 'Atari',
    };

    expect(getConceptHighlights(null, concept).size).toBe(1);
    expect(getConceptHighlights(null, null).size).toBe(0);
  });
});
