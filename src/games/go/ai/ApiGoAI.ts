import { AiApiClient, parseApiMoveResponse, toAiError } from '../api/client';
import { AI_MOVE_PATH } from '../api/contracts';
import { serializeMoveRequest } from './serializeRequest';
import type {
  GenerateMoveOptions,
  GenerateMoveRequest,
  GenerateMoveResult,
  GoAI,
} from './types';

export interface ApiGoAIOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Remote AI opponent via the shared HTTP AI service (`POST /api/ai/move`).
 * Configuration (base URL, timeout) comes from env — never embed secrets here.
 */
export class ApiGoAI implements GoAI {
  private readonly client: AiApiClient;

  constructor(options: ApiGoAIOptions) {
    this.client = new AiApiClient({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs ?? 30_000,
      fetchImpl: options.fetchImpl,
    });
  }

  async generateMove(
    request: GenerateMoveRequest,
    options?: GenerateMoveOptions,
  ): Promise<GenerateMoveResult> {
    try {
      const payload = await this.client.postJson<unknown>({
        path: AI_MOVE_PATH,
        body: serializeMoveRequest(request),
        signal: options?.signal,
      });
      return parseApiMoveResponse(payload);
    } catch (error) {
      throw toAiError(error);
    }
  }
}

export { parseApiMoveResponse } from '../api/client';
