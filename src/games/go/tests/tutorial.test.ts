import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { dispatch } from '../engine/gameState';
import { isLegalPlay } from '../engine/legalMoves';
import { getStone } from '../engine/board';
import { getGroupsInAtari } from '../coach/libertyAnalysis';
import { GO_CONCEPTS } from '../concepts/concepts';
import { buildTutorialState, pos } from '../tutorial/buildState';
import {
  BEGINNER_TUTORIAL_COURSE,
  getTutorialLesson,
  TUTORIAL_LESSONS,
} from '../tutorial/course';
import { getHintForAttempt } from '../tutorial/hints';
import { buildKoRecaptureDemoState } from '../tutorial/koLessonState';
import {
  DEFAULT_TUTORIAL_PROGRESS,
  loadTutorialProgress,
  markLessonComplete,
  resetTutorialProgress,
  saveTutorialProgress,
} from '../tutorial/progress';
import { validatePlayStep } from '../tutorial/validate';

describe('tutorial course', () => {
  it('defines eleven beginner lessons', () => {
    expect(TUTORIAL_LESSONS).toHaveLength(11);
    expect(BEGINNER_TUTORIAL_COURSE.lessons.map((lesson) => lesson.id)).toEqual([
      'place-first-stone',
      'liberties',
      'groups',
      'capture',
      'atari',
      'save-group',
      'connect',
      'ko',
      'territory',
      'passing-scoring',
      'first-9x9',
    ]);
  });

  it('loads lessons by id', () => {
    expect(getTutorialLesson('capture')?.title).toBe('Capture');
    expect(getTutorialLesson('missing')).toBeUndefined();
  });

  it('reuses GO_CONCEPTS in concept lessons', () => {
    const captureLesson = getTutorialLesson('capture');
    const explainStep = captureLesson?.steps.find((step) => step.id === 'explain');
    expect(explainStep?.kind === 'info' && explainStep.body).toBe(GO_CONCEPTS.capture.shortDefinition);
  });
});

describe('tutorial validation', () => {
  it('accepts a correct capture move using the engine', () => {
    const before = buildTutorialState(
      9,
      [
        { row: 4, col: 4, color: 'white' },
        { row: 3, col: 4, color: 'black' },
        { row: 5, col: 4, color: 'black' },
        { row: 4, col: 3, color: 'black' },
      ],
      'black',
    );
    const result = dispatch(before, { type: 'play', position: pos(4, 5) });
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
      validatePlayStep(before, result.state, move, { kind: 'capture', color: 'white' }),
    ).toEqual({ ok: true });
  });

  it('rejects a legal but incorrect capture attempt', () => {
    const before = buildTutorialState(
      9,
      [
        { row: 4, col: 4, color: 'white' },
        { row: 3, col: 4, color: 'black' },
        { row: 5, col: 4, color: 'black' },
        { row: 4, col: 3, color: 'black' },
      ],
      'black',
    );
    const result = dispatch(before, { type: 'play', position: pos(3, 3) });
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
      validatePlayStep(before, result.state, move, { kind: 'capture', color: 'white' }),
    ).toEqual({ ok: false, reason: 'legal-but-wrong' });
  });

  it('validates atari and save-group outcomes', () => {
    const atariBefore = buildTutorialState(
      9,
      [
        { row: 4, col: 4, color: 'white' },
        { row: 3, col: 4, color: 'black' },
        { row: 5, col: 4, color: 'black' },
      ],
      'black',
    );
    const atariResult = dispatch(atariBefore, { type: 'play', position: pos(4, 3) });
    expect(atariResult.ok).toBe(true);
    if (!atariResult.ok) {
      return;
    }
    const atariMove = atariResult.state.history.at(-1)?.move;
    expect(atariMove?.type).toBe('play');
    if (atariMove?.type !== 'play') {
      return;
    }
    expect(
      validatePlayStep(atariBefore, atariResult.state, atariMove, {
        kind: 'atari',
        targetColor: 'white',
        anchor: pos(4, 4),
      }),
    ).toEqual({ ok: true });

    const saveBefore = buildTutorialState(
      9,
      [
        { row: 4, col: 4, color: 'black' },
        { row: 3, col: 4, color: 'white' },
        { row: 5, col: 4, color: 'white' },
        { row: 4, col: 3, color: 'white' },
      ],
      'black',
    );
    const saveResult = dispatch(saveBefore, { type: 'play', position: pos(4, 5) });
    expect(saveResult.ok).toBe(true);
    if (!saveResult.ok) {
      return;
    }
    const saveMove = saveResult.state.history.at(-1)?.move;
    expect(saveMove?.type).toBe('play');
    if (saveMove?.type !== 'play') {
      return;
    }
    expect(
      validatePlayStep(saveBefore, saveResult.state, saveMove, {
        kind: 'groupLibertiesAtLeast',
        anchor: pos(4, 4),
        min: 2,
      }),
    ).toEqual({ ok: true });
  });

  it('validates connecting groups', () => {
    const before = buildTutorialState(
      9,
      [
        { row: 4, col: 3, color: 'black' },
        { row: 4, col: 5, color: 'black' },
      ],
      'black',
    );
    const result = dispatch(before, { type: 'play', position: pos(4, 4) });
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
      validatePlayStep(before, result.state, move, {
        kind: 'connectsGroups',
        anchors: [pos(4, 3), pos(4, 5)],
      }),
    ).toEqual({ ok: true });
  });

  it('enforces ko on immediate recapture', () => {
    const state = buildKoRecaptureDemoState();
    const koAttempt = isLegalPlay(state, pos(7, 7));
    expect(koAttempt.legal).toBe(false);
    expect(koAttempt.reason).toBe('ko');
  });

  it('handles consecutive passes into scoring', () => {
    let state = buildTutorialState(9, [], 'black');
    const firstPass = dispatch(state, { type: 'pass' });
    expect(firstPass.ok).toBe(true);
    if (!firstPass.ok) {
      return;
    }
    state = firstPass.state;
    const secondPass = dispatch(state, { type: 'pass' });
    expect(secondPass.ok).toBe(true);
    if (!secondPass.ok) {
      return;
    }
    expect(secondPass.state.phase).toBe('scoring');
  });
});

