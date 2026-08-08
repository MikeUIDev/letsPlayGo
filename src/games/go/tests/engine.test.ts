import { describe, expect, it } from 'vitest';
import {
  createEmptyBoard,
  getStone,
  withStone,
} from '../engine/board';
import { isSuicide, getCapturedStones } from '../engine/captures';
import {
  createInitialState,
  dispatch,
} from '../engine/gameState';
import { computeKoPoint, violatesKo } from '../engine/ko';
import { isLegalPlay } from '../engine/legalMoves';
import { calculateChineseScore } from '../engine/scoring';

describe('board', () => {
  it('creates an empty board of the given size', () => {
    const board = createEmptyBoard(9);
    expect(board.size).toBe(9);
    expect(board.intersections).toHaveLength(9);
    expect(board.intersections[0]).toHaveLength(9);
    expect(getStone(board, { row: 4, col: 4 })).toBeNull();
  });

  it('returns new boards without mutating the original', () => {
    const board = createEmptyBoard(9);
    const next = withStone(board, { row: 0, col: 0 }, 'black');

    expect(getStone(board, { row: 0, col: 0 })).toBeNull();
    expect(getStone(next, { row: 0, col: 0 })).toBe('black');
  });
});

describe('captures', () => {
  it('detects a single-stone capture', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const captured = getCapturedStones(board, { row: 1, col: 2 }, 'black');
    expect(captured).toEqual([{ row: 1, col: 1 }]);
  });
});

describe('legal moves', () => {
  it('prevents suicide when no capture occurs', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    expect(isSuicide(board, { row: 1, col: 1 }, 'black')).toBe(true);
  });

  it('allows capture that would otherwise be suicide', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    expect(isSuicide(board, { row: 1, col: 2 }, 'black')).toBe(false);
  });
});

describe('ko', () => {
  it('sets ko point when exactly one stone is captured', () => {
    expect(computeKoPoint([{ row: 1, col: 1 }])).toEqual({ row: 1, col: 1 });
    expect(computeKoPoint([])).toBeNull();
    expect(
      computeKoPoint([
        { row: 1, col: 1 },
        { row: 2, col: 2 },
      ]),
    ).toBeNull();
  });

  it('blocks immediate ko recapture', () => {
    const state = {
      ...createInitialState(9),
      koPoint: { row: 3, col: 3 },
    };

    expect(violatesKo(state, { row: 3, col: 3 })).toBe(true);
    expect(violatesKo(state, { row: 0, col: 0 })).toBe(false);
  });
});

describe('game state', () => {
  it('alternates turns on legal plays', () => {
    let state = createInitialState(9);
    const first = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    expect(first.ok).toBe(true);
    if (first.ok) {
      state = first.state;
      expect(state.currentPlayer).toBe('white');
    }
  });

  it('supports undo by restoring the previous snapshot', () => {
    let state = createInitialState(9);
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('expected legal play');

    state = played.state;
    const undone = dispatch(state, { type: 'undo' });
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(getStone(undone.state.board, { row: 2, col: 2 })).toBeNull();
      expect(undone.state.currentPlayer).toBe('black');
    }
  });

  it('ends the game on consecutive passes', () => {
    let state = createInitialState(9);
    const pass1 = dispatch(state, { type: 'pass' });
    if (!pass1.ok) throw new Error('pass failed');
    state = pass1.state;

    const pass2 = dispatch(state, { type: 'pass' });
    expect(pass2.ok).toBe(true);
    if (pass2.ok) {
      expect(pass2.state.phase).toBe('ended');
      expect(pass2.state.result).not.toBeNull();
    }
  });
});

describe('scoring', () => {
  it('counts stones and surrounded territory', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'black');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const score = calculateChineseScore(board);
    expect(score.blackStones).toBe(3);
    expect(score.blackTerritory).toBeGreaterThanOrEqual(1);
  });
});

describe('board sizes', () => {
  it('supports 13x13 and 19x19 boards', () => {
    for (const size of [13, 19] as const) {
      const state = createInitialState(size);
      expect(state.board.size).toBe(size);
      expect(isLegalPlay(state, { row: 0, col: 0 }).legal).toBe(true);
    }
  });
});
