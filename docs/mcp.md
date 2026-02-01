# MCP Server

`triangulator-mcp` is a minimal MCP stdio server that mirrors the Triangulator CLI. It shares session storage with the CLI (`~/.triangulator/sessions` or `TRIANGULATOR_HOME_DIR`) so you can mix and match: run with the CLI, inspect or re-run via MCP, or vice versa.

## Tools

### `consult`
- Inputs: `prompt` (required), `files?: string[]` (globs), `model?: string` (defaults to CLI), `engine?: "api" | "browser"` (CLI auto-defaults), `slug?: string`.
- Browser-only extras: `browserAttachments?: "auto"|"never"|"always"`, `browserBundleFiles?: boolean`, `browserThinkingTime?: "light"|"standard"|"extended"|"heavy"`, `browserKeepBrowser?: boolean`, `browserModelLabel?: string`.
- Behavior: starts a session, runs it with the chosen engine, returns final output + metadata. Background/foreground follows the CLI (e.g., GPT‑5 Pro detaches by default).
- Logging: emits MCP logs (`info` per line, `debug` for streamed chunks with byte sizes). If browser prerequisites are missing, returns an error payload instead of running.

### `sessions`
- Inputs: `{id?, hours?, limit?, includeAll?, detail?}` mirroring `triangulator status` / `triangulator session`.
- Behavior: without `id`, returns a bounded list of recent sessions. With `id`/slug, returns a summary row; set `detail: true` to fetch full metadata, log, and stored request body.

## Resources
- `triangulator-session://{id}/{metadata|log|request}` — read-only resources that surface stored session artifacts via MCP resource reads.

## Background / detach behavior
- Same as the CLI: heavy models (e.g., GPT‑5 Pro) detach by default; reattach via `triangulator session <id>` / `triangulator status`. MCP does not expose extra background flags.

## Launching & usage
- Installed from npm:
  - One-off: `npx triangulator triangulator-mcp`
  - Global: `triangulator-mcp`
- From the repo (contributors):
  - `pnpm build`
  - `pnpm mcp` (or `triangulator-mcp` in the repo root)
- mcporter example (stdio):
  ```json
  {
    "name": "triangulator",
    "type": "stdio",
    "command": "npx",
    "args": ["triangulator", "triangulator-mcp"]
  }
  ```
- Project-scoped Claude (.mcp.json) example:
  ```json
  {
    "mcpServers": {
      "triangulator": { "type": "stdio", "command": "npx", "args": ["triangulator", "triangulator-mcp"] }
    }
  }
  ```
- Bridge helper snippets:
  - Codex CLI: `triangulator bridge codex-config`
  - Claude Code: `triangulator bridge claude-config`
- Tools and resources operate on the same session store as `triangulator status|session`.
- Defaults (model/engine/etc.) come from your Triangulator CLI config; see `docs/configuration.md` or `~/.triangulator/config.json`.
