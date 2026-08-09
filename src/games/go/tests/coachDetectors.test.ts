import { describe, expect, it } from 'vitest';
import { createEmptyBoard, withStone } from '../engine/board';
import { createInitialState, dispatch, getMoveList } from '../engine/gameState';
import { detectAllowedCapture } from '../coach/detectors/allowedCaptureDetector';
import { detectSelfAtari } from '../coach/detectors/atariDetector';
import { detectMissedCapture } from '../coach/detectors/captureDetector';
import { detectMissedDefense } from '../coach/detectors/defenseDetector';
import { detectLeftGroupInAtari } from '../coach/detectors/libertyDetector';
import { detectPrematurePass } from '../coach/detectors/passDetector';
import {
  collectCoachInsights,
  evaluateCoach,
  getTopInsights,
} from '../coach/evaluateCoach';
import { MAX_VISIBLE_COACH_INSIGHTS } from '../coach/types';
import type { AnalysisResult } from '../analysis/types';
import type { MoveEvaluation } from '../review/moveEvaluation';
import { reconstructStateAtIndex } from '../engine/reviewState';

function analysisWithBestPlay(position: { row: number; col: number }): AnalysisResult {
  return {
    winRate: { black: 0.55, white: 0.45 },
    scoreLead: { leader: 'black', points: 1.2 },
    candidates: [
      {
        type: 'play',
        position,
        winRate: 0.55,
        scoreLead: 1.2,
        visits: 100,
      },
    ],
  };
}

function evaluation(overrides: Partial<MoveEvaluation> = {}): MoveEvaluation {
  return {
    moveIndex: 1,
    player: 'black',
    playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
    quality: 'mistake',
    scoreLoss: 3.4,
    bestCandidates: [],
    playedBestMove: false,
    ...overrides,
  };
}

describe('missed capture detector', () => {
  it('detects an immediate missed capture', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const insight = detectMissedCapture({
      beforeBoard: board,
      playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
      player: 'black',
      beforeCandidates: analysisWithBestPlay({ row: 1, col: 2 }).candidates,
    });

    expect(insight?.type).toBe('missed_capture');
    expect(insight?.relatedPositions?.[0]).toEqual({ row: 1, col: 2 });
  });

  it('does not flag when opponent is not in atari', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');

    const insight = detectMissedCapture({
      beforeBoard: board,
      playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
      player: 'black',
      beforeCandidates: analysisWithBestPlay({ row: 1, col: 2 }).candidates,
    });

    expect(insight).toBeNull();
  });
});

describe('self-atari detector', () => {
  it('detects self-atari conservatively', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 0 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 1, col: 1 }, captured: [] };
    const afterBoard = withStone(board, playedMove.position, 'black');

    const insight = detectSelfAtari({ afterBoard, playedMove });
    expect(insight?.type).toBe('self_atari');
  });

  it('does not label a normal safe move as self-atari', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 4 }, 'black');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 2, col: 2 }, captured: [] };
    let afterBoard = withStone(board, playedMove.position, 'black');

    expect(detectSelfAtari({ afterBoard, playedMove })).toBeNull();
  });
});

describe('left group in atari detector', () => {
  it('detects a nearby group left in atari', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 2 }, 'white');
    board = withStone(board, { row: 3, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 2, col: 4 }, captured: [] };
    const afterBoard = withStone(board, playedMove.position, 'black');

    const insight = detectLeftGroupInAtari({ afterBoard, playedMove });
    expect(insight?.type).toBe('left_group_in_atari');
  });
});

describe('allowed capture detector', () => {
  it('detects next-move capture with correct stone count', () => {
    let afterBoard = createEmptyBoard(9);
    afterBoard = withStone(afterBoard, { row: 1, col: 1 }, 'black');
    afterBoard = withStone(afterBoard, { row: 1, col: 0 }, 'black');
    afterBoard = withStone(afterBoard, { row: 0, col: 1 }, 'black');

    const nextMove = {
      type: 'play' as const,
      color: 'white' as const,
      position: { row: 1, col: 2 },
      captured: [
        { row: 1, col: 1 },
        { row: 1, col: 0 },
        { row: 0, col: 1 },
      ],
    };

    const insight = detectAllowedCapture({
      afterBoard,
      nextMove,
      player: 'black',
    });

    expect(insight?.type).toBe('allowed_capture');
    expect(insight?.explanation).toContain('3');
  });
});

