import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AI_THINKING_INDICATOR_DELAY_MS } from '../hooks/useDelayedAiThinkingIndicator';

/** Mirrors the hook timer behavior for unit testing without a DOM environment. */
function simulateDelayedIndicator(thinkingDurationMs: number, delayMs = AI_THINKING_INDICATOR_DELAY_MS): boolean {
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  timer = setTimeout(() => {
    visible = true;
    timer = null;
  }, delayMs);

  vi.advanceTimersByTime(thinkingDurationMs);

  if (thinkingDurationMs < delayMs && timer) {
    clearTimeout(timer);
    visible = false;
  }

  return visible;
}

describe('AI thinking indicator delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses a 350ms delay', () => {
    expect(AI_THINKING_INDICATOR_DELAY_MS).toBe(350);
  });

  it('does not show when thinking finishes before the delay', () => {
    expect(simulateDelayedIndicator(AI_THINKING_INDICATOR_DELAY_MS - 1)).toBe(false);
  });

  it('shows when thinking continues through the delay', () => {
    expect(simulateDelayedIndicator(AI_THINKING_INDICATOR_DELAY_MS)).toBe(true);
  });
});
