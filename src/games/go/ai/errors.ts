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

  if (error instanceof SyntaxError) {
    return aiMalformedMessage();
  }

  if (error instanceof TypeError) {
    return aiUnavailableMessage();
  }

  return aiUnavailableMessage();
}

export function aiOfflineMessage(): string {
  return "You're offline. AI is paused — tap Retry when you're back online.";
}

export function aiBackOnlineRetryMessage(): string {
  return "You're back online. Tap Retry for the AI to move.";
}

export function aiRetryLimitMessage(): string {
  return 'Too many AI retries. Check your connection and try again later.';
}

export function isOfflineAiError(error: unknown): boolean {
  return error instanceof AiError && error.code === 'offline';
}

export function isOfflineAiMessage(message: string | null): boolean {
  return message === aiOfflineMessage() || message === aiBackOnlineRetryMessage();
}

export function isAiStatusMessage(message: string | null): boolean {
  if (!message) {
    return false;
  }

  return (
    message === aiOfflineMessage() ||
    message === aiBackOnlineRetryMessage() ||
    message === aiTimeoutMessage() ||
    message === aiUnavailableMessage() ||
    message === aiMalformedMessage() ||
    message === aiInvalidMoveMessage() ||
    message === aiRetryLimitMessage()
  );
}

export function aiInvalidMoveMessage(): string {
  return 'The AI returned an invalid move. Tap Retry to try again.';
}

export function aiUnavailableMessage(): string {
  return 'AI server is unavailable. Tap Retry to try again.';
}

export function aiTimeoutMessage(): string {
  return 'The AI took too long to respond. Tap Retry to try again.';
}

export function aiMalformedMessage(): string {
  return 'AI returned a bad response. Tap Retry to try again.';
}
