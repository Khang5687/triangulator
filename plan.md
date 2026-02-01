# Perplexity Migration Plan (Triangulator)

## 0) Purpose
Adapt Triangulator to Perplexity-only browser automation and Spaces. Remove ChatGPT assumptions, rename oracle -> triangulator, and migrate config home to `~/.triangulator/config.json` (auto-copy from `~/.oracle`). Keep structure close to upstream Oracle to minimize merge conflicts.

## 0.1) Status update (2026-02-01)
- Completed: user-facing Triangulator renames in CLI/docs/tests; Perplexity URL defaults + Spaces wording; config auto-copy logic to `~/.triangulator`; notifier rename; `chatgptUrl` retained only as hidden legacy alias.
- In-progress: Perplexity-specific selectors for composer/attachments/response capture (needs discovery).
- Remaining: one-time local copy `~/.oracle/config.json` -> `~/.triangulator/config.json`; run Perplexity smoke tests; finalize attachment selectors.
- Note: internal module names (e.g. `src/oracle`) kept to minimize upstream merge conflicts; user-facing strings are Triangulator.

## 1) Current architecture map (legacy ChatGPT path to replace)
- Orchestration: `src/browser/index.ts` (runBrowserMode/runRemoteBrowserMode)
- Config/defaults: `src/browser/config.ts`, `src/browser/types.ts`, `src/cli/browserConfig.ts`, `src/cli/browserDefaults.ts`
- Selectors/constants: `src/browser/constants.ts`
- Navigation + auth: `src/browser/actions/navigation.ts`
- Model selection: `src/browser/actions/modelSelection.ts` (keep logic unchanged for now)
- Prompt composer: `src/browser/actions/promptComposer.ts`
- Attachments: `src/browser/actions/attachments.ts`, `src/browser/actions/remoteFileTransfer.ts`
- Response capture: `src/browser/actions/assistantResponse.ts`
- Reattach: `src/browser/reattach.ts`, `src/browser/reattachHelpers.ts`
- CLI entry + help: `bin/triangulator-cli.ts`, `src/cli/*`
- Docs: `README.md`, `docs/*`, `CHANGELOG.md`

## 2) Goals
- Perplexity only (no chatgpt.com support in Triangulator).
- Spaces URLs supported (e.g. `https://www.perplexity.ai/spaces/...`).
- Attachments supported on Perplexity.
- Rename all user-facing Oracle references to Triangulator.
- Migrate config to `~/.triangulator/config.json` and use it everywhere (prod + tests).
- Keep model logic unchanged for now.
- Minimize diff to ease upstream Oracle merges.

## 3) Non-goals
- Multi-provider support or ChatGPT compatibility in Triangulator.
- Changes to model selection logic (future work).
- Large refactors that diverge heavily from upstream.

## 4) Immediate to-dos (this round)
### A) Finish rename + Perplexity constants
- [DONE] Replace user-facing "oracle"/"ChatGPT" strings in CLI, docs, tests.
- [DONE] CLI flags: `--perplexity-url` primary, keep `--chatgpt-url` as hidden legacy alias.
- [DONE] Base URL constant to `https://www.perplexity.ai/`.
- [DONE] Projects -> Spaces wording.

### B) Config + cookie migration
- [DONE] Default home to `~/.triangulator` and auto-copy legacy config on first run.
- [DONE] Update cookie path defaults and env vars to `TRIANGULATOR_*` with `ORACLE_*` fallback.
- [PENDING] One-time user filesystem copy: `~/.oracle/config.json` -> `~/.triangulator/config.json` (requires local permission).

### C) Attachments stay enabled
- [PARTIAL] Pipeline preserved; Perplexity selectors to be filled after discovery.

### D) CLI options inventory
- [DONE] Options list compiled from `bin/triangulator-cli.ts` (see chat response).

## 5) Perplexity discovery checklist (fill after testing)
### 5.1 Target site basics
- Base URL (canonical): [TODO]
- Supported hostnames: [TODO]
- Spaces URL pattern(s): [TODO]
- Login URL pattern(s): [TODO]
- Cloudflare or interstitial signals: [TODO]

### 5.2 Auth check
- Authenticated endpoint (method + path + expected status): [TODO]
- Required credentials mode: [TODO]
- DOM logged-out indicators (selectors or text): [TODO]
- DOM logged-in indicators (selectors): [TODO]

### 5.3 Cookie sync
- Cookie domains or origins needed: [TODO]
- Minimal cookie allowlist (optional): [TODO]
- Extra auth domains (SSO, etc): [TODO]

### 5.4 Composer input
- Input selectors (ordered): [TODO]
- Editor type (textarea or contenteditable): [TODO]
- Send button selectors: [TODO]
- Disabled state signals: [TODO]
- Commit signals (prove prompt accepted): [TODO]

### 5.5 Attachments (required)
- Upload supported: [TODO]
- File input selectors: [TODO]
- Open-attachment action: [TODO]
- Upload-in-progress signals: [TODO]
- Attachment chip selectors: [TODO]
- Completion signals: [TODO]
- DataTransfer injection viable: [TODO]

### 5.6 Response capture
- Answer root selectors: [TODO]
- Streaming indicator (stop button or spinner): [TODO]
- Completion indicator (stop disappears or stable text): [TODO]
- Copy-to-markdown button selector (if any): [TODO]

### 5.7 Reattach
- Stable space key extraction: [TODO]
- Build URL from key: [TODO]
- Sidebar or history navigation needed: [TODO]

## 6) Implementation plan (once checklist is filled)
### Phase A: Config + naming migration
- Switch home dir default to `~/.triangulator` with env override.
- Auto-copy `~/.oracle/config.json` -> `~/.triangulator/config.json` if missing.
- Update all user-facing text to Triangulator.

### Phase B: Perplexity URL + cookie plumbing
- Rename `chatgptUrl` -> `perplexityUrl` in config/CLI/docs (read legacy keys for migration only).
- Update base URL constant to `https://www.perplexity.ai/`.
- Update cookie origin list to Perplexity domains.
- Update login/log messages to Perplexity wording.

### Phase C: Perplexity Spaces UI
- Replace selectors for prompt input, send button, attachments, answer capture.
- Implement Perplexity auth probe (DOM or endpoint).
- Update reattach logic for Spaces URLs.

### Phase D: Docs + tests
- Update docs to Perplexity + Triangulator naming + new config path.
- Update tests that assert oracle strings or paths.
- Publish CLI options inventory.

## 7) Testing plan
- Config migration test (auto-copy).
- Browser smoke: Perplexity Spaces prompt + attachments + response capture.
- No ChatGPT browser tests in Triangulator.

## 8) Acceptance criteria
- Triangulator uses Perplexity Spaces URLs and works with attachments.
- No chatgpt.com references remain in user-facing output/docs.
- Config path is `~/.triangulator/config.json` and auto-copies from `~/.oracle` on first run.
- Model logic unchanged.
