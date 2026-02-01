import chalk from 'chalk';
import os from 'node:os';
import path from 'node:path';
import { loadUserConfig } from '../../config.js';
import { resolveRemoteServiceConfig } from '../../remote/remoteServiceConfig.js';

export interface BridgeClaudeConfigCliOptions {
  printToken?: boolean;
}

export async function runBridgeClaudeConfig(options: BridgeClaudeConfigCliOptions): Promise<void> {
  const { config: userConfig } = await loadUserConfig();
  const resolved = resolveRemoteServiceConfig({
    cliHost: undefined,
    cliToken: undefined,
    userConfig,
    env: process.env,
  });

  const snippet = formatClaudeMcpConfig({
    oracleHomeDir: process.env.TRIANGULATOR_HOME_DIR ?? process.env.ORACLE_HOME_DIR ?? path.join(os.homedir(), '.triangulator-local'),
    browserProfileDir:
      process.env.TRIANGULATOR_BROWSER_PROFILE_DIR ??
      process.env.ORACLE_BROWSER_PROFILE_DIR ??
      path.join(os.homedir(), '.triangulator-local', 'browser-profile'),
    remoteHost: resolved.host,
    remoteToken: resolved.token,
    includeToken: Boolean(options.printToken),
  });

  console.log(snippet);
  if (!options.printToken) {
    console.log('');
    console.log(chalk.dim('Tip: rerun with --print-token to include TRIANGULATOR_REMOTE_TOKEN in the snippet.'));
  }
}

export function formatClaudeMcpConfig({
  oracleHomeDir,
  browserProfileDir,
  remoteHost,
  remoteToken,
  includeToken,
}: {
  oracleHomeDir: string;
  browserProfileDir: string;
  remoteHost?: string;
  remoteToken?: string;
  includeToken: boolean;
}): string {
  const env: Record<string, string> = {};
  // biome-ignore lint/complexity/useLiteralKeys: env vars are uppercase and include underscores.
  env['TRIANGULATOR_ENGINE'] = 'browser';
  // biome-ignore lint/complexity/useLiteralKeys: env vars are uppercase and include underscores.
  env['TRIANGULATOR_HOME_DIR'] = oracleHomeDir;
  // biome-ignore lint/complexity/useLiteralKeys: env vars are uppercase and include underscores.
  env['TRIANGULATOR_BROWSER_PROFILE_DIR'] = browserProfileDir;

  if (remoteHost) {
    // biome-ignore lint/complexity/useLiteralKeys: env vars are uppercase and include underscores.
    env['TRIANGULATOR_REMOTE_HOST'] = remoteHost;
    // biome-ignore lint/complexity/useLiteralKeys: env vars are uppercase and include underscores.
    env['TRIANGULATOR_REMOTE_TOKEN'] = includeToken ? remoteToken ?? '<YOUR_TOKEN>' : '<YOUR_TOKEN>';
  }

  // Claude Code supports project-scoped `.mcp.json` config files:
  // https://docs.anthropic.com/en/docs/claude-code/mcp
  return JSON.stringify(
    {
      mcpServers: {
        triangulator: {
          type: 'stdio',
          command: 'triangulator-mcp',
          args: [],
          env,
        },
      },
    },
    null,
    2,
  );
}
