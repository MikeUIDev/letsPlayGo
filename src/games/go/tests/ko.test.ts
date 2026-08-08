import { describe, expect, it } from 'vitest';
import { cloneBoard, createEmptyBoard, getStone, withStone, withoutStone } from '../engine/board';
import {
  createInitialState,
  dispatch,
} from '../engine/gameState';
import {
  getBoardBeforeOpponentLastPlay,
  violatesKo,
  wouldRecreateBoardBeforeOpponentPlay,
} from '../engine/ko';
import { isLegalPlay } from '../engine/legalMoves';
import type { GameState, HistoryEntry } from '../engine/types';

/**
 * Ko position where black captures white at (7,7) with B(8,7).
 * White recapture at (7,7) repeats the board before black's capture.
 */
function buildManualKoState(): GameState {
  let beforeBlack = createEmptyBoard(9);
  beforeBlack = withStone(beforeBlack, { row: 7, col: 7 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 8, col: 6 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 8, col: 8 }, 'white');
  beforeBlack = withStone(beforeBlack, { row: 6, col: 7 }, 'black');
  beforeBlack = withStone(beforeBlack, { row: 7, col: 6 }, 'black');
  beforeBlack = withStone(beforeBlack, { row: 7, col: 8 }, 'black');

  let afterBlack = withoutStone(cloneBoard(beforeBlack), { row: 7, col: 7 });
  afterBlack = withStone(afterBlack, { row: 8, col: 7 }, 'black');

  const whiteMove: HistoryEntry = {
    move: { type: 'play', color: 'white', position: { row: 7, col: 7 }, captured: [] },
    board: withoutStone(withoutStone(withoutStone(cloneBoard(beforeBlack), { row: 7, col: 7 }), { row: 8, col: 6 }), { row: 8, col: 8 }),
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    currentPlayer: 'white',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  const blackCaptureMove: HistoryEntry = {
    move: {
      type: 'play',
      color: 'black',
      position: { row: 8, col: 7 },
      captured: [{ row: 7, col: 7 }],
    },
    board: beforeBlack,
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    currentPlayer: 'black',
    phase: 'playing',
    result: null,
    deadStones: [],
  };

  return {
    ...createInitialState(9),
    board: afterBlack,
    currentPlayer: 'white',
    captures: { black: 1, white: 0 },
    history: [whiteMove, blackCaptureMove],
    consecutivePasses: 0,
    deadStones: [],
    result: null,
    phase: 'playing',
  };
}

describe('board-hash ko detection', () => {
  it('detects a genuine simple ko via board repetition', () => {
    const state = buildManualKoState();
    const koPoint = { row: 7, col: 7 };

    expect(violatesKo(state, koPoint)).toBe(true);
    expect(isLegalPlay(state, koPoint).reason).toBe('ko');
  });

  it('blocks immediate ko recapture through dispatch', () => {
    const state = buildManualKoState();
    const result = dispatch(state, { type: 'play', position: { row: 7, col: 7 } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('ko');
    }
  });

  it('allows recapture after an intervening move elsewhere', () => {
    let state = buildManualKoState();
    const elsewhere = dispatch(state, { type: 'play', position: { row: 0, col: 0 } });
    expect(elsewhere.ok).toBe(true);
    if (!elsewhere.ok) return;

    state = elsewhere.state;
    const blackReply = dispatch(state, { type: 'play', position: { row: 0, col: 1 } });
    expect(blackReply.ok).toBe(true);
    if (!blackReply.ok) return;

    state = blackReply.state;
    const recapture = dispatch(state, { type: 'play', position: { row: 7, col: 7 } });
    expect(recapture.ok).toBe(true);
  });

  it('does not treat a one-stone capture as ko when the board does not repeat', () => {
    let state = createInitialState(9);
    const moves = [
      { row: 0, col: 1 },
      { row: 8, col: 8 },
      { row: 1, col: 0 },
      { row: 8, col: 7 },
      { row: 0, col: 0 },
      { row: 7, col: 8 },
    ];

    for (const position of moves) {
      const result = dispatch(state, { type: 'play', position });
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }

    const capture = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    expect(capture.ok).toBe(true);
    if (capture.ok) {
      expect(violatesKo(capture.state, { row: 0, col: 0 })).toBe(false);
    }
  });

  it('does not create ko on multi-stone captures', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 1, col: 1 }, 'white');
    board = withStone(board, { row: 1, col: 3 }, 'white');
    board = withStone(board, { row: 0, col: 1 }, 'black');
    board = withStone(board, { row: 2, col: 1 }, 'black');
    board = withStone(board, { row: 0, col: 3 }, 'black');
    board = withStone(board, { row: 2, col: 3 }, 'black');
    board = withStone(board, { row: 1, col: 0 }, 'black');
    board = withStone(board, { row: 1, col: 4 }, 'black');

    const state: GameState = {
      ...createInitialState(9),
      board,
      currentPlayer: 'black',
      history: [
        {
          move: { type: 'play', color: 'white', position: { row: 8, col: 8 }, captured: [] },
          board: createEmptyBoard(9),
          captures: { black: 0, white: 0 },
          consecutivePasses: 0,
          currentPlayer: 'white',
          phase: 'playing',
          result: null,
          deadStones: [],
        },
      ],
    };

    const result = dispatch(state, { type: 'play', position: { row: 1, col: 2 } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const lastMove = result.state.history.at(-1)?.move;
      expect(lastMove?.type).toBe('play');
      if (lastMove?.type === 'play') {
        expect(lastMove.captured).toHaveLength(2);
      }
      expect(violatesKo(result.state, { row: 1, col: 1 })).toBe(false);
    }
  });

  it('uses the board before the opponent last play as the reference position', () => {
    const state = buildManualKoState();
    const reference = getBoardBeforeOpponentLastPlay(state);
    expect(reference).not.toBeNull();
    expect(wouldRecreateBoardBeforeOpponentPlay(state, { row: 7, col: 7 })).toBe(true);
    expect(getStone(reference!, { row: 7, col: 7 })).toBe('white');
  });
});
