import process from 'node:process';
import {
  startOscProgress as startOscProgressShared,
  supportsOscProgress as supportsOscProgressShared,
  type OscProgressOptions as OscProgressOptionsShared,
} from 'osc-progress';

export type OscProgressOptions = OscProgressOptionsShared;

export function supportsOscProgress(
  env: NodeJS.ProcessEnv = process.env,
  isTty: boolean = process.stdout.isTTY,
): boolean {
  const force = env.TRIANGULATOR_FORCE_OSC_PROGRESS ?? env.ORACLE_FORCE_OSC_PROGRESS;
  const disable = env.TRIANGULATOR_NO_OSC_PROGRESS ?? env.ORACLE_NO_OSC_PROGRESS;
  const mappedEnv = {
    ...env,
    TRIANGULATOR_FORCE_OSC_PROGRESS: force,
    TRIANGULATOR_NO_OSC_PROGRESS: disable,
  };
  if (mappedEnv.CODEX_MANAGED_BY_NPM === '1' && mappedEnv.TRIANGULATOR_FORCE_OSC_PROGRESS !== '1') {
    return false;
  }
  return supportsOscProgressShared(mappedEnv, isTty, {
    disableEnvVar: 'TRIANGULATOR_NO_OSC_PROGRESS',
    forceEnvVar: 'TRIANGULATOR_FORCE_OSC_PROGRESS',
  });
}

export function startOscProgress(options: OscProgressOptions = {}): () => void {
  const env = options.env ?? process.env;
  const force = env.TRIANGULATOR_FORCE_OSC_PROGRESS ?? env.ORACLE_FORCE_OSC_PROGRESS;
  const disable = env.TRIANGULATOR_NO_OSC_PROGRESS ?? env.ORACLE_NO_OSC_PROGRESS;
  const mappedEnv = {
    ...env,
    TRIANGULATOR_FORCE_OSC_PROGRESS: force,
    TRIANGULATOR_NO_OSC_PROGRESS: disable,
  };
  if (mappedEnv.CODEX_MANAGED_BY_NPM === '1' && mappedEnv.TRIANGULATOR_FORCE_OSC_PROGRESS !== '1') {
    return () => {};
  }
  return startOscProgressShared({
    ...options,
    env: mappedEnv,
    // Preserve Triangulator's previous default: progress emits to stdout.
    write: options.write ?? ((text) => process.stdout.write(text)),
    disableEnvVar: 'TRIANGULATOR_NO_OSC_PROGRESS',
    forceEnvVar: 'TRIANGULATOR_FORCE_OSC_PROGRESS',
  });
}
