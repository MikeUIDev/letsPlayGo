import {
  aiInvalidMoveMessage,
  aiMalformedMessage,
  aiOfflineMessage,
  aiTimeoutMessage,
  aiUnavailableMessage,
  AiError,
  type AiErrorCode,
} from '../ai/errors';
import type { ApiErrorResponseBody } from './contracts';
import { isNetworkOnline } from '../../../native/networkStatus';

export type ApiTransportFailureCode = AiErrorCode;

export class ApiTransportError extends Error {
  readonly code: ApiTransportFailureCode;

  constructor(code: ApiTransportFailureCode, message: string) {
    super(message);
    this.name = 'ApiTransportError';
    this.code = code;
  }
}

export type AiApiClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
};

export type PostJsonParams = {
  path: string;
  body: unknown;
  signal?: AbortSignal;
};

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function mapHttpStatusToCode(status: number): AiErrorCode {
  if (status === 504) return 'timeout';
  if (status === 502 || status === 503) return 'unavailable';
  return 'unavailable';
}

function messageFromErrorBody(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const body = payload as ApiErrorResponseBody;
  return typeof body.message === 'string' ? body.message : fallback;
}

export function mapFetchFailure(error: unknown): ApiTransportError {
  if (error instanceof ApiTransportError) {
    return error;
  }

  if (!isNetworkOnline()) {
    return new ApiTransportError('offline', aiOfflineMessage());
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiTransportError('timeout', aiTimeoutMessage());
  }

  if (error instanceof SyntaxError) {
    return new ApiTransportError('invalid_response', aiMalformedMessage());
  }

  if (error instanceof TypeError) {
    return new ApiTransportError('network', aiUnavailableMessage());
  }

  return new ApiTransportError('network', aiUnavailableMessage());
}

export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const transport = mapFetchFailure(error);
  return new AiError(transport.code, transport.message);
}

/** Central HTTP client for AI backend endpoints (/api/ai/move, /api/ai/analyze). */
export class AiApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AiApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async postJson<T>(params: PostJsonParams): Promise<T> {
    if (!this.baseUrl) {
      throw new ApiTransportError('unavailable', aiUnavailableMessage());
    }

    if (!isNetworkOnline()) {
      throw new ApiTransportError('offline', aiOfflineMessage());
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.timeoutMs);

    const onExternalAbort = () => timeoutController.abort();
    if (params.signal) {
      if (params.signal.aborted) {
        timeoutController.abort();
      } else {
        params.signal.addEventListener('abort', onExternalAbort);
      }
    }

    try {
      const response = await this.fetchImpl(joinUrl(this.baseUrl, params.path), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.body),
        signal: timeoutController.signal,
      });

      const raw = await response.text();
      let payload: unknown = null;
      if (raw) {
        try {
          payload = JSON.parse(raw) as unknown;
        } catch {
          // Distinguish server failure (5xx HTML/non-JSON) from a 200 malformed body.
          if (!response.ok) {
            const code = mapHttpStatusToCode(response.status);
            throw new ApiTransportError(
              code,
              code === 'timeout' ? aiTimeoutMessage() : aiUnavailableMessage(),
            );
          }
          throw new ApiTransportError('invalid_response', aiMalformedMessage());
        }
      }

      if (!response.ok) {
        const code = mapHttpStatusToCode(response.status);
        throw new ApiTransportError(
          code,
          messageFromErrorBody(
            payload,
            code === 'timeout' ? aiTimeoutMessage() : aiUnavailableMessage(),
          ),
        );
      }

      if (payload === null) {
        throw new ApiTransportError('invalid_response', aiMalformedMessage());
      }

      return payload as T;
    } catch (error) {
      throw mapFetchFailure(error);
    } finally {
      clearTimeout(timeoutId);
      if (params.signal) {
        params.signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }
}

export function parseApiMoveResponse(payload: unknown): import('../ai/types').GenerateMoveResult {
  if (!payload || typeof payload !== 'object') {
    throw new ApiTransportError('invalid_response', aiMalformedMessage());
  }

  const body = payload as import('./contracts').ApiMoveResponseBody & Record<string, unknown>;

  if (!body.move || typeof body.move !== 'object') {
    throw new ApiTransportError('invalid_response', aiMalformedMessage());
  }

  if (body.move.type === 'pass') {
    return { type: 'pass' };
  }

  if (body.move.type !== 'play' || !body.move.position) {
    throw new ApiTransportError('invalid_response', aiInvalidMoveMessage());
  }

  const { x, y } = body.move.position;

  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new ApiTransportError('invalid_move', aiInvalidMoveMessage());
  }

  return {
    type: 'play',
    position: {
      row: y,
      col: x,
    },
  };
}
