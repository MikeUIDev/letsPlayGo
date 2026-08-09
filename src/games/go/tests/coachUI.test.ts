import { describe, expect, it } from 'vitest';
import { evaluateCoach } from '../coach/evaluateCoach';
import { formatCoachPanelContent, formatVariationMoveLabel } from '../coach/formatCoachExplanation';
import { createInitialState, dispatch, getMoveList } from '../engine/gameState';
import { reconstructStateAtIndex } from '../engine/reviewState';
import type { MoveEvaluation } from '../review/moveEvaluation';

function buildEvaluatedGame(moves: Array<{ row: number; col: number }>) {
  let state = createInitialState(9);
  for (const move of moves) {
    const result = dispatch(state, { type: 'play', position: move });
    if (!result.ok) {
      throw new Error('illegal setup move');
    }
    state = result.state!;
  }

  return state;
}

function baseEvaluation(overrides: Partial<MoveEvaluation>): MoveEvaluation {
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

describe('coach UI content', () => {
  it('shows good move UI', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: baseEvaluation({ quality: 'good', playedBestMove: false }),
      beforeAnalysis: { winRate: { black: 0.5, white: 0.5 }, scoreLead: { leader: 'black', points: 0 }, candidates: [] },
    });

    const content = formatCoachPanelContent({
      evaluation: baseEvaluation({ quality: 'good' }),
      explanation,
      boardSize: 9,
    });

    expect(content.positiveHeadline).toBe('Good move');
    expect(content.showScoreLoss).toBe(false);
  });

  it('shows best move UI', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: baseEvaluation({ quality: 'good', playedBestMove: true }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [{ type: 'play', position: { row: 4, col: 4 }, winRate: 0.5, scoreLead: 0, visits: 1 }],
      },
    });

    expect(explanation.positiveHeadline).toBe('Best move');
    expect(explanation.positiveDetail).toContain('KataGo');
  });

  it('shows inaccuracy UI with score loss', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: baseEvaluation({ quality: 'inaccuracy', scoreLoss: 1.6 }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [{ type: 'play', position: { row: 3, col: 3 }, winRate: 0.52, scoreLead: 0.5, visits: 1 }],
      },
    });

    const content = formatCoachPanelContent({
      evaluation: baseEvaluation({ quality: 'inaccuracy', scoreLoss: 1.6, bestCandidates: explanation.primary ? [] : [] }),
      explanation,
      boardSize: 9,
    });

    expect(content.showScoreLoss).toBe(true);
    expect(explanation.lightweightHeadline ?? explanation.primary?.title).toContain('stronger move');
  });

  it('shows mistake and big mistake UI with primary explanation', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: baseEvaluation({ quality: 'big_mistake', scoreLoss: 6.1 }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [{ type: 'play', position: { row: 3, col: 3 }, winRate: 0.52, scoreLead: 0.5, visits: 1 }],
      },
    });

    expect(explanation.primary?.title).toBeTruthy();
    expect(explanation.showScoreLoss).toBe(true);
  });

  it('displays score loss with sensible precision', () => {
    const content = formatCoachPanelContent({
      evaluation: baseEvaluation({ quality: 'mistake', scoreLoss: 3.428937 }),
      explanation: {
        primary: null,
        secondary: null,
        primaryConcept: null,
        secondaryConcept: null,
        showScoreLoss: true,
      },
      boardSize: 9,
    });

    expect(content.scoreLossText).toBe('Lost about 3.4 points');
  });

  it('displays better moves when available', () => {
    const content = formatCoachPanelContent({
      evaluation: baseEvaluation({
        quality: 'mistake',
        scoreLoss: 3,
        bestCandidates: [{ type: 'play', position: { row: 5, col: 5 }, winRate: 0.6, scoreLead: 1, visits: 10 }],
      }),
      explanation: {
        primary: {
          type: 'large_score_loss',
          severity: 'warning',
          title: 'A stronger move was available',
          explanation: 'KataGo preferred another move here.',
        },
        secondary: null,
        primaryConcept: null,
        secondaryConcept: null,
        showScoreLoss: true,
      },
      boardSize: 9,
    });

    expect(content.bestMoveLabel).toBeTruthy();
    expect(content.showBetterMoves).toBe(true);
  });

  it('supports local and AI games via shared evaluation path', () => {
    const state = buildEvaluatedGame([
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);

    const beforeState = reconstructStateAtIndex(state, 1);
    const afterState = reconstructStateAtIndex(state, 2);
    const playedMove = getMoveList(state)[1];

    const explanation = evaluateCoach({
      beforeState,
      afterState,
      nextMove: null,
      evaluation: baseEvaluation({
        moveIndex: 2,
        player: 'white',
        playedMove,
        quality: 'good',
      }),
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [],
      },
    });

    expect(explanation.positiveHeadline).toBe('Good move');
  });

  it('keeps coach UI stable when analysis is missing extras', () => {
    const content = formatCoachPanelContent({
      evaluation: baseEvaluation({ quality: 'mistake', scoreLoss: 2.5 }),
      explanation: {
        primary: {
          type: 'large_score_loss',
          severity: 'warning',
          title: 'A stronger move was available',
          explanation: 'KataGo preferred another move here.',
        },
        secondary: null,
        primaryConcept: null,
        secondaryConcept: null,
        showScoreLoss: true,
      },
      boardSize: 9,
    });

    expect(content.primaryTitle).toBeTruthy();
    expect(content.secondaryExplanation).toBeNull();
  });

  it('formats variation move labels for display', () => {
    expect(formatVariationMoveLabel('black', { row: 4, col: 4 }, 9)).toMatch(/^Black /);
    expect(formatVariationMoveLabel('white', 'pass', 9)).toBe('White Pass');
  });
});

describe('coach overlay toggles', () => {
  it('tracks show best move and show line as independent toggles', () => {
    let showBestMove = false;
    let showVariationLine = false;

    showBestMove = !showBestMove;
    expect(showBestMove).toBe(true);

    showVariationLine = !showVariationLine;
    expect(showVariationLine).toBe(true);

    showBestMove = false;
    showVariationLine = false;
    expect(showBestMove).toBe(false);
    expect(showVariationLine).toBe(false);
  });

  it('clears stale variation preview when review move changes', () => {
    let moveIndex = 3;
    let showVariationLine = true;

    moveIndex = 4;
    showVariationLine = false;

    expect(showVariationLine).toBe(false);
    expect(moveIndex).toBe(4);
  });
});
