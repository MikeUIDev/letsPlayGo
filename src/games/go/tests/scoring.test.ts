import { describe, expect, it } from 'vitest';
import { createEmptyBoard, getStone, withStone } from '../engine/board';
import { getDefaultKomiForSize } from '../engine/boardConfig';
import {
  createGameFromSetup,
  createInitialState,
  dispatch,
  toggleDeadGroup,
} from '../engine/gameState';
import {
  calculateChineseScore,
  calculateScoreBreakdown,
  classifyTerritoryOwner,
  getEmptyRegions,
  getTerritoryOwnershipMap,
  scoreGame,
  scoreMargin,
} from '../engine/scoring';
import { provisionalLeaderLabel as leaderFromView } from '../components/ScoreBreakdownView';
import { createLocalSetup, createAiSetup } from '../utils/gameSetup';
import type { BoardSize } from '../engine/types';

function enterScoring(state = createInitialState(9)) {
  const pass1 = dispatch(state, { type: 'pass' });
  if (!pass1.ok) throw new Error('pass failed');
  const pass2 = dispatch(pass1.state, { type: 'pass' });
  if (!pass2.ok) throw new Error('pass failed');
  return pass2.state;
}

function surroundCornerBlack(board: ReturnType<typeof createEmptyBoard>) {
  let next = board;
  next = withStone(next, { row: 0, col: 1 }, 'black');
  next = withStone(next, { row: 1, col: 0 }, 'black');
  next = withStone(next, { row: 1, col: 1 }, 'black');
  return next;
}

describe('territory detection', () => {
  it('counts an empty region surrounded only by Black as Black territory', () => {
    let board = createEmptyBoard(9);
    board = surroundCornerBlack(board);

    const regions = getEmptyRegions(board);
    const corner = regions.find((region) =>
      region.positions.some((pos) => pos.row === 0 && pos.col === 0),
    );

    expect(corner?.owner).toBe('black');
    expect(classifyTerritoryOwner(true, false)).toBe('black');
  });

  it('counts an empty region surrounded only by White as White territory', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 0 }, 'white');
    board = withStone(board, { row: 1, col: 1 }, 'white');

    const regions = getEmptyRegions(board);
    const corner = regions.find((region) =>
      region.positions.some((pos) => pos.row === 0 && pos.col === 0),
    );

    expect(corner?.owner).toBe('white');
  });

  it('treats a region touching both colors as neutral', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 3 }, 'black');
    board = withStone(board, { row: 4, col: 5 }, 'white');
    board = withStone(board, { row: 3, col: 4 }, 'black');
    board = withStone(board, { row: 5, col: 4 }, 'white');

    const map = getTerritoryOwnershipMap(board);
    expect(map.get('4,4')).toBe('neutral');
  });

  it('handles edge and corner territory correctly', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');
    board = withStone(board, { row: 1, col: 1 }, 'black');
    board = withStone(board, { row: 0, col: 7 }, 'white');
    board = withStone(board, { row: 1, col: 8 }, 'white');
    board = withStone(board, { row: 1, col: 7 }, 'white');

    const map = getTerritoryOwnershipMap(board);
    expect(map.get('0,0')).toBe('black');
    expect(map.get('0,8')).toBe('white');
  });
});

