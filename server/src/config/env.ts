import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export type ServerEnv = {
  port: number;
  katagoBinaryPath: string;
  katagoModelPath: string;
  katagoConfigPath: string;
  aiRequestTimeoutMs: number;
  katagoStartupTimeoutMs: number;
  skipKatagoStartup: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }

  return parsed;
}

function assertPathExists(label: string, filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

export function loadServerEnv(): ServerEnv {
  const skipKatagoStartup = process.env.SKIP_KATAGO_STARTUP === '1';

  const katagoBinaryPath = resolve(requireEnv('KATAGO_BINARY_PATH'));
  const katagoModelPath = resolve(requireEnv('KATAGO_MODEL_PATH'));
  const katagoConfigPath = resolve(requireEnv('KATAGO_CONFIG_PATH'));

  if (!skipKatagoStartup) {
    assertPathExists('KATAGO_BINARY_PATH', katagoBinaryPath);
    assertPathExists('KATAGO_MODEL_PATH', katagoModelPath);
    assertPathExists('KATAGO_CONFIG_PATH', katagoConfigPath);
  }

  return {
    port: parsePositiveInt('PORT', 3001),
    katagoBinaryPath,
    katagoModelPath,
    katagoConfigPath,
    aiRequestTimeoutMs: parsePositiveInt('AI_REQUEST_TIMEOUT_MS', 30_000),
    katagoStartupTimeoutMs: parsePositiveInt('KATAGO_STARTUP_TIMEOUT_MS', 120_000),
    skipKatagoStartup,
  };
}

export function loadTestServerEnv(): ServerEnv {
  return {
    port: 3001,
    katagoBinaryPath: '/tmp/katago',
    katagoModelPath: '/tmp/model.bin.gz',
    katagoConfigPath: '/tmp/gtp.cfg',
    aiRequestTimeoutMs: 5_000,
    katagoStartupTimeoutMs: 5_000,
    skipKatagoStartup: true,
  };
}
