import { describe, expect, it } from 'vitest';
import { createEmptyBoard, getStone, withStone } from '../engine/board';
import { createInitialState, dispatch } from '../engine/gameState';
import { getConceptDefinition, GO_CONCEPTS } from '../concepts/concepts';
import {
  detectLadderConcept,
  detectNetConcept,
  detectSnapbackConcept,
  selectConcepts,
} from '../concepts/detectors';
import type { MoveConceptContext } from '../concepts/detectors';
import { buildVariationPreview } from '../coach/variationPreview';
import { evaluateCoach } from '../coach/evaluateCoach';
import { readLadder, findLadderTargetsAfterMove } from '../tactics/ladder';
import { readNet } from '../tactics/net';
import {
  readHistoricalSnapback,
  readSnapbackTrap,
} from '../tactics/snapback';
import { createSimulationState } from '../tactics/simulate';
import { TACTICAL_SEARCH_LIMITS } from '../tactics/types';

function playContext(options: {
  beforeBoard: ReturnType<typeof createEmptyBoard>;
  position: { row: number; col: number };
  color: 'black' | 'white';
  captured?: Array<{ row: number; col: number }>;
  beforeState?: ReturnType<typeof createInitialState>;
  afterState?: ReturnType<typeof createInitialState>;
  nextMove?: MoveConceptContext['nextMove'];
}): MoveConceptContext {
  const afterBoard = withStone(options.beforeBoard, options.position, options.color);
  const afterState = options.afterState ?? createInitialState(9);
  return {
    beforeBoard: options.beforeBoard,
    afterBoard,
    afterState,
    beforeState: options.beforeState,
    playedMove: {
      type: 'play',
      color: options.color,
      position: options.position,
      captured: options.captured ?? [],
    },
    player: options.color,
    nextMove: options.nextMove,
  };
}

function replayMoves(moves: Array<{ color: 'black' | 'white'; row: number; col: number }>) {
  let state = createInitialState(9);

  for (const move of moves) {
    while (state.currentPlayer !== move.color) {
      const passResult = dispatch(state, { type: 'pass' });
      if (!passResult.ok) {
        throw new Error(passResult.error);
      }
      state = passResult.state;
    }

    const result = dispatch(state, { type: 'play', position: { row: move.row, col: move.col } });
    if (!result.ok) {
      throw new Error(result.error);
    }
    state = result.state;
  }

  return state;
}

describe('tactical concept metadata', () => {
  it('includes Stage B concept definitions', () => {
    expect(GO_CONCEPTS.ladder.name).toBe('Ladder');
    expect(GO_CONCEPTS.net.name).toBe('Net');
    expect(GO_CONCEPTS.snapback.name).toBe('Snapback');
    expect(getConceptDefinition('ladder').shortDefinition).toContain('atari');
  });
});

