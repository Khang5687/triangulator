// Ensure API keys are present during tests so runOracle doesn't fail early when CI
// runs without real credentials.
import os from 'node:os';
import path from 'node:path';

process.env.OPENAI_API_KEY ||= 'sk-test';
process.env.GEMINI_API_KEY ||= 'gm-test';
process.env.TRIANGULATOR_MIN_PROMPT_CHARS ||= '1';
// Avoid writing under ~/.triangulator in constrained environments; keep test sessions isolated.
process.env.TRIANGULATOR_HOME_DIR ||= path.join(os.tmpdir(), `triangulator-tests-${process.pid}`);
process.env.ORACLE_HOME_DIR ||= process.env.TRIANGULATOR_HOME_DIR;
delete process.env.TRIANGULATOR_ENGINE;
delete process.env.TRIANGULATOR_REMOTE_HOST;
delete process.env.TRIANGULATOR_REMOTE_TOKEN;
delete process.env.ORACLE_ENGINE;
delete process.env.ORACLE_REMOTE_HOST;
delete process.env.ORACLE_REMOTE_TOKEN;
