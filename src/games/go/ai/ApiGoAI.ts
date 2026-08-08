import {
  AiError,
  aiInvalidMoveMessage,
  aiTimeoutMessage,
  aiUnavailableMessage,
} from './errors';
import { serializeMoveRequest } from './serializeRequest';
import type {
  GenerateMoveRequest,
  GenerateMoveResult,
  GoAI,
} from './types';

type ApiMoveResponse =
  | {
      move: {
        type: 'play';
        position: {
          x: number;
          y: number;
        };
      };
    }
  | {
      move: {
        type: 'pass';
      };
    };

export interface ApiGoAIOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class ApiGoAI implements GoAI {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiGoAIOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '/api').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 30_000;

    this.fetchImpl =
      options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async generateMove(
    request: GenerateMoveRequest,
  ): Promise<GenerateMoveResult> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const requestPayload = serializeMoveRequest(request);

      const response = await this.fetchImpl(
        `${this.baseUrl}/ai/move`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        },
      );

      const responsePayload =
        (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof responsePayload.message === 'string'
            ? responsePayload.message
            : aiUnavailableMessage();

        throw new AiError(
          response.status === 504 ? 'timeout' : 'unavailable',
          message,
        );
      }

      return parseApiMoveResponse(responsePayload);
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }

      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new AiError(
          'timeout',
          aiTimeoutMessage(),
        );
      }

      if (error instanceof SyntaxError) {
        throw new AiError(
          'invalid_response',
          aiUnavailableMessage(),
        );
      }

      throw new AiError(
        'network',
        aiUnavailableMessage(),
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseApiMoveResponse(
  payload: unknown,
): GenerateMoveResult {
  if (!payload || typeof payload !== 'object') {
    throw new AiError(
      'invalid_response',
      aiUnavailableMessage(),
    );
  }

  const body =
    payload as ApiMoveResponse & Record<string, unknown>;

  if (!body.move || typeof body.move !== 'object') {
    throw new AiError(
      'invalid_response',
      aiUnavailableMessage(),
    );
  }

  if (body.move.type === 'pass') {
    return {
      type: 'pass',
    };
  }

  if (
    body.move.type !== 'play' ||
    !body.move.position
  ) {
    throw new AiError(
      'invalid_response',
      aiInvalidMoveMessage(),
    );
  }

  const { x, y } = body.move.position;

  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y)
  ) {
    throw new AiError(
      'invalid_move',
      aiInvalidMoveMessage(),
    );
  }

  return {
    type: 'play',
    position: {
      row: y,
      col: x,
    },
  };
}