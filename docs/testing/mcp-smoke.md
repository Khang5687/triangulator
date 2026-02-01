# MCP Smoke Tests (local triangulator-mcp)

Use these steps to validate CLI + MCP end-to-end before releasing. The npm package now ships `triangulator-mcp`, but the local build remains the fastest path for development (see the `triangulator-local` entry in `config/mcporter.json`).

## Checklist (run all four lanes)
1) CLI (API engine)
2) CLI (browser engine)
3) MCP via mcporter (API + browser)
4) Claude Code via MCP (API defaults)

Shared prereqs
- `pnpm build` (ensures `dist/bin/triangulator-mcp.js` exists)
- `OPENAI_API_KEY` set in env
- `config/mcporter.json` contains the `triangulator` entry pointing to `npx -y triangulator triangulator-mcp` (already committed).
- mcporter available at `/Users/steipete/Library/pnpm/global/5/node_modules/.bin/mcporter`
- For browser runs: Chrome installed; macOS host (headful).
- macOS notifications: `vendor/triangulator-notifier/TriangulatorNotifier.app` ships with the package (preferred); falls back to toasted-notifier if missing/broken.

## CLI smokes
- API:
  ```bash
  pnpm run triangulator -- --engine api --model gpt-5.2 --prompt "API smoke: say two words"
  ```
- Browser:
  ```bash
  pnpm run triangulator -- --engine browser --model "GPT-5.2" --prompt "Browser smoke: say two words"
  ```

## MCP via mcporter
1) List tools/schema to confirm discovery (use the local entry):
   ```bash
   mcporter list triangulator-local --schema --config config/mcporter.json
   ```

2) API consult (GPT-5.2):
   ```bash
   mcporter call triangulator-local.consult \
     prompt:"Say hello from GPT-5.2" \
     model:"gpt-5.2" \
     engine:"api" \
     --config config/mcporter.json
   ```

3) Sessions list:
   ```bash
   mcporter call triangulator-local.sessions hours:12 limit:3 --config config/mcporter.json
   ```

4) Session detail:
   ```bash
   mcporter call triangulator-local.sessions id:"say-hello-from-gpt-5-2" detail:true --config config/mcporter.json
   ```

5) Browser smoke:
   ```bash
   mcporter call triangulator-local.consult \
     prompt:"Browser smoke" \
     model:"GPT-5.2" \
     engine:"browser" \
     --config config/mcporter.json
   ```
   Uses a built-in browserConfig (Perplexity URL + cookie sync) and the provided model label for the picker (heads-up: if the Perplexity UI renames the model label, this may need an update).

## Claude Code smoke (tmux + cli)

Use this to verify Claude Code can reach the Triangulator MCP server end-to-end.

Prereqs
- `pnpm build`
- `OPENAI_API_KEY` exported (for the API engine default)
- Triangulator MCP registered with Claude (once per project):  
  `claude mcp add --transport stdio triangulator -- triangulator-mcp`

Steps
1) Start Claude in tmux:
   ```bash
   tmux new -s claude-smoke 'cd /Users/steipete/Projects/triangulator && OPENAI_API_KEY=$OPENAI_API_KEY claude --permission-mode bypassPermissions --mcp-config ~/.mcp/triangulator.json'
   ```
2) From another shell, use the helper to drive it:
   ```bash
   bun scripts/agent-send.ts --session claude-smoke --wait-ms 800 --entry double -- \
     'Call the triangulator sessions MCP tool with {"limit":1,"detail":true} and show the result'
   ```
3) Validate the pane shows a successful `triangulator sessions` tool call (or adjust `--mcp-config` if it reports no tools). When finished, `tmux kill-session -t claude-smoke`.

See `docs/mcp.md` for full tool/resource schemas and behavior.

Tip: The MCP consult tool pulls defaults from your `~/.triangulator/config.json` (engine/model/search/prompt suffix/heartbeat/background/filesReport) when the call doesn’t override them.
