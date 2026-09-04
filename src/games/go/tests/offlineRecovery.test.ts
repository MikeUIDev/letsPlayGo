import { describe, expect, it } from 'vitest';
import {
  decideAiActionAfterReconnect,
  shouldRetriggerAiAfterReconnect,
} from '../ai/offlineRecovery';
import { createGameFromSetup } from '../engine/gameState';
import { createAiSetup } from '../utils/gameSetup';

describe('decideAiActionAfterReconnect', () => {
  it('prompts Retry on AI turn after offline pause without auto-retrigger', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));

    expect(
      decideAiActionAfterReconnect({
        offlinePaused: true,
        enabled: true,
        state,
        status: 'error',
      }),
    ).toEqual({ retrigger: false, promptRetry: true });
  });

  it('does not prompt on human turn', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));

    expect(
      decideAiActionAfterReconnect({
        offlinePaused: true,
        enabled: true,
        state,
        status: 'error',
      }),
    ).toEqual({ retrigger: false, promptRetry: false });
  });

  it('does not prompt when not offline paused', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));

    expect(
      decideAiActionAfterReconnect({
        offlinePaused: false,
        enabled: true,
        state,
        status: 'error',
      }),
    ).toEqual({ retrigger: false, promptRetry: false });
  });

  it('does not prompt when AI is not in error state', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));

    expect(
      decideAiActionAfterReconnect({
        offlinePaused: true,
        enabled: true,
        state,
        status: 'idle',
      }),
    ).toEqual({ retrigger: false, promptRetry: false });
  });
});

describe('shouldRetriggerAiAfterReconnect', () => {
  it('never auto-retriggers after reconnect', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'white' }));

    expect(
      shouldRetriggerAiAfterReconnect({
        offlinePaused: true,
        enabled: true,
        state,
        status: 'error',
      }),
    ).toBe(false);
  });

  it('does not retrigger on human turn', () => {
    const state = createGameFromSetup(createAiSetup({ humanColor: 'black' }));

    expect(
      shouldRetriggerAiAfterReconnect({
        offlinePaused: true,
        enabled: true,
        state,
        status: 'error',
      }),
    ).toBe(false);
  });
});
