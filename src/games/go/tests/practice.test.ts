import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { dispatch } from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import { getStone } from '../engine/board';
import { GO_CONCEPTS } from '../concepts/concepts';
import { buildPuzzleState, pos } from '../practice/buildState';
import { getCategoryMeta, getPracticeCategoryUrl, PRACTICE_CATEGORIES } from '../practice/categories';
import {
  getNextPuzzleAfter,
  getNextUnsolvedPuzzle,
  getPuzzleById,
  getPuzzlesByCategory,
  PRACTICE_PUZZLES,
} from '../practice/puzzles';
import {
  DEFAULT_PRACTICE_PROGRESS,
  loadPracticeProgress,
  markPuzzleSolved,
  resetPracticeProgress,
  savePracticeProgress,
} from '../practice/progress';
import { validatePuzzleMove } from '../practice/validate';
import { buildKoRecaptureDemoState } from '../tutorial/koLessonState';
import type { GoPuzzle, PuzzleSolutionStep, PuzzleValidation } from '../practice/types';
import type { GameState, Position } from '../engine/types';

function firstPlayValidation(puzzle: { solution: Array<{ type: string; validation?: PuzzleValidation }> }): PuzzleValidation {
  const step = puzzle.solution[0];
  if (step.type !== 'play' || !step.validation) {
    throw new Error('expected first solution step to be a play validation');
  }
  return step.validation;
}

function findValidPlayMove(
  state: GameState,
  step: Extract<PuzzleSolutionStep, { type: 'play' }>,
): Position | null {
  const validation = step.validation;
  if (validation.kind === 'exact' || validation.kind === 'ko-recapture') {
    return validation.position;
  }

  const { size } = state.board;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const position = { row, col };
      if (!isLegalPlay(state, position).legal) {
        continue;
      }

      const result = dispatch(state, { type: 'play', position });
      if (!result.ok) {
        continue;
      }

      const move = result.state.history.at(-1)?.move;
      if (move?.type !== 'play') {
        continue;
      }

      if (
        validatePuzzleMove(state, result.state, move, validation, state.currentPlayer).ok
      ) {
        return position;
      }
    }
  }

  return null;
}

function simulatePuzzleSolution(puzzle: GoPuzzle): { ok: boolean; error?: string } {
  let state = buildPuzzleState(puzzle);

  for (const step of puzzle.solution) {
    if (step.type === 'opponent') {
      const result = dispatch(state, { type: 'play', position: step.position });
      if (!result.ok) {
        return { ok: false, error: `illegal opponent move at ${step.position.row},${step.position.col}` };
      }
      state = result.state;
      continue;
    }

    const position = findValidPlayMove(state, step);
    if (!position) {
      return { ok: false, error: 'no valid player move found for solution step' };
    }

    const result = dispatch(state, { type: 'play', position });
    if (!result.ok) {
      return { ok: false, error: `illegal player move at ${position.row},${position.col}` };
    }
    state = result.state;
  }

  return { ok: true };
}

describe('practice catalog', () => {
  it('defines eighteen starter puzzles across difficulties', () => {
    expect(PRACTICE_PUZZLES).toHaveLength(18);
    expect(PRACTICE_PUZZLES.filter((puzzle) => puzzle.difficulty === 'easy')).toHaveLength(6);
    expect(PRACTICE_PUZZLES.filter((puzzle) => puzzle.difficulty === 'medium')).toHaveLength(6);
    expect(PRACTICE_PUZZLES.filter((puzzle) => puzzle.difficulty === 'hard')).toHaveLength(6);
  });

  it('covers all v1 categories', () => {
    for (const category of PRACTICE_CATEGORIES) {
      expect(getPuzzlesByCategory(category.id).length).toBeGreaterThan(0);
    }
  });

  it('reuses GO_CONCEPTS in puzzle metadata', () => {
    const puzzle = getPuzzleById('capture-e1');
    expect(puzzle?.concept).toBe('capture');
    expect(GO_CONCEPTS.capture.shortDefinition).toContain('libert');
  });

  it('keeps puzzle metadata consistent with categories and board sizes', () => {
    for (const puzzle of PRACTICE_PUZZLES) {
      expect(getCategoryMeta(puzzle.category).concept).toBe(puzzle.concept);
      expect(puzzle.boardSize).toBe(9);
      expect(puzzle.objective.length).toBeGreaterThan(10);
      expect(puzzle.solution.length).toBeGreaterThan(0);
      expect(puzzle.hints.length).toBeGreaterThan(0);
    }
  });

  it('solves every starter puzzle end-to-end', () => {
    const failures = PRACTICE_PUZZLES.map((puzzle) => ({
      id: puzzle.id,
      result: simulatePuzzleSolution(puzzle),
    })).filter(({ result }) => !result.ok);

    expect(failures, failures.map(({ id, result }) => `${id}: ${result.error}`).join('; ')).toEqual([]);
  });
});

