import { describe, expect, it } from 'vitest';
import {
  createEmptyBoard,
  getStone,
  withStone,
} from '../engine/board';
import {
  createInitialState,
  dispatch,
} from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import { calculateChineseScore, defaultKomi, scoreGame } from '../engine/scoring';

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

  it('enters scoring phase after two consecutive passes', () => {
    let state = createInitialState(9);
    const pass1 = dispatch(state, { type: 'pass' });
    if (!pass1.ok) throw new Error('pass failed');
    state = pass1.state;
    expect(state.phase).toBe('playing');

    const pass2 = dispatch(state, { type: 'pass' });
    expect(pass2.ok).toBe(true);
    if (pass2.ok) {
      expect(pass2.state.phase).toBe('scoring');
      expect(pass2.state.result).toBeNull();
    }
  });

  it('finalizes score only after confirmScore during scoring', () => {
    let state = createInitialState(9);
    const firstPass = dispatch(state, { type: 'pass' });
    if (!firstPass.ok) throw new Error('pass failed');
    state = firstPass.state;

    const secondPass = dispatch(state, { type: 'pass' });
    if (!secondPass.ok) throw new Error('pass failed');
    state = secondPass.state;

    expect(state.phase).toBe('scoring');
    expect(state.result).toBeNull();

    const confirmed = dispatch(state, { type: 'confirmScore' });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.state.phase).toBe('ended');
      expect(confirmed.state.result).not.toBeNull();
    }
  });
});

describe('board sizes', () => {
  it('supports 13x13 and 19x19 boards', () => {
    for (const size of [13, 19] as const) {
      const state = createInitialState(size);
      expect(state.board.size).toBe(size);
      expect(state.config.komi).toBe(defaultKomi(size));
      expect(isLegalPlay(state, { row: 0, col: 0 }).legal).toBe(true);
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

  it('scores only stones and territory, not off-board prisoners', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'black');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');
    board = withStone(board, { row: 1, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 0 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 0, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 2 }, 'black');

    const territory = calculateChineseScore(board);
    const result = scoreGame(board, { komi: 6.5 });

    expect(result.blackScore).toBe(territory.blackStones + territory.blackTerritory);
    expect(result.whiteScore).toBe(territory.whiteStones + territory.whiteTerritory + 6.5);
    expect(result.blackScore).toBeGreaterThan(0);
  });

  it('uses komi from game configuration', () => {
    const state = createInitialState(9, { komi: 10.5 });
    expect(state.config.komi).toBe(10.5);

    const result = scoreGame(state.board, { komi: state.config.komi });
    expect(result.whiteScore).toBe(10.5);
  });

  it('recalculates territory when dead stones are marked', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'white');
    board = withStone(board, { row: 0, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 2 }, 'black');

    const alive = calculateChineseScore(board);
    const withDead = calculateChineseScore(board, [{ row: 0, col: 0 }]);

    expect(alive.whiteStones).toBe(1);
    expect(withDead.whiteStones).toBe(0);
    expect(withDead.blackTerritory).toBeGreaterThanOrEqual(alive.blackTerritory);
  });
});

describe('scoring phase actions', () => {
  it('supports markDead and confirmScore without UI', () => {
    let state = createInitialState(9);
    const pass1 = dispatch(state, { type: 'pass' });
    const pass2 = dispatch(pass1.ok ? pass1.state : state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;
    expect(state.phase).toBe('scoring');

    const marked = dispatch(state, { type: 'markDead', position: { row: 0, col: 0 } });
    expect(marked.ok).toBe(false);

    const confirmed = dispatch(state, { type: 'confirmScore' });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.state.phase).toBe('ended');
      expect(confirmed.state.result).not.toBeNull();
      expect(confirmed.state.result?.reason).toBe('score');
    }
  });
});