describe('missed defense detector', () => {
  it('detects missed defense when atari group is captured next', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'white');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 0, col: 0 }, captured: [] };
    const afterBoard = withStone(beforeBoard, playedMove.position, 'black');
    const nextMove = {
      type: 'play' as const,
      color: 'white' as const,
      position: { row: 2, col: 3 },
      captured: [{ row: 2, col: 2 }],
    };

    const insight = detectMissedDefense({
      beforeBoard,
      afterBoard,
      playedMove,
      nextMove,
      player: 'black',
      beforeCandidates: analysisWithBestPlay({ row: 2, col: 3 }).candidates,
    });

    expect(insight?.type).toBe('missed_defense');
    expect(insight?.explanation).toContain('KataGo preferred defending here');
  });

  it('does not flag successful defense', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'white');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 2, col: 3 }, captured: [] };
    const afterBoard = withStone(beforeBoard, playedMove.position, 'black');

    expect(
      detectMissedDefense({
        beforeBoard,
        afterBoard,
        playedMove,
        nextMove: null,
        player: 'black',
        beforeCandidates: analysisWithBestPlay({ row: 2, col: 3 }).candidates,
      }),
    ).toBeNull();
  });
});

describe('premature pass detector', () => {
  it('detects premature pass when KataGo prefers a board move', () => {
    const insight = detectPrematurePass({
      playedMove: { type: 'pass', color: 'black' },
      beforeCandidates: analysisWithBestPlay({ row: 4, col: 4 }).candidates,
      scoreLoss: 2.0,
    });

    expect(insight?.type).toBe('premature_pass');
  });

  it('does not flag an appropriate pass', () => {
    expect(
      detectPrematurePass({
        playedMove: { type: 'pass', color: 'black' },
        beforeCandidates: [{ type: 'pass', winRate: 0.5, scoreLead: 0, visits: 10 }],
        scoreLoss: 0.2,
      }),
    ).toBeNull();
  });
});

describe('coach insight ranking', () => {
  it('generates fallback for unexplained large score loss', () => {
    let state = createInitialState(9);
    const first = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;

    const beforeState = reconstructStateAtIndex(state, 0);
    const afterState = reconstructStateAtIndex(state, 1);
    const evalResult = evaluation({
      quality: 'mistake',
      scoreLoss: 4.2,
      playedMove: getMoveList(state)[0],
    });

    const explanation = evaluateCoach({
      beforeState,
      afterState,
      nextMove: null,
      evaluation: evalResult,
      beforeAnalysis: {
        winRate: { black: 0.6, white: 0.4 },
        scoreLead: { leader: 'black', points: 3 },
        candidates: [{ type: 'play', position: { row: 3, col: 3 }, winRate: 0.6, scoreLead: 3, visits: 10 }],
      },
    });

    expect(explanation.primary?.type).toBe('large_score_loss');
  });

  it('limits visible insights to two', () => {
    const insights = collectCoachInsights({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: {
        type: 'play',
        color: 'white',
        position: { row: 1, col: 1 },
        captured: [{ row: 0, col: 0 }],
      },
      evaluation: evaluation({ quality: 'big_mistake', scoreLoss: 6.2 }),
      beforeAnalysis: analysisWithBestPlay({ row: 0, col: 0 }),
    });

    expect(getTopInsights(insights).length).toBeLessThanOrEqual(MAX_VISIBLE_COACH_INSIGHTS);
  });

  it('orders insights by priority', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'white');

    const playedMove = { type: 'play' as const, color: 'black' as const, position: { row: 0, col: 0 }, captured: [] };
    const afterBoard = withStone(beforeBoard, playedMove.position, 'black');
    const nextMove = {
      type: 'play' as const,
      color: 'white' as const,
      position: { row: 2, col: 3 },
      captured: [{ row: 2, col: 2 }],
    };

    const insights = [
      detectAllowedCapture({ afterBoard, nextMove, player: 'black' }),
      detectMissedDefense({
        beforeBoard,
        afterBoard,
        playedMove,
        nextMove,
        player: 'black',
        beforeCandidates: analysisWithBestPlay({ row: 2, col: 3 }).candidates,
      }),
    ].filter(Boolean);

    const ranked = getTopInsights(insights as NonNullable<(typeof insights)[number]>[]);
    expect(ranked[0]?.type).toBe('missed_defense');
  });
});