describe('dead group toggling', () => {
  it('marks an entire connected group dead when one member is clicked', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'white');
    board = withStone(board, { row: 2, col: 1 }, 'white');

    const deadStones = toggleDeadGroup(board, [], { row: 1, col: 2 });

    expect(deadStones).toHaveLength(3);
    expect(deadStones.map((pos) => `${pos.row},${pos.col}`).sort()).toEqual([
      '1,1',
      '1,2',
      '2,1',
    ]);
  });

  it('restores an entire group when re-toggled', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'white');

    const marked = toggleDeadGroup(board, [], { row: 1, col: 1 });
    const restored = toggleDeadGroup(board, marked, { row: 1, col: 2 });

    expect(restored).toHaveLength(0);
  });

  it('changes territory when a dead group is removed from scoring', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'white');
    board = withStone(board, { row: 0, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 2 }, 'black');

    const alive = calculateChineseScore(board);
    const dead = calculateChineseScore(board, [{ row: 0, col: 0 }]);

    expect(alive.whiteStones).toBe(1);
    expect(dead.whiteStones).toBe(0);
    expect(dead.blackTerritory).toBeGreaterThan(alive.blackTerritory);
  });

  it('dispatches markDead for a full group through game state', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'black');
    board = withStone(board, { row: 2, col: 3 }, 'black');
    const state = { ...enterScoring(), board, deadStones: [] };

    const marked = dispatch(state, { type: 'markDead', position: { row: 2, col: 2 } });
    expect(marked.ok).toBe(true);
    if (marked.ok) {
      expect(marked.state.deadStones).toHaveLength(2);
    }
  });
});

describe('Chinese area scoring', () => {
  it('counts living stones on the board', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 0, col: 0 }, 'black');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');

    const score = calculateChineseScore(board);
    expect(score.blackStones).toBe(3);
  });

  it('does not add captured prisoners separately', () => {
    let board = createEmptyBoard(9);
    board = surroundCornerBlack(board);
    board = withStone(board, { row: 0, col: 2 }, 'black');
    board = withStone(board, { row: 1, col: 2 }, 'black');
    board = withStone(board, { row: 2, col: 0 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 2 }, 'black');

    const breakdown = calculateScoreBreakdown(board, 6.5);
    const result = scoreGame(board, { komi: 6.5 });

    expect(result.blackScore).toBe(breakdown.blackStones + breakdown.blackTerritory);
    expect(result.whiteScore).toBe(breakdown.whiteStones + breakdown.whiteTerritory + 6.5);
  });

  it('includes komi for White', () => {
    const board = createEmptyBoard(9);
    const result = scoreGame(board, { komi: 6.5 });
    expect(result.whiteScore).toBe(6.5);
  });

  it('determines winner and margin correctly', () => {
    let board = createEmptyBoard(9);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        board = withStone(board, { row, col }, 'black');
      }
    }

    const result = scoreGame(board, { komi: 6.5 });
    expect(result.winner).toBe('black');
    expect(result.blackScore).toBeGreaterThan(result.whiteScore);
    expect(scoreMargin(result)).toBe(result.blackScore - result.whiteScore);
  });

  it('reports a draw when totals are equal', () => {
    const board = createEmptyBoard(9);
    const result = scoreGame(board, { komi: 0 });
    expect(result.winner).toBe('draw');
    expect(result.blackScore).toBe(0);
    expect(result.whiteScore).toBe(0);
    expect(scoreMargin(result)).toBe(0);
  });

  it('tracks prisoners off board separately from area score', () => {
    let state = createInitialState(9);
    const moves = [
      { row: 0, col: 1 },
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ] as const;

    for (const position of moves) {
      const played = dispatch(state, { type: 'play', position });
      if (!played.ok) throw new Error('play failed');
      state = played.state;
    }

    expect(state.captures.black).toBe(1);
    expect(getStone(state.board, { row: 0, col: 0 })).toBeNull();

    const breakdown = calculateScoreBreakdown(state.board, state.config.komi, []);
    expect(breakdown.blackStones).toBe(2);
    expect(breakdown.whiteStones).toBe(0);
    expect(breakdown.blackTotal).toBe(breakdown.blackStones + breakdown.blackTerritory);
  });
});

