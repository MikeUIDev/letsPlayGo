import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KataGoClient } from '../katago/KataGoClient.js';
import type { KataGoProcessLike } from '../katago/KataGoProcess.js';
import {
  analyzeValidationErrorMessage,
  validateAnalyzeRequest,
} from '../validation/analyzeRequest.js';
import { readJsonBody, sendJson } from './ai.js';

export function createAnalyzeHandler(
  client: KataGoClient,
  process: KataGoProcessLike,
  timeoutMs: number,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!process.isReady()) {
      sendJson(res, 503, {
        error: 'katago_unavailable',
        message: 'Analysis is unavailable right now.',
      });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const validated = validateAnalyzeRequest(body);
      if (!validated.ok) {
        sendJson(res, 400, {
          error: validated.error,
          message: analyzeValidationErrorMessage(validated.error),
        });
        return;
      }

      const analysis = await client.analyze(validated.request, timeoutMs);
      sendJson(res, 200, analysis);
    } catch (error) {
      const message = mapServerAnalyzeError(error);
      const statusCode = message.includes('too long') ? 504 : 502;
      console.error('[ai/analyze]', error);
      sendJson(res, statusCode, { error: 'analysis_failed', message });
    }
  };
}

function mapServerAnalyzeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Analysis is unavailable right now.';
  }

  if (error.message.includes('timeout')) {
    return 'Analysis took too long to respond.';
  }

  if (error.message.includes('katago_not_ready') || error.message.includes('katago_not_running')) {
    return 'Analysis is unavailable right now.';
  }

  return 'Analysis is unavailable right now.';
}
