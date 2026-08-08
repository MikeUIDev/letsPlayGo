import { describe, expect, it } from 'vitest';
import {
  createEmptyBoard,
  getStone,
  withStone,
} from '../engine/board';
import { getGroup } from '../engine/groups';
import { countLiberties, getLibertyPositions } from '../engine/liberties';
import {
  applyCaptures,
  getCapturedStones,
  isSuicide,
} from '../engine/captures';

describe('single-stone capture', () => {
  it('detects a surrounded stone', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const captured = getCapturedStones(board, { row: 1, col: 2 }, 'black');
    expect(captured).toEqual([{ row: 1, col: 1 }]);
  });
});

describe('corner capture', () => {
  it('captures a stone in the corner', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const captured = getCapturedStones(board, { row: 0, col: 1 }, 'black');
    expect(captured).toEqual([{ row: 0, col: 0 }]);
  });
});

describe('edge capture', () => {
  it('captures a stone on the edge', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 4 }, 'white');
    board = withStone(board, { row: 0, col: 3 }, 'black');
    board = withStone(board, { row: 1, col: 4 }, 'black');

    const captured = getCapturedStones(board, { row: 0, col: 5 }, 'black');
    expect(captured).toEqual([{ row: 0, col: 4 }]);
  });
});

describe('connected multi-stone groups', () => {
  it('captures an entire connected group', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 3 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 3 }, 'black');
    board = withStone(board, { row: 3, col: 2 }, 'black');
    board = withStone(board, { row: 3, col: 3 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');

    const captured = getCapturedStones(board, { row: 2, col: 4 }, 'black');
    expect(captured).toHaveLength(2);
    expect(captured).toContainEqual({ row: 2, col: 2 });
    expect(captured).toContainEqual({ row: 2, col: 3 });
  });

  it('treats diagonally separated stones as separate groups', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'white');
    board = withStone(board, { row: 3, col: 3 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 3, col: 1 }, 'black');
    board = withStone(board, { row: 4, col: 3 }, 'black');
    board = withStone(board, { row: 3, col: 4 }, 'black');

    const group = getGroup(board, { row: 2, col: 2 });
    expect(group?.stones).toHaveLength(1);
  });
});

describe('groups sharing liberties', () => {
  it('does not capture when separate groups each retain another liberty', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 3 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 3 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');
    board = withStone(board, { row: 1, col: 4 }, 'black');

    const captured = getCapturedStones(board, { row: 1, col: 2 }, 'black');
    expect(captured).toHaveLength(0);
  });

  it('counts shared liberties correctly for one group', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 3 }, 'white');

    const group = getGroup(board, { row: 2, col: 2 })!;
    const liberties = getLibertyPositions(board, group);
    expect(liberties.length).toBeGreaterThan(1);
    expect(countLiberties(board, group)).toBe(liberties.length);
  });
});

describe('multiple opponent groups with one move', () => {
  it('captures two separate groups simultaneously', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 3 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 0, col: 3 }, 'black');
    board = withStone(board, { row: 2, col: 3 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');
    board = withStone(board, { row: 1, col: 4 }, 'black');

    const captured = getCapturedStones(board, { row: 1, col: 2 }, 'black');
    expect(captured).toHaveLength(2);
  });
});

describe('suicide', () => {
  it('prevents suicide when no capture occurs', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    expect(isSuicide(board, { row: 1, col: 1 }, 'black')).toBe(true);
  });

  it('prevents suicide for a connected group with no liberties', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    expect(isSuicide(board, { row: 1, col: 1 }, 'black')).toBe(true);
  });

  it('allows a move that captures and is therefore legal', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    expect(isSuicide(board, { row: 1, col: 2 }, 'black')).toBe(false);
  });
});

describe('applyCaptures', () => {
  it('returns a new board with captured stones removed', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const { board: next, captured } = applyCaptures(board, { row: 0, col: 1 }, 'black');
    expect(captured).toEqual([{ row: 0, col: 0 }]);
    expect(getStone(next, { row: 0, col: 0 })).toBeNull();
    expect(getStone(board, { row: 0, col: 0 })).toBe('white');
  });
});
