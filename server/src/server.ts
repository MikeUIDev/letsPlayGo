import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createAiMoveHandler } from './api/ai.js';
import { createHealthHandler } from './api/health.js';
import { loadServerEnv } from './config/env.js';
import { KataGoClient } from './katago/KataGoClient.js';
import { KataGoProcess } from './katago/KataGoProcess.js';

async function main(): Promise<void> {
  const env = loadServerEnv();
  const katagoProcess = new KataGoProcess({
    binaryPath: env.katagoBinaryPath,
    modelPath: env.katagoModelPath,
    configPath: env.katagoConfigPath,
    startupTimeoutMs: env.katagoStartupTimeoutMs,
  });

  if (!env.skipKatagoStartup) {
    try {
      await katagoProcess.start();
    } catch (error) {
      console.error('[server] KataGo failed to start:', error);
    }
  }

  const client = new KataGoClient(katagoProcess);
  const healthHandler = createHealthHandler(katagoProcess);
  const aiMoveHandler = createAiMoveHandler(client, katagoProcess, env.aiRequestTimeoutMs);

  const server = createServer(async (req, res) => {
    try {
      await route(req, res, healthHandler, aiMoveHandler);
    } catch (error) {
      console.error('[server] unhandled request error:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'internal_error', message: 'AI is unavailable right now.' }));
      }
    }
  });

  server.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] health: http://localhost:${env.port}/api/health`);
  });

  const shutdown = async () => {
    console.log('[server] shutting down');
    server.close();
    await katagoProcess.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function route(
  req: IncomingMessage,
  res: ServerResponse,
  healthHandler: ReturnType<typeof createHealthHandler>,
  aiMoveHandler: ReturnType<typeof createAiMoveHandler>,
): Promise<void> {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (method === 'GET' && url.pathname === '/api/health') {
    healthHandler(req, res);
    return;
  }

  if (method === 'POST' && url.pathname === '/api/ai/move') {
    await aiMoveHandler(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

main().catch((error) => {
  console.error('[server] failed to start:', error);
  process.exit(1);
});
