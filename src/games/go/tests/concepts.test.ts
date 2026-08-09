import { describe, expect, it } from 'vitest';
import { createEmptyBoard, withStone } from '../engine/board';
import { createInitialState, dispatch } from '../engine/gameState';
import { reconstructStateAtIndex } from '../engine/reviewState';
import { GO_CONCEPTS, getConceptDefinition } from '../concepts/concepts';
import {
  detectAtariConcept,
  detectCaptureConcept,
  detectConnectConcept,
  detectExtendConcept,
  detectKoConcept,
  detectMoveConcepts,
  selectConcepts,
} from '../concepts/detectors';

function contextFromMoves(moves: Array<{ color: 'black' | 'white'; row: number; col: number }>, moveIndex: number) {
  let state = createInitialState(9);
  for (const move of moves) {
    const result = dispatch(state, { type: 'play', position: { row: move.row, col: move.col } });
    if (!result.ok) throw new Error(result.error);
    state = result.state;
  }

  const beforeState = reconstructStateAtIndex(state, moveIndex - 1);
  const afterState = reconstructStateAtIndex(state, moveIndex);
  const playedMove = state.history[moveIndex - 1]?.move;
  if (!playedMove) {
    throw new Error('missing move');
  }

  return {
    beforeBoard: beforeState.board,
    afterBoard: afterState.board,
    afterState,
    playedMove,
    player: playedMove.color,
  };
}

describe('Go concept metadata', () => {
  it('exposes reusable concept definitions', () => {
    expect(getConceptDefinition('atari').name).toBe('Atari');
    expect(GO_CONCEPTS.connect.shortDefinition).toContain('joins');
  });
});

describe('atari concept detection', () => {
  it('detects opponent group reduced to one liberty', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 2 }, 'black');

    let afterBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    const concept = detectAtariConcept({
      beforeBoard,
      afterBoard,
      afterState: createInitialState(9),
      playedMove: { type: 'play', color: 'black', position: { row: 2, col: 1 }, captured: [] },
      player: 'black',
    });

    expect(concept?.concept).toBe('atari');
  });

  it('does not label two-liberty groups as atari', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');

    let afterBoard = withStone(beforeBoard, { row: 4, col: 4 }, 'black');
    expect(
      detectAtariConcept({
        beforeBoard,
        afterBoard,
        afterState: createInitialState(9),
        playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
        player: 'black',
      }),
    ).toBeNull();
  });

  it('uses capture instead of atari when stones are removed', () => {
    const ctx = contextFromMoves(
      [
        { color: 'black', row: 0, col: 1 },
        { color: 'white', row: 1, col: 1 },
        { color: 'black', row: 2, col: 1 },
        { color: 'white', row: 4, col: 4 },
        { color: 'black', row: 1, col: 0 },
        { color: 'white', row: 4, col: 3 },
        { color: 'black', row: 1, col: 2 },
      ],
      7,
    );

    const concepts = detectMoveConcepts(ctx);
    expect(concepts.some((concept) => concept.concept === 'capture')).toBe(true);
    expect(concepts.find((concept) => concept.concept === 'atari')).toBeUndefined();
  });
});

describe('capture concept detection', () => {
  it('detects single-stone capture', () => {
    const concept = detectCaptureConcept({
      beforeBoard: createEmptyBoard(9),
      afterBoard: createEmptyBoard(9),
      afterState: createInitialState(9),
      playedMove: {
        type: 'play',
        color: 'black',
        position: { row: 1, col: 2 },
        captured: [{ row: 1, col: 1 }],
      },
      player: 'black',
    });

    expect(concept?.metadata?.stoneCount).toBe(1);
    expect(concept?.teachingLine).toContain('1');
  });

  it('detects multi-stone capture', () => {
    const concept = detectCaptureConcept({
      beforeBoard: createEmptyBoard(9),
      afterBoard: createEmptyBoard(9),
      afterState: createInitialState(9),
      playedMove: {
        type: 'play',
        color: 'black',
        position: { row: 1, col: 2 },
        captured: [{ row: 1, col: 1 }, { row: 1, col: 0 }],
      },
      player: 'black',
    });

    expect(concept?.metadata?.stoneCount).toBe(2);
  });

  it('returns null when no capture occurred', () => {
    expect(
      detectCaptureConcept({
        beforeBoard: createEmptyBoard(9),
        afterBoard: createEmptyBoard(9),
        afterState: createInitialState(9),
        playedMove: { type: 'play', color: 'black', position: { row: 2, col: 2 }, captured: [] },
        player: 'black',
      }),
    ).toBeNull();
  });
});

