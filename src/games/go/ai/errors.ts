export type AiErrorCode =
  | 'unavailable'
  | 'timeout'
  | 'invalid_response'
  | 'invalid_move'
  | 'network';

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
    return 'The AI took too long to respond.';
  }

  if (error instanceof TypeError) {
    return 'AI is unavailable right now.';
  }

  return 'AI is unavailable right now.';
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
