import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KataGoProcessLike } from '../katago/KataGoProcess.js';
import type { HealthResponse } from '../katago/types.js';
import { sendJson } from './ai.js';

export function createHealthHandler(process: KataGoProcessLike) {
  return (_req: IncomingMessage, res: ServerResponse): void => {
    const body: HealthResponse = {
      status: 'ok',
      katago: process.isReady() ? 'ready' : 'unavailable',
    };

    sendJson(res, 200, body);
  };
}