describe('connect concept detection', () => {
  it('detects joining two separate friendly groups', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 4 }, 'black');

    const concept = detectConnectConcept({
      beforeBoard,
      afterBoard: withStone(beforeBoard, { row: 2, col: 3 }, 'black'),
      afterState: createInitialState(9),
      playedMove: { type: 'play', color: 'black', position: { row: 2, col: 3 }, captured: [] },
      player: 'black',
    });

    expect(concept?.concept).toBe('connect');
    expect(concept?.metadata?.groupCount).toBe(2);
  });

  it('does not label adjacent play to one group as connect', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');

    expect(
      detectConnectConcept({
        beforeBoard,
        afterBoard: withStone(beforeBoard, { row: 2, col: 3 }, 'black'),
        afterState: createInitialState(9),
        playedMove: { type: 'play', color: 'black', position: { row: 2, col: 3 }, captured: [] },
        player: 'black',
      }),
    ).toBeNull();
  });

  it('does not connect diagonally separated stones', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 4, col: 4 }, 'black');

    expect(
      detectConnectConcept({
        beforeBoard,
        afterBoard: withStone(beforeBoard, { row: 2, col: 3 }, 'black'),
        afterState: createInitialState(9),
        playedMove: { type: 'play', color: 'black', position: { row: 2, col: 3 }, captured: [] },
        player: 'black',
      }),
    ).toBeNull();
  });
});

describe('extend concept detection', () => {
  it('detects a move that increases liberties', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    const afterBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');

    const concept = detectExtendConcept({
      beforeBoard,
      afterBoard,
      afterState: createInitialState(9),
      playedMove: { type: 'play', color: 'black', position: { row: 2, col: 3 }, captured: [] },
      player: 'black',
    });

    expect(concept?.concept).toBe('extend');
  });

  it('prefers connect over extend', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 4 }, 'black');
    const afterBoard = withStone(beforeBoard, { row: 2, col: 3 }, 'black');

    const concepts = detectMoveConcepts({
      beforeBoard,
      afterBoard,
      afterState: createInitialState(9),
      playedMove: { type: 'play', color: 'black', position: { row: 2, col: 3 }, captured: [] },
      player: 'black',
    });

    expect(concepts.some((concept) => concept.concept === 'connect')).toBe(true);
    expect(concepts.some((concept) => concept.concept === 'extend')).toBe(false);
  });
});

describe('ko concept detection', () => {
  it('detects ko from engine state after capture', () => {
    let beforeBlack = createEmptyBoard(9);
    beforeBlack = withStone(beforeBlack, { row: 7, col: 7 }, 'white');
    beforeBlack = withStone(beforeBlack, { row: 8, col: 6 }, 'white');
    beforeBlack = withStone(beforeBlack, { row: 8, col: 8 }, 'white');
    beforeBlack = withStone(beforeBlack, { row: 6, col: 7 }, 'black');
    beforeBlack = withStone(beforeBlack, { row: 7, col: 6 }, 'black');
    beforeBlack = withStone(beforeBlack, { row: 7, col: 8 }, 'black');

    let afterBlack = createEmptyBoard(9);
    afterBlack = withStone(afterBlack, { row: 8, col: 6 }, 'white');
    afterBlack = withStone(afterBlack, { row: 8, col: 8 }, 'white');
    afterBlack = withStone(afterBlack, { row: 6, col: 7 }, 'black');
    afterBlack = withStone(afterBlack, { row: 7, col: 6 }, 'black');
    afterBlack = withStone(afterBlack, { row: 7, col: 8 }, 'black');
    afterBlack = withStone(afterBlack, { row: 8, col: 7 }, 'black');

    const state = {
      ...createInitialState(9),
      board: afterBlack,
      currentPlayer: 'white' as const,
      captures: { black: 1, white: 0 },
      history: [
        {
          move: { type: 'play' as const, color: 'black' as const, position: { row: 8, col: 7 }, captured: [{ row: 7, col: 7 }] },
          board: beforeBlack,
          captures: { black: 0, white: 0 },
          consecutivePasses: 0,
          currentPlayer: 'black' as const,
          phase: 'playing' as const,
          result: null,
          deadStones: [],
        },
      ],
    };

    const playedMove = state.history[0].move;
    const concept = detectKoConcept({
      beforeBoard: beforeBlack,
      afterBoard: afterBlack,
      afterState: state,
      playedMove,
      player: 'black',
    });

    expect(concept?.concept).toBe('ko');
  });
});

describe('concept priority', () => {
  it('selects at most two concepts with priority ordering', () => {
    const selected = selectConcepts([
      { concept: 'extend', relatedPositions: [] },
      { concept: 'capture', relatedPositions: [], metadata: { stoneCount: 1 } },
      { concept: 'atari', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('capture');
    expect(selected.secondary?.concept).toBe('atari');
  });
});
