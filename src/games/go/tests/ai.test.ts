import { describe, expect, it, vi } from 'vitest';
import { MockGoAI } from '../ai/MockGoAI';
import { createAiRequestCoordinator } from '../ai/requestCoordinator';
import type { GoAI, GenerateMoveRequest, GenerateMoveResult } from '../ai/types';
import { undoForGameMode } from '../ai/undoAi';
import {
  getStartingPlayer,
  isAiTurn,
  isHumanTurn,
  setupToConfig,
} from '../engine/gameConfig';
import { createGameFromSetup, dispatch, getMoveList } from '../engine/gameState';
import type { GameState } from '../engine/types';
import * as legalMoves from '../engine/legalMoves';
import { positionKey } from '../engine/board';
import {
  deserializeSavedGame,
  serializeGameState,
} from '../persistence/saveGame';
import { LEGACY_SAVED_GAME_VERSION, SAVED_GAME_VERSION } from '../persistence/types';
import { DEFAULT_AI_DIFFICULTY } from '../engine/aiDifficulty';
import { createAiSetup, createLocalSetup } from '../utils/gameSetup';

function aiRequestFromState(state: GameState): GenerateMoveRequest {
  return {
    boardSize: state.config.size,
    komi: state.config.komi,
    colorToMove: state.currentPlayer,
    difficulty: state.config.mode === 'ai' ? state.config.difficulty : DEFAULT_AI_DIFFICULTY,
    moves: getMoveList(state),
    state,
  };
}

class ControllableGoAI implements GoAI {
  pending: Array<(result: GenerateMoveResult) => void> = [];
  calls = 0;

  generateMove(_request: GenerateMoveRequest): Promise<GenerateMoveResult> {
    this.calls += 1;
    return new Promise((resolve) => {
      this.pending.push(resolve);
    });
  }

  resolveNext(result: GenerateMoveResult): void {
    const resolve = this.pending.shift();
    if (!resolve) throw new Error('no pending AI request');
    resolve(result);
  }
}

describe('GameConfig', () => {
  it('supports local two-player configuration', () => {
    const setup = createLocalSetup({ firstPlayer: 'white', size: 13, komi: 7.5 });
    const state = createGameFromSetup(setup);

    expect(state.config).toEqual({
      mode: 'local',
      size: 13,
      komi: 7.5,
      firstPlayer: 'white',
    });
    expect(state.currentPlayer).toBe('white');
  });

  it('supports AI configuration with human Black', () => {
    const setup = createAiSetup({ humanColor: 'black', size: 9, komi: 6.5 });
    const state = createGameFromSetup(setup);

    expect(state.config).toEqual({
      mode: 'ai',
      size: 9,
      komi: 6.5,
      humanColor: 'black',
      difficulty: 'casual',
    });
    expect(getStartingPlayer(setup)).toBe('black');
    expect(state.currentPlayer).toBe('black');
    expect(isHumanTurn(state.config, state.currentPlayer)).toBe(true);
  });

  it('supports AI configuration with human White', () => {
    const setup = createAiSetup({ humanColor: 'white' });
    const state = createGameFromSetup(setup);

    expect(state.config.mode).toBe('ai');
    if (state.config.mode === 'ai') {
      expect(state.config.humanColor).toBe('white');
    }
    expect(getStartingPlayer(setup)).toBe('black');
    expect(state.currentPlayer).toBe('black');
    expect(isAiTurn(state.config, state.currentPlayer)).toBe(true);
  });
});

describe('MockGoAI', () => {
  it('returns only legal moves', async () => {
    const ai = new MockGoAI({ minDelayMs: 0, maxDelayMs: 0, random: () => 0.99 });
    let state = createGameFromSetup(createLocalSetup());

    for (let turn = 0; turn < 6; turn += 1) {
      const legal = legalMoves.getLegalMoves(state);
      const result = await ai.generateMove(aiRequestFromState(state));

      if (legal.length === 0) {
        expect(result.type).toBe('pass');
        break;
      }

      expect(result.type).toBe('play');
      if (result.type !== 'play') continue;

      const legality = legal.some((pos) => positionKey(pos) === positionKey(result.position));
      expect(legality).toBe(true);

      const played = dispatch(state, { type: 'play', position: result.position });
      if (!played.ok) break;
      state = played.state;
    }
  });

  it('passes when no legal moves exist', async () => {
    const ai = new MockGoAI({ minDelayMs: 0, maxDelayMs: 0 });
    const state = createGameFromSetup(createLocalSetup());
    vi.spyOn(legalMoves, 'getLegalMoves').mockReturnValue([]);

    const result = await ai.generateMove(aiRequestFromState(state));

    expect(result).toEqual({ type: 'pass' });
    vi.restoreAllMocks();
  });

  it('applies AI results through the existing engine', async () => {
    const ai = new MockGoAI({ minDelayMs: 0, maxDelayMs: 0, random: () => 0 });
    const state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    const humanMove = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!humanMove.ok) throw new Error('human move failed');

    const aiState = humanMove.state;
    const result = await ai.generateMove(aiRequestFromState(aiState));

    const action =
      result.type === 'pass'
        ? ({ type: 'pass' } as const)
        : ({ type: 'play', position: result.position } as const);
    const applied = dispatch(aiState, action);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.state.history.length).toBe(2);
    }
  });
});

