import { describe, expect, it } from 'vitest';
import { KataGoProcess } from '../src/katago/KataGoProcess.js';
import { createHealthHandler } from '../src/api/health.js';
import { MockKataGoProcess } from '../src/katago/KataGoProcess.js';

describe('KataGoProcess', () => {
  function attachFakeStdin(process: KataGoProcess): void {
    (process as unknown as { process: { stdin: { writable: boolean; write: Function } } }).process = {
      stdin: {
        writable: true,
        write: (_chunk: string, callback: (error?: Error | null) => void) => callback(),
      },
    };
  }

  it('uses analysis mode spawn arguments', () => {
    const process = new KataGoProcess({
      binaryPath: '/opt/homebrew/bin/katago',
      modelPath: '/models/net.bin.gz',
      configPath: '/cfg/analysis_example.cfg',
      startupTimeoutMs: 1_000,
    });

    expect(process.getSpawnArgs()).toEqual([
      'analysis',
      '-model',
      '/models/net.bin.gz',
      '-config',
      '/cfg/analysis_example.cfg',
    ]);
  });

  it('matches responses by request id', async () => {
    const process = new KataGoProcess({
      binaryPath: '/katago',
      modelPath: '/model',
      configPath: '/cfg',
      startupTimeoutMs: 1_000,
    });
    attachFakeStdin(process);

    const pending = process.sendQuery({ id: 'req-1', action: 'query_version' }, 1_000);
    await Promise.resolve();
    process.handleStdout('{"id":"other","action":"query_version","version":"1.0"}\n');
    process.handleStdout('{"id":"req-1","action":"query_version","version":"1.17.2","git_hash":"abc"}\n');

    await expect(pending).resolves.toMatchObject({ id: 'req-1', version: '1.17.2' });
  });

  it('ignores in-progress search responses until the final line arrives', async () => {
    const process = new KataGoProcess({
      binaryPath: '/katago',
      modelPath: '/model',
      configPath: '/cfg',
      startupTimeoutMs: 1_000,
    });
    attachFakeStdin(process);

    const pending = process.sendQuery({ id: 'analysis-1', moves: [] }, 1_000);
    await Promise.resolve();
    process.handleStdout('{"id":"analysis-1","isDuringSearch":true,"moveInfos":[{"move":"E5","order":0}]}\n');
    process.handleStdout('{"id":"analysis-1","isDuringSearch":false,"moveInfos":[{"move":"D4","order":0}]}\n');

    await expect(pending).resolves.toMatchObject({
      id: 'analysis-1',
      moveInfos: [{ move: 'D4', order: 0 }],
    });
  });

  it('rejects pending requests on timeout', async () => {
    const process = new KataGoProcess({
      binaryPath: '/katago',
      modelPath: '/model',
      configPath: '/cfg',
      startupTimeoutMs: 1_000,
    });
    attachFakeStdin(process);

    await expect(process.sendQuery({ id: 'slow-query' }, 10)).rejects.toThrow('katago_query_timeout');
  });

  it('rejects pending requests when the process exits', async () => {
    const process = new KataGoProcess({
      binaryPath: '/katago',
      modelPath: '/model',
      configPath: '/cfg',
      startupTimeoutMs: 1_000,
    });
    attachFakeStdin(process);

    const pending = process.sendQuery({ id: 'exit-query' }, 5_000);
    await Promise.resolve();
    (process as unknown as { rejectAllPending: (error: Error) => void }).rejectAllPending(
      new Error('katago_process_exited'),
    );

    await expect(pending).rejects.toThrow('katago_process_exited');
  });
});

describe('health endpoint', () => {
  it('reports ready only when the analysis engine is usable', async () => {
    const ready = new MockKataGoProcess();
    const down = new MockKataGoProcess();
    await down.stop();

    const responses: unknown[] = [];

    createHealthHandler(ready)({} as never, {
      writeHead: () => {},
      end: (body: string) => responses.push(JSON.parse(body)),
    } as never);

    createHealthHandler(down)({} as never, {
      writeHead: () => {},
      end: (body: string) => responses.push(JSON.parse(body)),
    } as never);

    expect(responses[0]).toEqual({ status: 'ok', katago: 'ready' });
    expect(responses[1]).toEqual({ status: 'ok', katago: 'unavailable' });
  });
});