describe('scoring phase guards', () => {
  it('rejects play actions during scoring', () => {
    const state = enterScoring();
    const played = dispatch(state, { type: 'play', position: { row: 4, col: 4 } });
    expect(played.ok).toBe(false);
    if (!played.ok) {
      expect(played.error).toBe('game_ended');
    }
  });

  it('rejects pass during scoring', () => {
    const state = enterScoring();
    const passed = dispatch(state, { type: 'pass' });
    expect(passed.ok).toBe(false);
    if (!passed.ok) {
      expect(passed.error).toBe('game_ended');
    }
  });

  it('rejects markDead after the game ends', () => {
    let state = enterScoring();
    state = {
      ...state,
      board: withStone(state.board, { row: 2, col: 2 }, 'black'),
    };
    const confirmed = dispatch(state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    state = confirmed.state;

    const marked = dispatch(state, { type: 'markDead', position: { row: 2, col: 2 } });
    expect(marked.ok).toBe(false);
    if (!marked.ok) {
      expect(marked.error).toBe('not_in_scoring');
    }
  });

  it('rejects undo during scoring', () => {
    const state = enterScoring();
    const undone = dispatch(state, { type: 'undo' });
    expect(undone.ok).toBe(false);
    if (!undone.ok) {
      expect(undone.error).toBe('not_in_playing');
    }
  });

  it('leaves final board state and result unchanged after invalid ended actions', () => {
    let state = enterScoring();
    state = {
      ...state,
      board: withStone(state.board, { row: 2, col: 2 }, 'black'),
      deadStones: [{ row: 2, col: 2 }],
    };
    const confirmed = dispatch(state, { type: 'confirmScore' });
    if (!confirmed.ok) throw new Error('confirm failed');
    state = confirmed.state;

    const before = {
      phase: state.phase,
      result: state.result,
      deadStones: [...state.deadStones],
      stone: getStone(state.board, { row: 2, col: 2 }),
    };

    dispatch(state, { type: 'play', position: { row: 4, col: 4 } });
    dispatch(state, { type: 'markDead', position: { row: 2, col: 2 } });
    dispatch(state, { type: 'undo' });
    dispatch(state, { type: 'pass' });

    expect(state.phase).toBe(before.phase);
    expect(state.result).toEqual(before.result);
    expect(state.deadStones).toEqual(before.deadStones);
    expect(getStone(state.board, { row: 2, col: 2 })).toBe(before.stone);
  });
});

describe('scoring phase flow', () => {
  it('enters scoring from two passes on an empty board', () => {
    const state = enterScoring();
    expect(state.phase).toBe('scoring');
    expect(state.consecutivePasses).toBe(2);
    expect(state.deadStones).toEqual([]);
    expect(state.result).toBeNull();

    const breakdown = calculateScoreBreakdown(state.board, state.config.komi, state.deadStones);
    expect(breakdown.blackTotal).toBe(0);
    expect(breakdown.whiteTotal).toBe(state.config.komi);
    expect(leaderFromView(breakdown)).toBe('White leads');
  });

  it('resumeGame exits scoring and clears dead stones and pass streak', () => {
    let state = enterScoring();
    state = {
      ...state,
      board: withStone(state.board, { row: 3, col: 3 }, 'black'),
      deadStones: [{ row: 3, col: 3 }],
    };

    const resumed = dispatch(state, { type: 'resumeGame' });
    expect(resumed.ok).toBe(true);
    if (resumed.ok) {
      expect(resumed.state.phase).toBe('playing');
      expect(resumed.state.consecutivePasses).toBe(0);
      expect(resumed.state.deadStones).toEqual([]);
      expect(getStone(resumed.state.board, { row: 3, col: 3 })).toBe('black');
      expect(resumed.state.history.length).toBe(state.history.length);
    }
  });

  it('confirmScore transitions to finished with double_pass reason after consecutive passes', () => {
    let state = enterScoring();
    state = {
      ...state,
      board: withStone(state.board, { row: 4, col: 4 }, 'black'),
    };

    const confirmed = dispatch(state, { type: 'confirmScore' });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.state.phase).toBe('ended');
      expect(confirmed.state.result).not.toBeNull();
      expect(confirmed.state.result?.reason).toBe('double_pass');
      expect(confirmed.state.result?.blackScore).toBeGreaterThan(0);
    }
  });

  it('undo after opponent pass restores pass streak and prevents accidental scoring entry', () => {
    let state = createInitialState(9);
    const pass1 = dispatch(state, { type: 'pass' });
    if (!pass1.ok) throw new Error('pass failed');
    state = pass1.state;
    expect(state.consecutivePasses).toBe(1);

    const undone = dispatch(state, { type: 'undo' });
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.consecutivePasses).toBe(0);
      expect(undone.state.phase).toBe('playing');
    }

    const passAgain = dispatch(undone.ok ? undone.state : state, { type: 'pass' });
    if (!passAgain.ok) throw new Error('pass failed');
    expect(passAgain.state.consecutivePasses).toBe(1);
    expect(passAgain.state.phase).toBe('playing');
  });

  it('undo still works during normal gameplay', () => {
    let state = createInitialState(9);
    const played = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const undone = dispatch(state, { type: 'undo' });
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.phase).toBe('playing');
      expect(getStone(undone.state.board, { row: 2, col: 2 })).toBeNull();
    }
  });

  it('restart clears scoring state for a fresh game', () => {
    let state = enterScoring();
    const restarted = dispatch(state, { type: 'restart' });
    expect(restarted.ok).toBe(true);
    if (restarted.ok) {
      expect(restarted.state.phase).toBe('playing');
      expect(restarted.state.result).toBeNull();
      expect(restarted.state.deadStones).toEqual([]);
      expect(restarted.state.consecutivePasses).toBe(0);
      expect(restarted.state.history).toHaveLength(0);
    }
  });

  it('rapid repeated passes only enter scoring once', () => {
    let state = createInitialState(9);
    const pass1 = dispatch(state, { type: 'pass' });
    if (!pass1.ok) throw new Error('pass failed');
    state = pass1.state;

    const pass2 = dispatch(state, { type: 'pass' });
    if (!pass2.ok) throw new Error('pass failed');
    state = pass2.state;
    expect(state.phase).toBe('scoring');

    const pass3 = dispatch(state, { type: 'pass' });
    expect(pass3.ok).toBe(false);
  });
});

