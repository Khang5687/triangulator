# Testing quickstart

- Unit/type tests: `pnpm test` (Vitest) and `pnpm run check` (typecheck).
- Gemini unit/regression: `pnpm vitest run tests/gemini.test.ts tests/gemini-web`.
- Browser smokes: `pnpm test:browser` (builds, checks DevTools port 45871, then runs headful browser smokes with GPT-5.2 for most cases and GPT-5.2 Pro for the reattach + markdown checks). Requires a signed-in Chrome profile; runs headful but hides the window by default unless Chrome forces focus.
- Live API smokes: `TRIANGULATOR_LIVE_TEST=1 OPENAI_API_KEY=… pnpm test:live` (excludes OpenAI pro), `TRIANGULATOR_LIVE_TEST=1 OPENAI_API_KEY=… pnpm test:pro` (OpenAI pro live). Expect real usage/cost.
- Gemini web (cookie) live smoke: `TRIANGULATOR_LIVE_TEST=1 pnpm vitest run tests/live/gemini-web-live.test.ts` (requires a signed-in Chrome profile at `gemini.google.com`).
- MCP focused: `pnpm test:mcp` (builds then stdio smoke via mcporter).
- If browser DevTools is blocked on WSL, allow the chosen port (`TRIANGULATOR_BROWSER_PORT`/`TRIANGULATOR_BROWSER_DEBUG_PORT`, defaults to 45871); see `scripts/test-browser.ts` output for firewall hints.
