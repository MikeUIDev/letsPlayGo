import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { KataGoProcessStatus } from './types.js';
import {
  buildQueryVersionQuery,
  buildSpawnArgs,
  isFinalAnalysisResponse,
  parseJsonLine,
  serializeQueryLine,
  splitBufferedLines,
  type AnalysisResponse,
} from './protocol.js';

export type KataGoProcessOptions = {
  binaryPath: string;
  modelPath: string;
  configPath: string;
  startupTimeoutMs: number;
  logger?: Pick<Console, 'error' | 'info' | 'warn'>;
};

type PendingRequest = {
  resolve: (response: AnalysisResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

let requestCounter = 0;

function createRequestId(prefix: string): string {
  requestCounter += 1;
  return `${prefix}-${requestCounter}`;
}

export class KataGoProcess {
  private readonly options: KataGoProcessOptions;
  private readonly logger: Pick<Console, 'error' | 'info' | 'warn'>;
  private process: ChildProcessWithoutNullStreams | null = null;
  private status: KataGoProcessStatus = 'stopped';
  private stdoutBuffer = '';
  private pendingRequests = new Map<string, PendingRequest>();
  private requestChain: Promise<unknown> = Promise.resolve();
  private startupError: string | null = null;

  constructor(options: KataGoProcessOptions) {
    this.options = options;
    this.logger = options.logger ?? console;
  }

  getStatus(): KataGoProcessStatus {
    return this.status;
  }

  getStartupError(): string | null {
    return this.startupError;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  getSpawnArgs(): string[] {
    return buildSpawnArgs(
      this.options.binaryPath,
      this.options.modelPath,
      this.options.configPath,
    );
  }

  async start(): Promise<void> {
    if (this.process) {
      return;
    }

    this.status = 'starting';
    this.startupError = null;

    this.process = spawn(this.options.binaryPath, this.getSpawnArgs(), {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout.on('data', (chunk: Buffer) => {
      this.handleStdout(chunk.toString('utf8'));
    });

    this.process.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim();
      if (text) {
        this.logger.info(`[katago] ${text}`);
      }
    });

    this.process.on('exit', (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`;
      this.logger.error(`[katago] process exited (${reason})`);
      this.status = 'error';
      this.startupError = this.startupError ?? 'process_exited';
      this.rejectAllPending(new Error('katago_process_exited'));
      this.process = null;
    });

    try {
      const versionResponse = await this.sendQuery(
        buildQueryVersionQuery(createRequestId('startup')),
        this.options.startupTimeoutMs,
      );

      if (!versionResponse.version && !versionResponse.git_hash) {
        throw new Error('katago_version_query_failed');
      }

      this.status = 'ready';
      this.logger.info('[katago] ready');
    } catch (error) {
      this.status = 'error';
      this.startupError = error instanceof Error ? error.message : 'startup_failed';
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.status = 'stopped';
      return;
    }

    this.process.stdin.end();
    this.process.kill();
    this.process = null;
    this.status = 'stopped';
    this.rejectAllPending(new Error('katago_process_stopped'));
  }

  sendQuery(query: Record<string, unknown>, timeoutMs = 30_000): Promise<AnalysisResponse> {
    const id = typeof query.id === 'string' ? query.id : createRequestId('query');
    const payload = { ...query, id };

    const run = async (): Promise<AnalysisResponse> => {
      if (!this.process || !this.process.stdin.writable) {
        throw new Error('katago_not_running');
      }

      if (this.pendingRequests.has(id)) {
        throw new Error('katago_duplicate_request_id');
      }

      return new Promise<AnalysisResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new Error('katago_query_timeout'));
        }, timeoutMs);

        this.pendingRequests.set(id, { resolve, reject, timer });

        const line = `${serializeQueryLine(payload)}\n`;
        this.process?.stdin.write(line, (error) => {
          if (error) {
            clearTimeout(timer);
            this.pendingRequests.delete(id);
            reject(error);
          }
        });
      });
    };

    this.requestChain = this.requestChain.then(run, run);
    return this.requestChain as Promise<AnalysisResponse>;
  }

  handleStdout(chunk: string): void {
    this.stdoutBuffer += chunk;
    const { lines, remainder } = splitBufferedLines(this.stdoutBuffer);
    this.stdoutBuffer = remainder;

    for (const line of lines) {
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    let parsed: AnalysisResponse;
    try {
      parsed = parseJsonLine(line) as AnalysisResponse;
    } catch {
      this.logger.warn(`[katago] ignored non-json stdout line: ${line}`);
      return;
    }

    const id = parsed.id;
    if (!id) {
      this.logger.warn('[katago] ignored response without id');
      return;
    }

    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }

    if (!isFinalAnalysisResponse(parsed)) {
      return;
    }

    clearTimeout(pending.timer);
    this.pendingRequests.delete(id);

    if (parsed.error) {
      pending.reject(new Error(parsed.error));
      return;
    }

    pending.resolve(parsed);
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

/** In-memory Analysis Engine for tests. */
export class MockKataGoProcess {
  private status: KataGoProcessStatus = 'ready';
  private defaultMove = 'pass';
  private responses = new Map<string, AnalysisResponse>();
  public queries: Record<string, unknown>[] = [];
  public spawnArgs: string[] = [];

  setBestMove(vertex: string): void {
    this.defaultMove = vertex;
  }

  setResponse(id: string, response: AnalysisResponse): void {
    this.responses.set(id, response);
  }

  getStatus(): KataGoProcessStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  getSpawnArgs(): string[] {
    return this.spawnArgs.length > 0
      ? this.spawnArgs
      : ['analysis', '-model', '/tmp/model.bin.gz', '-config', '/tmp/analysis.cfg'];
  }

  async start(): Promise<void> {
    this.status = 'ready';
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
  }

  async sendQuery(query: Record<string, unknown>, _timeoutMs?: number): Promise<AnalysisResponse> {
    this.queries.push(query);
    const id = String(query.id);

    if (this.responses.has(id)) {
      return this.responses.get(id)!;
    }

    if (query.action === 'query_version') {
      return {
        id,
        action: 'query_version',
        version: '1.0.0-mock',
        git_hash: 'mock',
      };
    }

    const move = this.defaultMove;
    return {
      id,
      isDuringSearch: false,
      turnNumber: Array.isArray(query.moves) ? query.moves.length : 0,
      moveInfos: [
        {
          move,
          order: 0,
          visits: 50,
          winrate: 0.55,
        },
      ],
    };
  }

  rejectNextQuery(error: Error): void {
    this.sendQuery = async () => {
      throw error;
    };
  }
}

export type KataGoProcessLike = Pick<
  KataGoProcess,
  'sendQuery' | 'start' | 'stop' | 'isReady' | 'getStatus' | 'getSpawnArgs'
>;