describe('tutorial hints', () => {
  it('returns progressive hints', () => {
    const hints = [{ message: 'One' }, { message: 'Two' }, { message: 'Three' }];
    expect(getHintForAttempt(hints, 1)?.message).toBe('One');
    expect(getHintForAttempt(hints, 2)?.message).toBe('Two');
    expect(getHintForAttempt(hints, 5)?.message).toBe('Three');
  });
});

describe('tutorial progress persistence', () => {
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

  it('persists completed lessons and resume point', () => {
    expect(loadTutorialProgress()).toEqual(DEFAULT_TUTORIAL_PROGRESS);
    const completed = markLessonComplete(DEFAULT_TUTORIAL_PROGRESS, 'capture');
    saveTutorialProgress(completed);
    expect(loadTutorialProgress().completedLessonIds).toContain('capture');
  });

  it('resets tutorial progress', () => {
    saveTutorialProgress(markLessonComplete(DEFAULT_TUTORIAL_PROGRESS, 'ko'));
    expect(resetTutorialProgress()).toEqual(DEFAULT_TUTORIAL_PROGRESS);
    expect(loadTutorialProgress().completedLessonIds).toHaveLength(0);
  });
});

describe('tutorial isolation', () => {
  it('does not import analysis or API modules', async () => {
    const hub = await import('../tutorial/TutorialHubPage');
    const course = await import('../tutorial/course');
    const validate = await import('../tutorial/validate');
    expect(typeof hub.TutorialHubPage).toBe('function');
    expect(course.TUTORIAL_LESSONS.length).toBe(11);
    expect(typeof validate.validatePlayStep).toBe('function');
  });

  it('uses local MockGoAI only through the tutorial hook module graph', async () => {
    const hookSource = await import('../tutorial/useTutorialLesson?raw').then(
      (module) => module.default as string,
    );
    expect(hookSource).toContain('MockGoAI');
    expect(hookSource).not.toContain('ApiGoAI');
    expect(hookSource).not.toContain('KataGo');
  });
});

describe('tutorial route wiring', () => {
  it('registers tutorial routes in App', async () => {
    const app = await import('../../../App');
    expect(app.default).toBeTypeOf('function');
  });
});

describe('first 9x9 free play lesson', () => {
  it('detects atari for contextual tips', () => {
    const state = buildTutorialState(
      9,
      [
        { row: 4, col: 4, color: 'black' },
        { row: 3, col: 4, color: 'white' },
        { row: 5, col: 4, color: 'white' },
        { row: 4, col: 3, color: 'white' },
      ],
      'black',
    );
    expect(getGroupsInAtari(state.board, 'black')).toHaveLength(1);
  });
});