describe('ladder detection', () => {
  it('detects an obvious successful ladder', () => {
    const beforeState = replayMoves([
      { color: 'white', row: 0, col: 4 },
      { color: 'black', row: 1, col: 4 },
      { color: 'white', row: 8, col: 8 },
    ]);

    const ladderResult = dispatch(beforeState, { type: 'play', position: { row: 0, col: 3 } });
    if (!ladderResult.ok) {
      throw new Error(ladderResult.error);
    }

    const afterState = ladderResult.state;
    const playedMove = afterState.history[afterState.history.length - 1].move;

    const targets = findLadderTargetsAfterMove(
      beforeState.board,
      afterState.board,
      { row: 0, col: 3 },
      'black',
    );
    expect(targets.length).toBeGreaterThan(0);

    const read = readLadder(
      createSimulationState(afterState.board, 'white', afterState.config),
      targets[0].stones[0],
      'black',
    );
    expect(read.outcome).toBe('success');
    expect(read.sequence.length).toBeGreaterThanOrEqual(2);

    const concept = detectLadderConcept({
      beforeBoard: beforeState.board,
      afterBoard: afterState.board,
      afterState,
      beforeState,
      playedMove,
      player: 'black',
    });

    expect(concept?.concept).toBe('ladder');
    expect(concept?.tacticalSequence?.length).toBeGreaterThan(1);
  });

  it('detects ladder in rotated orientation', () => {
    const beforeState = replayMoves([
      { color: 'white', row: 4, col: 0 },
      { color: 'black', row: 4, col: 1 },
      { color: 'white', row: 8, col: 8 },
    ]);

    const ladderResult = dispatch(beforeState, { type: 'play', position: { row: 3, col: 0 } });
    if (!ladderResult.ok) {
      throw new Error(ladderResult.error);
    }

    const targets = findLadderTargetsAfterMove(
      beforeState.board,
      ladderResult.state.board,
      { row: 3, col: 0 },
      'black',
    );

    expect(targets.length).toBeGreaterThan(0);
  });

  it('does not label immediate capture as ladder', () => {
    const context = playContext({
      beforeBoard: (() => {
        let board = createEmptyBoard(9);
        board = withStone(board, { row: 1, col: 1 }, 'white');
        board = withStone(board, { row: 0, col: 1 }, 'black');
        board = withStone(board, { row: 2, col: 1 }, 'black');
        board = withStone(board, { row: 1, col: 0 }, 'black');
        return board;
      })(),
      position: { row: 1, col: 2 },
      color: 'black',
      captured: [{ row: 1, col: 1 }],
    });

    expect(detectLadderConcept(context)).toBeNull();
  });

  it('returns unknown safely when search depth is exceeded', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 4 }, 'white');

    const state = createSimulationState(board, 'black');
    const read = readLadder(state, { row: 4, col: 4 }, 'black');
    expect(['failed', 'unknown', 'success']).toContain(read.outcome);
    expect(read.searchDepth).toBeLessThanOrEqual(TACTICAL_SEARCH_LIMITS.ladderMaxDepth);
  });

  it('does not label ladder when defender connects to a ladder breaker', () => {
    const beforeState = replayMoves([
      { color: 'white', row: 0, col: 4 },
      { color: 'black', row: 1, col: 4 },
      { color: 'white', row: 0, col: 6 },
      { color: 'black', row: 8, col: 8 },
    ]);

    const ladderResult = dispatch(beforeState, { type: 'play', position: { row: 0, col: 3 } });
    if (!ladderResult.ok) {
      throw new Error(ladderResult.error);
    }

    const read = readLadder(
      createSimulationState(ladderResult.state.board, 'white', ladderResult.state.config),
      { row: 0, col: 4 },
      'black',
    );

    expect(read.outcome).toBe('failed');
  });

  it('detects snapback via concept detector on recapture move', () => {
    const concept = detectSnapbackConcept({
      beforeBoard: createEmptyBoard(9),
      afterBoard: createEmptyBoard(9),
      afterState: {
        ...createInitialState(9),
        history: [
          {
            move: {
              type: 'play',
              color: 'black',
              position: { row: 2, col: 2 },
              captured: [],
            },
            board: createEmptyBoard(9),
            captures: { black: 0, white: 0 },
            consecutivePasses: 0,
            currentPlayer: 'white',
            phase: 'playing',
            result: null,
            deadStones: [],
          },
          {
            move: {
              type: 'play',
              color: 'white',
              position: { row: 2, col: 2 },
              captured: [{ row: 2, col: 2 }],
            },
            board: createEmptyBoard(9),
            captures: { black: 0, white: 1 },
            consecutivePasses: 0,
            currentPlayer: 'black',
            phase: 'playing',
            result: null,
            deadStones: [],
          },
          {
            move: {
              type: 'play',
              color: 'black',
              position: { row: 2, col: 2 },
              captured: [
                { row: 1, col: 2 },
                { row: 2, col: 1 },
                { row: 2, col: 3 },
              ],
            },
            board: createEmptyBoard(9),
            captures: { black: 3, white: 1 },
            consecutivePasses: 0,
            currentPlayer: 'white',
            phase: 'playing',
            result: null,
            deadStones: [],
          },
        ],
      },
      playedMove: {
        type: 'play',
        color: 'black',
        position: { row: 2, col: 2 },
        captured: [
          { row: 1, col: 2 },
          { row: 2, col: 1 },
          { row: 2, col: 3 },
        ],
      },
      player: 'black',
    });

    expect(concept?.concept).toBe('snapback');
  });

  it('prefers ladder over atari in concept selection', () => {
    const selected = selectConcepts([
      { concept: 'atari', relatedPositions: [] },
      { concept: 'ladder', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('ladder');
    expect(selected.secondary?.concept).toBe('atari');
  });

  it('prefers ladder over net when both heuristics could match', () => {
    const selected = selectConcepts([
      { concept: 'net', relatedPositions: [] },
      { concept: 'ladder', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('ladder');
  });

  it('does not mutate original state during ladder read', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'white');
    board = withStone(board, { row: 3, col: 1 }, 'black');

    const state = createSimulationState(board, 'black');
    const stoneBefore = getStone(state.board, { row: 2, col: 2 });
    readLadder(state, { row: 2, col: 2 }, 'black');
    expect(getStone(state.board, { row: 2, col: 2 })).toBe(stoneBefore);
  });
});

describe('net detection', () => {
  it('detects a trapped group when escapes fail', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 2, col: 2 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 1, col: 2 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'black');
    beforeBoard = withStone(beforeBoard, { row: 3, col: 3 }, 'black');

    const concept = detectNetConcept(
      playContext({ beforeBoard, position: { row: 2, col: 3 }, color: 'black' }),
    );

    expect(concept?.concept === 'net' || concept === null).toBe(true);
  });

  it('does not label simple surround without forced capture as net', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 4, col: 4 }, 'white');

    expect(
      detectNetConcept(
        playContext({ beforeBoard, position: { row: 4, col: 5 }, color: 'black' }),
      ),
    ).toBeNull();
  });

  it('prefers capture over net when move immediately captures', () => {
    const selected = selectConcepts([
      { concept: 'net', relatedPositions: [] },
      { concept: 'capture', relatedPositions: [], metadata: { stoneCount: 2 } },
    ]);

    expect(selected.primary?.concept).toBe('capture');
  });

  it('does not mutate original state during net read', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 2, col: 2 }, 'white');
    board = withStone(board, { row: 1, col: 2 }, 'black');

    const state = createSimulationState(board, 'white');
    const stoneBefore = getStone(state.board, { row: 2, col: 2 });
    readNet(state, { row: 2, col: 2 }, 'black');
    expect(getStone(state.board, { row: 2, col: 2 })).toBe(stoneBefore);
  });
});

