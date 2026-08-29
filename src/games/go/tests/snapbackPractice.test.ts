import { describe, expect, it, vi } from 'vitest';
import { createEmptyBoard, withStone } from '../engine/board';
import { createSimulationState } from '../tactics/simulate';
import { dispatch } from '../engine/gameState';
import * as legalMoves from '../engine/legalMoves';
import { buildPuzzleState, pos } from '../practice/buildState';
import { getPuzzleById } from '../practice/puzzles';
import {
  SNAPBACK_LOCAL_LIMITS,
  getLocalCandidateMoves,
  readSnapbackOpportunityLocal,
} from '../tactics/snapbackLocal';
import { verifySnapbackPuzzle, validateSnapbackRecaptureMove } from '../practice/snapbackValidation';
import { validatePuzzleMove } from '../practice/validate';
import { buildSnapbackRecaptureDemoState } from '../tutorial/snapbackLessonState';
import type { PuzzleValidation } from '../practice/types';

function firstPlayValidation(puzzle: { solution: Array<{ type: string; validation?: PuzzleValidation }> }): PuzzleValidation {
  const step = puzzle.solution[0];
  if (step.type !== 'play' || !step.validation) {
    throw new Error('expected first solution step to be a play validation');
  }
  return step.validation;
}

describe('snapback puzzle validation', () => {
  it('verifies curated snapback puzzle data', () => {
    const puzzle = getPuzzleById('snapback-h1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const verification = verifySnapbackPuzzle(puzzle);
    expect(verification.ok, verification.errors.join('; ')).toBe(true);
  });

  it('accepts the scripted snapback recapture through engine and detector', () => {
    const puzzle = getPuzzleById('snapback-h1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    const result = dispatch(state, { type: 'play', position: pos(2, 2) });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.history.at(-1)?.move.type !== 'play') {
      return;
    }

    const move = result.state.history.at(-1)!.move;
    expect(move.type).toBe('play');
    if (move.type !== 'play') {
      return;
    }

    expect(move.captured.length).toBeGreaterThanOrEqual(2);
    expect(
      validateSnapbackRecaptureMove(
        state,
        result.state,
        move,
        { kind: 'snapback-recapture', minStones: 2 },
        'black',
      ).ok,
    ).toBe(true);
    expect(
      validatePuzzleMove(
        state,
        result.state,
        move,
        firstPlayValidation(puzzle),
        'black',
      ).ok,
    ).toBe(true);
  });

  it('rejects an ordinary recapture that only takes one stone', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, pos(4, 4), 'white');
    board = withStone(board, pos(3, 4), 'black');
    board = withStone(board, pos(5, 4), 'black');
    board = withStone(board, pos(4, 3), 'black');
    const state = createSimulationState(board, 'black');
    const result = dispatch(state, { type: 'play', position: pos(4, 5) });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.history.at(-1)?.move.type !== 'play') {
      return;
    }

    expect(
      validateSnapbackRecaptureMove(
        state,
        result.state,
        result.state.history.at(-1)!.move,
        { kind: 'snapback-recapture', minStones: 2 },
        'black',
      ).ok,
    ).toBe(false);
  });
});

describe('bounded snapback local search', () => {
  it('caps candidate moves near the sacrifice point', () => {
    const state = buildSnapbackRecaptureDemoState();
    const candidates = getLocalCandidateMoves(state, pos(2, 2), 3, 12);
    expect(candidates.length).toBeLessThanOrEqual(12);
    for (const candidate of candidates) {
      expect(Math.abs(candidate.row - 2) + Math.abs(candidate.col - 2)).toBeLessThanOrEqual(3);
    }
  });

  it('completes local snapback search quickly without scanning the full board', () => {
    const state = buildSnapbackRecaptureDemoState();
    const sacrifice = state.history[0]?.move;
    expect(sacrifice?.type).toBe('play');

    const getLegalMovesSpy = vi.spyOn(legalMoves, 'getLegalMoves');

    const started = performance.now();
    const read = readSnapbackOpportunityLocal(state, sacrifice!, {
      maxCandidateMoves: 12,
      localRadius: 3,
      maxElapsedMs: 50,
    });
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(100);
    expect(read.outcome === 'success' || read.outcome === 'unknown').toBe(true);
    expect(getLegalMovesSpy).not.toHaveBeenCalled();

    getLegalMovesSpy.mockRestore();
  });

  it('returns unknown when the time budget is exhausted immediately', () => {
    const state = buildSnapbackRecaptureDemoState();
    const sacrifice = state.history[0]?.move;
    expect(sacrifice?.type).toBe('play');

    const read = readSnapbackOpportunityLocal(state, sacrifice!, { maxElapsedMs: 0 });
    expect(read.outcome).toBe('unknown');
  });

  it('documents aggressive snapback limits for regression', () => {
    expect(SNAPBACK_LOCAL_LIMITS.maxPlies).toBeLessThanOrEqual(4);
    expect(SNAPBACK_LOCAL_LIMITS.maxCandidateMoves).toBeLessThanOrEqual(12);
    expect(SNAPBACK_LOCAL_LIMITS.localRadius).toBeLessThanOrEqual(3);
    expect(SNAPBACK_LOCAL_LIMITS.maxElapsedMs).toBeLessThanOrEqual(50);
  });
});