describe('komi and board sizes', () => {
  for (const size of [9, 13, 19] as BoardSize[]) {
    it(`uses default komi for ${size}×${size}`, () => {
      const state = createInitialState(size);
      expect(state.config.komi).toBe(getDefaultKomiForSize(size));

      const scored = enterScoring(state);
      const breakdown = calculateScoreBreakdown(
        scored.board,
        scored.config.komi,
        scored.deadStones,
      );
      expect(breakdown.whiteTotal).toBe(breakdown.whiteStones + breakdown.whiteTerritory + scored.config.komi);
    });
  }

  it('komi can decide the winner on an otherwise even board', () => {
    const state = createInitialState(9, { komi: 6.5 });
    const scoring = enterScoring(state);
    const confirmed = dispatch(scoring, { type: 'confirmScore' });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.state.result?.winner).toBe('white');
      expect(confirmed.state.result?.whiteScore).toBe(6.5);
      expect(confirmed.state.result?.blackScore).toBe(0);
    }
  });
});

describe('captured stones during play', () => {
  it('increments capture counts without changing area totals incorrectly', () => {
    let state = createGameFromSetup(createLocalSetup({ size: 9 }));
    const moves = [
      { row: 0, col: 1 },
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ] as const;

    for (const position of moves) {
      const played = dispatch(state, { type: 'play', position });
      if (!played.ok) throw new Error('play failed');
      state = played.state;
    }

    expect(state.captures.black).toBe(1);
    expect(getStone(state.board, { row: 0, col: 0 })).toBeNull();

    const scoring = enterScoring(state);
    const breakdown = calculateScoreBreakdown(
      scoring.board,
      scoring.config.komi,
      scoring.deadStones,
    );
    expect(breakdown.blackStones).toBe(2);
    expect(breakdown.whiteStones).toBe(0);
  });
});

describe('AI setup scoring', () => {
  it('supports double-pass scoring flow for AI games', () => {
    const state = createGameFromSetup(createAiSetup({ size: 13, humanColor: 'black' }));
    expect(state.config.size).toBe(13);
    const scoring = enterScoring(state);
    const confirmed = dispatch(scoring, { type: 'confirmScore' });
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.state.phase).toBe('ended');
      expect(confirmed.state.result?.reason).toBe('double_pass');
    }
  });
});
