import { describe, expect, it } from 'vitest';
import {
  AiError,
  aiMalformedMessage,
  aiOfflineMessage,
  aiTimeoutMessage,
  aiUnavailableMessage,
  formatAiError,
  isAiStatusMessage,
} from '../ai/errors';

describe('AI error messages', () => {
  it('formats timeout errors for the status banner', () => {
    expect(formatAiError(new AiError('timeout', aiTimeoutMessage()))).toBe(aiTimeoutMessage());
  });

  it('formats unavailable errors', () => {
    expect(formatAiError(new AiError('unavailable', aiUnavailableMessage()))).toBe(
      aiUnavailableMessage(),
    );
  });

  it('maps abort errors to timeout messaging', () => {
    expect(formatAiError(new DOMException('Aborted', 'AbortError'))).toBe(aiTimeoutMessage());
  });

  it('maps syntax errors to malformed messaging', () => {
    expect(formatAiError(new SyntaxError('Unexpected token'))).toBe(aiMalformedMessage());
  });

  it('distinguishes offline, timeout, unavailable, and malformed copy', () => {
    expect(aiOfflineMessage()).toMatch(/offline/i);
    expect(aiTimeoutMessage()).toMatch(/too long/i);
    expect(aiUnavailableMessage()).toMatch(/unavailable/i);
    expect(aiMalformedMessage()).toMatch(/bad response/i);

    expect(isAiStatusMessage(aiOfflineMessage())).toBe(true);
    expect(isAiStatusMessage(aiTimeoutMessage())).toBe(true);
    expect(isAiStatusMessage(aiUnavailableMessage())).toBe(true);
    expect(isAiStatusMessage(aiMalformedMessage())).toBe(true);
    expect(isAiStatusMessage('Occupied intersection.')).toBe(false);
  });
});
