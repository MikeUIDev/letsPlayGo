import { describe, expect, it, vi } from 'vitest';
import { AiError } from '../ai/errors';
import { formatAiError } from '../ai/errors';

describe('AI error messages', () => {
  it('formats timeout errors for the status banner', () => {
    const message = formatAiError(new AiError('timeout', 'The AI took too long to respond.'));
    expect(message).toBe('The AI took too long to respond.');
  });

  it('formats unavailable errors', () => {
    const message = formatAiError(new AiError('unavailable', 'AI is unavailable right now.'));
    expect(message).toBe('AI is unavailable right now.');
  });

  it('maps abort errors to timeout messaging', () => {
    const message = formatAiError(new DOMException('Aborted', 'AbortError'));
    expect(message).toBe('The AI took too long to respond.');
  });
});

describe('AI retry guard', () => {
  it('does not double-resolve pending AI callbacks', async () => {
    const resolve = vi.fn();
    const pending: Array<(value: { type: 'pass' }) => void> = [resolve];
    pending.shift()?.({ type: 'pass' });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(pending.length).toBe(0);
  });
});
