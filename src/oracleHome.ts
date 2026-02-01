import os from 'node:os';
import path from 'node:path';

let triangulatorHomeDirOverride: string | null = null;

/**
 * Test-only hook: avoid mutating process.env (shared across Vitest worker threads).
 * This override is scoped to the current Node worker.
 */
export function setTriangulatorHomeDirOverrideForTest(dir: string | null): void {
  triangulatorHomeDirOverride = dir;
}

export function getTriangulatorHomeDir(): string {
  return (
    triangulatorHomeDirOverride ??
    process.env.TRIANGULATOR_HOME_DIR ??
    process.env.ORACLE_HOME_DIR ??
    path.join(os.homedir(), '.triangulator')
  );
}

// Legacy aliases retained to minimize upstream merge conflicts.
export function setOracleHomeDirOverrideForTest(dir: string | null): void {
  setTriangulatorHomeDirOverrideForTest(dir);
}

export function getOracleHomeDir(): string {
  return getTriangulatorHomeDir();
}
