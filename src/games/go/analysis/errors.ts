export function analysisUnavailableMessage(): string {
  return 'Analysis is unavailable right now.';
}

export function analysisTimeoutMessage(): string {
  return 'Analysis took too long to respond.';
}

export function formatAnalysisError(error: unknown): string {
  if (error instanceof AnalysisError) {
    return error.message;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return analysisTimeoutMessage();
  }

  if (error instanceof TypeError) {
    return analysisUnavailableMessage();
  }

  return analysisUnavailableMessage();
}

export type AnalysisErrorCode = 'unavailable' | 'timeout' | 'invalid_response' | 'network';

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode;

  constructor(code: AnalysisErrorCode, message: string) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
  }
}