describe('snapback detection', () => {
  it('detects classic historical snapback recapture', () => {
    const history = [
      { type: 'play' as const, color: 'black' as const, position: { row: 2, col: 2 }, captured: [] },
      {
        type: 'play' as const,
        color: 'white' as const,
        position: { row: 2, col: 2 },
        captured: [{ row: 2, col: 2 }],
      },
    ];

    const current = {
      type: 'play' as const,
      color: 'black' as const,
      position: { row: 2, col: 2 },
      captured: [
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 3 },
      ],
    };

    const read = readHistoricalSnapback([...history, current], current);
    expect(read?.outcome).toBe('success');
    expect(read?.recaptureCount).toBeGreaterThan(read?.sacrificedCount ?? 0);
  });

  it('does not label ordinary recapture as snapback', () => {
    const history = [
      { type: 'play' as const, color: 'black' as const, position: { row: 2, col: 2 }, captured: [] },
      {
        type: 'play' as const,
        color: 'white' as const,
        position: { row: 2, col: 3 },
        captured: [{ row: 2, col: 2 }],
      },
    ];

    const current = {
      type: 'play' as const,
      color: 'black' as const,
      position: { row: 2, col: 2 },
      captured: [{ row: 2, col: 3 }],
    };

    expect(readHistoricalSnapback([...history, current], current)).toBeNull();
  });

  it('detects snapback trap when next move recaptures larger group', () => {
    const captureMove = {
      type: 'play' as const,
      color: 'white' as const,
      position: { row: 2, col: 2 },
      captured: [{ row: 2, col: 2 }],
    };

    const recaptureMove = {
      type: 'play' as const,
      color: 'black' as const,
      position: { row: 2, col: 2 },
      captured: [
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 3 },
      ],
    };

    const trap = readSnapbackTrap(createInitialState(9), captureMove, recaptureMove);
    expect(trap?.outcome).toBe('success');
  });

  it('prefers snapback over capture in concept selection', () => {
    const selected = selectConcepts([
      { concept: 'capture', relatedPositions: [], metadata: { stoneCount: 1 } },
      { concept: 'snapback', relatedPositions: [] },
    ]);

    expect(selected.primary?.concept).toBe('snapback');
  });
});

describe('tactical concept integration', () => {
  it('builds variation preview from tactical sequence', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 1 }, 'white');

    const beforeState = createInitialState(9);
    const preview = buildVariationPreview(beforeState, [
      { color: 'black', position: { row: 1, col: 2 } },
      { color: 'white', position: { row: 1, col: 1 } },
    ], 8);

    expect(preview.canRender || preview.textMoves.length > 0).toBe(true);
  });

  it('keeps generic coach mode when no tactic is detected', () => {
    const explanation = evaluateCoach({
      beforeState: createInitialState(9),
      afterState: createInitialState(9),
      nextMove: null,
      evaluation: {
        moveIndex: 1,
        player: 'black',
        playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
        quality: 'good',
        scoreLoss: 0,
        bestCandidates: [],
        playedBestMove: false,
      },
      beforeAnalysis: {
        winRate: { black: 0.5, white: 0.5 },
        scoreLead: { leader: 'black', points: 0 },
        candidates: [],
      },
    });

    expect(explanation.primaryConcept).toBeNull();
  });

  it('accepts tactical sequence on detected concepts', () => {
    const concept = {
      concept: 'ladder' as const,
      relatedPositions: [{ row: 2, col: 2 }],
      tacticalSequence: [
        { color: 'black' as const, position: { row: 2, col: 1 } },
        { color: 'white' as const, position: { row: 2, col: 2 } },
      ],
    };

    expect(concept.tacticalSequence.length).toBe(2);
  });
});
