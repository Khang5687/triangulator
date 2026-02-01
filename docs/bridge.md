# Bridge (Windows-hosted Perplexity session → Linux clients)

Triangulator’s bridge workflow lets you keep an authenticated Perplexity session on a Windows machine while running Triangulator (CLI + `triangulator-mcp`) from Linux boxes (often over SSH), without exporting browser cookies off Windows.

## Concepts

- **Host (Windows)**: runs `triangulator bridge host` and holds the signed-in Perplexity session.
- **Client (Linux)**: stores the host connection once and routes browser runs (and MCP browser runs) through the host.

## 1) Windows: start the host service (recommended)

Run this on the Windows machine that’s signed into Perplexity:

```powershell
triangulator bridge host --token auto --ssh user@your-linux-host
```

What it does:

- Starts a local `triangulator serve` instance bound to `127.0.0.1:9473` by default.
- Generates an access token (stored to disk; not printed unless you ask).
- Starts an SSH reverse tunnel so the Linux host can reach the Windows service at `127.0.0.1:9473`.
- Writes a connection artifact to `~/.triangulator/bridge-connection.json` (contains host + token).

Useful flags:

- Bind a different local port: `--bind 127.0.0.1:9474`
- Use a specific token: `--token <value>`
- Print the connection string (includes token): `--print`
- Print only the token: `--print-token`
- SSH port/custom args: `--ssh-extra-args "-p 2222"`
- Background mode (writes pid/log files under `~/.triangulator`): `--background`

## 2) Linux: configure the client once

Copy the connection artifact from Windows to Linux (example from Windows → Linux):

```powershell
scp "$env:USERPROFILE\.triangulator\bridge-connection.json" user@your-linux-host:~/bridge-connection.json
```

Then on the Linux host:

```bash
triangulator bridge client --connect ~/bridge-connection.json --write-config --test
```

This writes:

- `~/.triangulator/config.json` → `browser.remoteHost` and `browser.remoteToken`

Now browser runs automatically route through the host:

```bash
triangulator --engine browser -p "hello" --file README.md
```

## 2b) Linux desktop: local manual-login (no bridge)

If you’re physically on a Linux desktop and just want Triangulator to reuse a local signed-in Chrome profile (no Windows bridge):

1) Run a browser session once and sign in when Chrome opens:

```bash
TRIANGULATOR_HOME_DIR=~/.triangulator-local \
TRIANGULATOR_BROWSER_PROFILE_DIR=~/.triangulator-local/browser-profile \
triangulator --engine browser --browser-manual-login --browser-keep-browser -p "hello"
```

2) After you’re signed in, reuse the same env vars for future runs (no more login prompts).

Optional: use the helper wrapper `scripts/triangulator-local-browser.sh` to avoid repeating flags/env vars:

```bash
chmod +x ./scripts/triangulator-local-browser.sh
./scripts/triangulator-local-browser.sh -p "hello" --file README.md
```

## 3) Codex CLI (MCP) integration

On the Linux machine where Codex runs:

```bash
triangulator bridge codex-config
```

Paste the printed snippet into `~/.codex/config.toml`.

## 3b) Claude Code (MCP) integration

On the Linux machine where Claude Code runs:

```bash
triangulator bridge claude-config > .mcp.json
```

Then start Claude Code with that config (or register it via `claude mcp add` depending on your setup).

Notes:

- The snippet includes `TRIANGULATOR_ENGINE="browser"` so MCP consult calls use browser mode even if `OPENAI_API_KEY` is set.
- By default the snippets leave `TRIANGULATOR_REMOTE_TOKEN` as `<YOUR_TOKEN>` to avoid printing secrets; rerun with `--print-token` if you explicitly want it included.

## 4) Troubleshooting

Run:

```bash
triangulator bridge doctor
```

It checks:

- Whether a remote host/token is configured
- TCP reachability to the remote host
- Remote auth via `GET /health` (token-protected)
- If no remote is configured, it probes local Chrome + cookie DB detection and suggests `--browser-chrome-path` / `--browser-cookie-path`

## Security notes

- Tokens are not printed by default.
- The connection artifact and config file contain secrets; keep them private (Triangulator writes them with restrictive permissions on Unix).
- Bridge does **not** extract/decrypt cookies from arbitrary profiles; the Windows machine keeps the authenticated session locally.
