import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KataGoClient } from '../katago/KataGoClient.js';
import type { KataGoProcessLike } from '../katago/KataGoProcess.js';
import {
  toAiMoveResponse,
  validateAiMoveRequest,
  validationErrorMessage,
} from '../validation/aiRequest.js';

export function createAiMoveHandler(
  client: KataGoClient,
  process: KataGoProcessLike,
  timeoutMs: number,
) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!process.isReady()) {
      sendJson(res, 503, { error: 'katago_unavailable', message: 'AI is unavailable right now.' });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const validated = validateAiMoveRequest(body);
      if (!validated.ok) {
        sendJson(res, 400, {
          error: validated.error,
          message: validationErrorMessage(validated.error),
        });
        return;
      }

      const move = await client.generateMove(validated.request, timeoutMs);
      sendJson(res, 200, toAiMoveResponse(move));
    } catch (error) {
      const message = mapServerAiError(error);
      const statusCode = message.includes('too long') ? 504 : 502;
      console.error('[ai/move]', error);
      sendJson(res, statusCode, { error: 'ai_move_failed', message });
    }
  };
}

function mapServerAiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'AI is unavailable right now.';
  }

  if (error.message.includes('timeout')) {
    return 'The AI took too long to respond.';
  }

  if (error.message.includes('invalid_genmove') || error.message.includes('vertex')) {
    return 'The AI returned an invalid move.';
  }

  if (error.message.includes('katago_not_ready') || error.message.includes('katago_not_running')) {
    return 'AI is unavailable right now.';
  }

  return 'AI is unavailable right now.';
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new Error('invalid_json');
  }
}

export { sendJson, readJsonBody };