describe('AI turn permissions', () => {
  it('blocks the human during the AI turn', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    const afterHuman = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!afterHuman.ok) throw new Error('play failed');

    expect(isHumanTurn(afterHuman.state.config, afterHuman.state.currentPlayer)).toBe(false);
  });

  it('allows the human during their turn', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    expect(isHumanTurn(state.config, state.currentPlayer)).toBe(true);
  });
});

describe('AI request coordination', () => {
  it('prevents duplicate simultaneous AI requests', () => {
    const coordinator = createAiRequestCoordinator();
    expect(coordinator.begin()).toBe(1);
    expect(coordinator.begin()).toBeNull();
    coordinator.complete();
    expect(coordinator.begin()).toBe(2);
  });

  it('ignores stale AI responses after cancel', async () => {
    const coordinator = createAiRequestCoordinator();
    const ai = new ControllableGoAI();
    let applied = false;

    const firstGeneration = coordinator.begin();
    if (firstGeneration === null) throw new Error('expected request');

    void ai.generateMove({} as GenerateMoveRequest).then(() => {
      if (coordinator.isCurrent(firstGeneration)) {
        applied = true;
      }
    });

    coordinator.cancel();
    ai.resolveNext({ type: 'pass' });
    await Promise.resolve();

    expect(applied).toBe(false);
  });
});

describe('AI undo', () => {
  it('removes the human and AI move pair in AI mode', () => {
    let state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    const human = dispatch(state, { type: 'play', position: { row: 2, col: 2 } });
    if (!human.ok) throw new Error('human move failed');
    state = human.state;

    const aiMove = dispatch(state, { type: 'play', position: { row: 2, col: 3 } });
    if (!aiMove.ok) throw new Error('ai move failed');
    state = aiMove.state;
    expect(state.history).toHaveLength(2);

    const undone = undoForGameMode(state);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.history).toHaveLength(0);
      expect(undone.state.currentPlayer).toBe('black');
    }
  });

  it('undoes only the human move when AI has not replied yet', () => {
    let state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    const human = dispatch(state, { type: 'play', position: { row: 1, col: 1 } });
    if (!human.ok) throw new Error('human move failed');
    state = human.state;
    expect(state.history).toHaveLength(1);

    const undone = undoForGameMode(state);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.history).toHaveLength(0);
    }
  });

  it('keeps local two-player undo behavior unchanged', () => {
    let state = createGameFromSetup(createLocalSetup());
    const played = dispatch(state, { type: 'play', position: { row: 0, col: 0 } });
    if (!played.ok) throw new Error('play failed');
    state = played.state;

    const undone = undoForGameMode(state);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.history).toHaveLength(0);
    }
  });
});

describe('AI scoring and persistence', () => {
  it('allows AI pass to contribute to two-pass scoring', () => {
    let state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));
    const humanPass = dispatch(state, { type: 'pass' });
    if (!humanPass.ok) throw new Error('human pass failed');
    state = humanPass.state;

    const aiPass = dispatch(state, { type: 'pass' });
    if (!aiPass.ok) throw new Error('ai pass failed');
    state = aiPass.state;

    expect(state.phase).toBe('scoring');
    expect(state.consecutivePasses).toBe(2);
  });

  it('persists AI mode and humanColor', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white', size: 13 }));
    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');

    expect(serialized.saved.version).toBe(SAVED_GAME_VERSION);
    expect(serialized.saved.state.config).toEqual({
      mode: 'ai',
      size: 13,
      komi: state.config.komi,
      humanColor: 'white',
      difficulty: 'casual',
    });

    const restored = deserializeSavedGame(serialized.saved);
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.state.config.mode).toBe('ai');
      if (restored.state.config.mode === 'ai') {
        expect(restored.state.config.humanColor).toBe('white');
      }
    }
  });

  it('migrates legacy v1 saves to local mode', () => {
    const legacy = {
      version: LEGACY_SAVED_GAME_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        board: {
          size: 9,
          intersections: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null)),
        },
        config: { size: 9, komi: 6.5, firstPlayer: 'black' },
        currentPlayer: 'black',
        phase: 'playing',
        captures: { black: 0, white: 0 },
        history: [],
        consecutivePasses: 0,
        deadStones: [],
        result: null,
      },
    };

    const restored = deserializeSavedGame(legacy);
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(restored.migratedFromVersion).toBe(LEGACY_SAVED_GAME_VERSION);
      expect(restored.state.config.mode).toBe('local');
      if (restored.state.config.mode === 'local') {
        expect(restored.state.config.firstPlayer).toBe('black');
      }
    }
  });

  it('restores AI games on AI turn for orchestration', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));
    expect(isAiTurn(state.config, state.currentPlayer)).toBe(true);

    const serialized = serializeGameState(state);
    if (!serialized.ok) throw new Error('serialize failed');
    const restored = deserializeSavedGame(serialized.saved);
    if (!restored.ok) throw new Error('deserialize failed');

    expect(isAiTurn(restored.state.config, restored.state.currentPlayer)).toBe(true);
    expect(setupToConfig(createAiSetup({ humanColor: 'white' })).mode).toBe('ai');
  });
});

describe('ControllableGoAI orchestration', () => {
  it('resumes AI move generation when loaded on AI turn', async () => {
    const ai = new ControllableGoAI();
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));

    const requestPromise = ai.generateMove(aiRequestFromState(state));

    expect(ai.calls).toBe(1);
    ai.resolveNext({ type: 'play', position: { row: 2, col: 2 } });
    const result = await requestPromise;
    expect(result.type).toBe('play');
  });
});
