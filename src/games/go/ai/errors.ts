export type AiErrorCode =
  | 'offline'
  | 'unavailable'
  | 'timeout'
  | 'invalid_response'
  | 'invalid_move'
  | 'network';

export const MAX_AI_RETRY_ATTEMPTS = 8;

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

export function formatAiError(error: unknown): string {
  if (error instanceof AiError) {
    return error.message;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return aiTimeoutMessage();
  }

  if (error instanceof TypeError) {
    return aiUnavailableMessage();
  }

  return aiUnavailableMessage();
}

export function aiOfflineMessage(): string {
  return "You're offline. AI moves pause until connection returns — tap Retry when back online.";
}

export function aiRetryLimitMessage(): string {
  return 'Too many AI retries. Check your connection and try again later.';
}

export function isOfflineAiError(error: unknown): boolean {
  return error instanceof AiError && error.code === 'offline';
}

export function isOfflineAiMessage(message: string | null): boolean {
  return message === aiOfflineMessage();
}

export function aiInvalidMoveMessage(): string {
  return 'The AI returned an invalid move.';
}

export function aiUnavailableMessage(): string {
  return 'AI is unavailable right now.';
}

export function aiTimeoutMessage(): string {
  return 'The AI took too long to respond.';
}