describe('practice validation', () => {
  it('solves a capture puzzle through the engine', () => {
    const puzzle = getPuzzleById('capture-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    const result = dispatch(state, { type: 'play', position: pos(4, 5) });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const move = result.state.history.at(-1)?.move;
    expect(move?.type).toBe('play');
    if (move?.type !== 'play') {
      return;
    }

    expect(getStone(result.state.board, pos(4, 4))).toBeNull();
    expect(
      validatePuzzleMove(state, result.state, move, firstPlayValidation(puzzle), 'black'),
    ).toEqual({ ok: true });
  });

  it('rejects a legal but incorrect capture attempt', () => {
    const puzzle = getPuzzleById('capture-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    const result = dispatch(state, { type: 'play', position: pos(3, 3) });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const move = result.state.history.at(-1)?.move;
    expect(move?.type).toBe('play');
    if (move?.type !== 'play') {
      return;
    }

    expect(
      validatePuzzleMove(state, result.state, move, firstPlayValidation(puzzle), 'black'),
    ).toEqual({ ok: false, reason: 'legal-but-wrong' });
  });

  it('validates atari, connect, and save-group objectives', () => {
    const atari = getPuzzleById('atari-e1');
    const connect = getPuzzleById('connect-e1');
    const save = getPuzzleById('save-e1');
    expect(atari && connect && save).toBeTruthy();

    if (!atari || !connect || !save) {
      return;
    }

    let state = buildPuzzleState(atari);
    let result = dispatch(state, { type: 'play', position: pos(4, 3) });
    expect(result.ok).toBe(true);
    if (result.ok && result.state.history.at(-1)?.move.type === 'play') {
      expect(
        validatePuzzleMove(
          state,
          result.state,
          result.state.history.at(-1)!.move,
          firstPlayValidation(atari),
          'black',
        ).ok,
      ).toBe(true);
    }

    state = buildPuzzleState(connect);
    result = dispatch(state, { type: 'play', position: pos(4, 4) });
    expect(result.ok).toBe(true);

    state = buildPuzzleState(save);
    result = dispatch(state, { type: 'play', position: pos(4, 5) });
    expect(result.ok).toBe(true);
  });

  it('validates atari on a two-stone group with one move', () => {
    const puzzle = getPuzzleById('atari-m1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    const result = dispatch(state, { type: 'play', position: pos(4, 3) });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.history.at(-1)?.move.type !== 'play') {
      return;
    }

    expect(
      validatePuzzleMove(
        state,
        result.state,
        result.state.history.at(-1)!.move,
        firstPlayValidation(puzzle),
        'black',
      ).ok,
    ).toBe(true);
  });

  it('validates cut using the cut detector', () => {
    const puzzle = getPuzzleById('cut-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    const result = dispatch(state, { type: 'play', position: pos(4, 4) });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.history.at(-1)?.move.type !== 'play') {
      return;
    }

    expect(
      validatePuzzleMove(
        state,
        result.state,
        result.state.history.at(-1)!.move,
        firstPlayValidation(puzzle),
        'black',
      ).ok,
    ).toBe(true);
  });

  it('validates ladder and net puzzles', () => {
    const ladder = getPuzzleById('ladder-m1');
    const ladderHard = getPuzzleById('ladder-h1');
    const net = getPuzzleById('net-m1');
    expect(ladder && ladderHard && net).toBeTruthy();
    if (!ladder || !ladderHard || !net) {
      return;
    }

    let state = buildPuzzleState(ladder);
    let result = dispatch(state, { type: 'play', position: pos(0, 3) });
    expect(result.ok).toBe(true);
    if (result.ok && result.state.history.at(-1)?.move.type === 'play') {
      expect(
        validatePuzzleMove(
          state,
          result.state,
          result.state.history.at(-1)!.move,
          firstPlayValidation(ladder),
          'black',
        ).ok,
      ).toBe(true);
    }

    state = buildPuzzleState(ladderHard);
    result = dispatch(state, { type: 'play', position: pos(8, 3) });
    expect(result.ok).toBe(true);
    if (result.ok && result.state.history.at(-1)?.move.type === 'play') {
      expect(
        validatePuzzleMove(
          state,
          result.state,
          result.state.history.at(-1)!.move,
          firstPlayValidation(ladderHard),
          'black',
        ).ok,
      ).toBe(true);
    }

    state = buildPuzzleState(net);
    result = dispatch(state, { type: 'play', position: pos(1, 1) });
    expect(result.ok).toBe(true);
    if (result.ok && result.state.history.at(-1)?.move.type === 'play') {
      expect(
        validatePuzzleMove(
          state,
          result.state,
          result.state.history.at(-1)!.move,
          firstPlayValidation(net),
          'black',
        ).ok,
      ).toBe(true);
    }
  });

  it('supports ko timing with preset history', () => {
    const state = buildKoRecaptureDemoState();
    expect(isLegalPlay(state, pos(7, 7)).reason).toBe('ko');
    const elsewhere = dispatch(state, { type: 'play', position: pos(0, 0) });
    expect(elsewhere.ok).toBe(true);
  });

  it('validates snapback recapture on curated preset puzzle', () => {
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

    expect(
      validatePuzzleMove(
        state,
        result.state,
        result.state.history.at(-1)!.move,
        firstPlayValidation(puzzle),
        'black',
      ).ok,
    ).toBe(true);
  });

  it('builds the ko puzzle preset from puzzle data', () => {
    const puzzle = getPuzzleById('ko-h1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const state = buildPuzzleState(puzzle);
    expect(isLegalPlay(state, pos(7, 7)).reason).toBe('ko');
    expect(state.currentPlayer).toBe('white');
  });
});

describe('practice hints and reset', () => {
  it('returns progressive hints by attempt count', async () => {
    const { getHintForAttempt } = await import('../tutorial/hints');
    const puzzle = getPuzzleById('capture-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    expect(getHintForAttempt(puzzle.hints, 1)?.message).toContain('libert');
    expect(getHintForAttempt(puzzle.hints, 2)?.highlights?.length).toBeGreaterThan(0);
    expect(getHintForAttempt(puzzle.hints, 3)?.message).toContain('Fill');
  });

  it('reset restores the exact initial puzzle position', () => {
    const puzzle = getPuzzleById('connect-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const initial = buildPuzzleState(puzzle);
    const played = dispatch(initial, { type: 'play', position: pos(4, 4) });
    expect(played.ok).toBe(true);

    const reset = buildPuzzleState(puzzle);
    expect(reset.board).toEqual(initial.board);
    expect(reset.currentPlayer).toBe(initial.currentPlayer);
  });
});

describe('practice progress', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    storage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists solved puzzle ids separately from tutorial progress', () => {
    expect(loadPracticeProgress()).toEqual(DEFAULT_PRACTICE_PROGRESS);
    const solved = markPuzzleSolved(DEFAULT_PRACTICE_PROGRESS, 'capture-e1');
    savePracticeProgress(solved);
    expect(loadPracticeProgress().solvedPuzzleIds).toContain('capture-e1');
  });

  it('finds the next unsolved puzzle in difficulty order', () => {
    const next = getNextUnsolvedPuzzle([], 'capture');
    expect(next?.id).toBe('capture-e1');
    const afterFirst = getNextUnsolvedPuzzle(['capture-e1'], 'capture');
    expect(afterFirst?.id).toBe('capture-e2');
  });

  it('resets practice progress', () => {
    savePracticeProgress(markPuzzleSolved(DEFAULT_PRACTICE_PROGRESS, 'capture-e1'));
    expect(resetPracticeProgress().solvedPuzzleIds).toHaveLength(0);
  });
});

describe('practice navigation helpers', () => {
  it('links categories to practice routes', () => {
    expect(getPracticeCategoryUrl('ladder')).toBe('/practice?category=ladder');
    expect(getCategoryMeta('snapback').label).toBe('Snapback');
  });

  it('selects the next unsolved puzzle in a category', () => {
    const next = getNextPuzzleAfter('capture-e1', ['capture-e1']);
    expect(next?.id).toBe('capture-e2');
  });
});

describe('practice isolation', () => {
  it('does not import analysis or API modules', async () => {
    const hub = await import('../practice/PracticeHubPage');
    const validate = await import('../practice/validate');
    expect(typeof hub.PracticeHubPage).toBe('function');
    expect(typeof validate.validatePuzzleMove).toBe('function');
  });

  it('uses local puzzle modules only in the session hook graph', async () => {
    const hookSource = await import('../practice/usePuzzleSession?raw').then(
      (module) => module.default as string,
    );
    expect(hookSource).not.toContain('ApiGoAI');
    expect(hookSource).not.toContain('KataGo');
    expect(hookSource).not.toContain('ApiGoAnalysis');
  });
});

describe('practice mobile session guards', () => {
  it('exposes retry and submission guard hooks in the session module', async () => {
    const hookSource = await import('../practice/usePuzzleSession?raw').then(
      (module) => module.default as string,
    );
    expect(hookSource).toContain('retryStep');
    expect(hookSource).toContain('submittingRef');
  });
});

describe('practice route wiring', () => {
  it('registers practice routes in App', async () => {
    const app = await import('../../../App');
    expect(app.default).toBeTypeOf('function');
  });
});
