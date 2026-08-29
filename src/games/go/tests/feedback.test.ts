import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { createGameFromSetup, dispatch } from '../engine/gameState';
import {
  DEFAULT_FEEDBACK_PREFERENCES,
  getMoveFeedbackEvent,
  loadFeedbackPreferences,
  notifyGameplayMove,
  playGameFeedback,
  resetFeedbackCooldownForTests,
  saveFeedbackPreferences,
} from '../feedback';
import * as synthesizeSounds from '../feedback/synthesizeSounds';
import { buildPuzzleState, pos } from '../practice/buildState';
import { getPuzzleById } from '../practice/puzzles';
import { createLocalSetup } from '../utils/gameSetup';

describe('feedback preferences', () => {
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
    resetFeedbackCooldownForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults sound and haptics to enabled', () => {
    expect(loadFeedbackPreferences()).toEqual(DEFAULT_FEEDBACK_PREFERENCES);
  });

  it('persists independent sound and haptics toggles', () => {
    saveFeedbackPreferences({ sound: false, haptics: true });
    expect(loadFeedbackPreferences()).toEqual({ sound: false, haptics: true });

    saveFeedbackPreferences({ sound: true, haptics: false });
    expect(loadFeedbackPreferences()).toEqual({ sound: true, haptics: false });
  });
});

describe('move feedback mapping', () => {
  it('detects placement vs capture from move history', () => {
    const before = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const placed = dispatch(before, { type: 'play', position: { row: 2, col: 2 } });
    expect(placed.ok).toBe(true);
    if (!placed.ok) {
      return;
    }

    expect(getMoveFeedbackEvent(before, placed.state)).toBe('place');

    const puzzle = getPuzzleById('capture-e1');
    expect(puzzle).toBeDefined();
    if (!puzzle) {
      return;
    }

    const captureBefore = buildPuzzleState(puzzle);
    const capture = dispatch(captureBefore, { type: 'play', position: pos(4, 5) });
    expect(capture.ok).toBe(true);
    if (!capture.ok) {
      return;
    }

    expect(getMoveFeedbackEvent(captureBefore, capture.state)).toBe('capture');
  });
});

describe('feedback cooldown', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    storage.clear();
    resetFeedbackCooldownForTests();
    saveFeedbackPreferences({ sound: true, haptics: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('debounces rapid repeated feedback', () => {
    const playSpy = vi.spyOn(synthesizeSounds, 'synthesizePlacementSound').mockImplementation(() => undefined);

    playGameFeedback('place');
    playGameFeedback('place');
    playGameFeedback('place');

    expect(playSpy.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe('gameplay move notification', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    storage.clear();
    resetFeedbackCooldownForTests();
    saveFeedbackPreferences({ sound: true, haptics: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ignores unchanged history', () => {
    const state = createGameFromSetup(createLocalSetup({ size: 9, komi: 6.5, firstPlayer: 'black' }));
    const playSpy = vi.spyOn(synthesizeSounds, 'synthesizePlacementSound').mockImplementation(() => undefined);

    notifyGameplayMove(state, state);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('skips sound when disabled in preferences', () => {
    saveFeedbackPreferences({ sound: false, haptics: false });
    resetFeedbackCooldownForTests();

    const playSpy = vi.spyOn(synthesizeSounds, 'synthesizePlacementSound').mockImplementation(() => undefined);
    playGameFeedback('place');
    expect(playSpy).not.toHaveBeenCalled();
  });
});
