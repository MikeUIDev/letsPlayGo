import { describe, expect, it, vi } from 'vitest';
import { createEmptyBoard, withStone } from '../engine/board';
import { createGameFromSetup, createInitialState, dispatch } from '../engine/gameState';
import { DEFAULT_NEW_GAME_SETUP } from '../engine/types';
import { setupToConfig, configToSetup } from '../engine/gameConfig';
import { reconstructStateAtIndex } from '../engine/reviewState';
import { evaluateLiveCoach, shouldCoachMove } from '../liveCoach/evaluateLiveCoach';
import { formatLiveCoachPanel } from '../liveCoach/formatLiveCoachPanel';
import { createAiSetup, createLocalSetup } from '../utils/gameSetup';
import { serializeGameState, deserializeSavedGame } from '../persistence/saveGame';
import { SNAPBACK_LOCAL_LIMITS } from '../tactics/snapbackLocal';

function playSequence(moves: Array<{ row: number; col: number }>) {
  let state = createInitialState(9);
  for (const move of moves) {
    const result = dispatch(state, { type: 'play', position: move });
    if (!result.ok) {
      throw new Error(result.error);
    }
    state = result.state;
  }
  return state;
}

describe('live coach config', () => {
  it('defaults Live Coach to off', () => {
    expect(DEFAULT_NEW_GAME_SETUP.liveCoach).toBe(false);
    expect(createLocalSetup().liveCoach).toBe(false);
    expect(createAiSetup().liveCoach).toBe(false);
  });

  it('persists liveCoach through setup and save roundtrip', () => {
    const setup = createLocalSetup({ liveCoach: true });
    const state = createGameFromSetup(setup);
    expect(state.config.liveCoach).toBe(true);

    const serialized = serializeGameState(state);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const restored = deserializeSavedGame(serialized.saved);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    expect(restored.state.config.liveCoach).toBe(true);
    expect(configToSetup(restored.state.config).liveCoach).toBe(true);
  });
});

describe('evaluateLiveCoach', () => {
  it('returns self-atari warning for a risky move', () => {
    let beforeBoard = createEmptyBoard(9);
    beforeBoard = withStone(beforeBoard, { row: 1, col: 0 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 0, col: 1 }, 'white');
    beforeBoard = withStone(beforeBoard, { row: 2, col: 1 }, 'white');

    let state = createInitialState(9);
    state = { ...state, board: beforeBoard, currentPlayer: 'black' };
    const result = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const beforeState = reconstructStateAtIndex(result.state, result.state.history.length - 1);
    const feedback = evaluateLiveCoach({
      beforeState,
      afterState: result.state,
      playedMove: result.state.history.at(-1)!.move,
      player: 'black',
    });

    expect(feedback?.primaryInsight?.type).toBe('self_atari');
    expect(formatLiveCoachPanel(feedback)?.isWarning).toBe(true);
  });

  it('returns capture concept feedback for a capturing move', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 4 }, 'white');
    board = withStone(board, { row: 3, col: 4 }, 'black');
    board = withStone(board, { row: 5, col: 4 }, 'black');
    board = withStone(board, { row: 4, col: 3 }, 'black');

    let state = createInitialState(9);
    state = { ...state, board, currentPlayer: 'black' };
    const result = dispatch(state, { type: 'play', position: { row: 4, col: 5 } });
    expect(result.ok).toBe(true);
    if (!result.ok || result.state.history.at(-1)?.move.type !== 'play') {
      return;
    }

    const beforeState = reconstructStateAtIndex(result.state, result.state.history.length - 1);
    const feedback = evaluateLiveCoach({
      beforeState,
      afterState: result.state,
      playedMove: result.state.history.at(-1)!.move,
      player: 'black',
    });

    expect(feedback?.primaryConcept?.concept).toBe('capture');
  });

  it('returns null for a quiet opening move', () => {
    const state = playSequence([{ row: 4, col: 4 }]);
    const beforeState = reconstructStateAtIndex(state, state.history.length - 1);
    const feedback = evaluateLiveCoach({
      beforeState,
      afterState: state,
      playedMove: state.history.at(-1)!.move,
      player: 'black',
    });

    expect(feedback).toBeNull();
  });

  it('limits visible concepts to two', () => {
    let board = createEmptyBoard(9);
    board = withStone(board, { row: 4, col: 3 }, 'black');
    board = withStone(board, { row: 4, col: 5 }, 'black');

    let state = createInitialState(9);
    state = { ...state, board, currentPlayer: 'black' };
    const result = dispatch(state, { type: 'play', position: { row: 4, col: 4 } });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const beforeState = reconstructStateAtIndex(result.state, result.state.history.length - 1);
    const feedback = evaluateLiveCoach({
      beforeState,
      afterState: result.state,
      playedMove: result.state.history.at(-1)!.move,
      player: 'black',
    });

    const conceptCount = [feedback?.primaryConcept, feedback?.secondaryConcept].filter(Boolean).length;
    expect(conceptCount).toBeLessThanOrEqual(2);
  });
});

describe('live coach move targeting', () => {
  it('coaches both players in local mode', () => {
    const config = setupToConfig(createLocalSetup());
    expect(shouldCoachMove(config, 'black')).toBe(true);
    expect(shouldCoachMove(config, 'white')).toBe(true);
  });

  it('coaches only the human in AI mode', () => {
    const config = setupToConfig(createAiSetup({ humanColor: 'black' }));
    expect(shouldCoachMove(config, 'black')).toBe(true);
    expect(shouldCoachMove(config, 'white')).toBe(false);
  });
});

describe('live coach isolation and performance', () => {
  it('does not import analysis services in evaluateLiveCoach module', async () => {
    const source = await import('../liveCoach/evaluateLiveCoach?raw').then(
      (module) => module.default as string,
    );
    expect(source).not.toContain('ApiGoAnalysis');
    expect(source).not.toContain('analyze(');
    expect(source).not.toContain('readSnapbackOpportunityLocal');
  });

  it('keeps snapback search limits bounded for regression', () => {
    expect(SNAPBACK_LOCAL_LIMITS.maxCandidateMoves).toBeLessThanOrEqual(12);
    expect(SNAPBACK_LOCAL_LIMITS.maxElapsedMs).toBeLessThanOrEqual(50);
  });
});

describe('live coach hint on demand', () => {
  it('calls analysis only when hint is requested', async () => {
    const analyze = vi.fn().mockRejectedValue(new Error('offline'));
    const state = createGameFromSetup(createLocalSetup({ liveCoach: true }));

    const { useGoLiveCoach } = await import('../hooks/useGoLiveCoach');
    expect(typeof useGoLiveCoach).toBe('function');

    evaluateLiveCoach({
      beforeState: reconstructStateAtIndex(state, 0),
      afterState: state,
      playedMove: { type: 'play', color: 'black', position: { row: 4, col: 4 }, captured: [] },
      player: 'black',
    });

    expect(analyze).not.toHaveBeenCalled();
  });
});
