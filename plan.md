# Perplexity Migration Plan (Triangulator)

## 0) Purpose
Adapt Triangulator to Perplexity-only browser automation and Spaces. Remove ChatGPT assumptions, rename oracle -> triangulator, and migrate config home to `~/.triangulator/config.json` (auto-copy from `~/.oracle`). Keep structure close to upstream Oracle to minimize merge conflicts.

## 0.1) Status update (2026-02-02)
- Completed: user-facing Triangulator renames in CLI/docs/tests; Perplexity URL defaults + Spaces wording; config auto-copy logic to `~/.triangulator`; notifier rename; `chatgptUrl` retained only as hidden legacy alias.
- In-progress: Perplexity-specific selectors for composer/attachments/response capture (needs discovery).
- Remaining: one-time local copy `~/.oracle/config.json` -> `~/.triangulator/config.json`; run Perplexity smoke tests; finalize attachment selectors.
- Note: internal module names (e.g. `src/oracle`) kept to minimize upstream merge conflicts; user-facing strings are Triangulator.

## 0.2) Attachment retry reliability plan (2026-02-03)
- Goal: avoid false-positive attachment retries while still retrying on genuine parse/upload failures.
- Strategy: multi-signal gating (Network + UI + response text).
  - Network: monitor CDP Network responses for upload/parse errors.
  - UI: confirm attachment chips/counts and detect toast/error messages.
  - Response: parse assistant text for explicit file parse errors.
- Retry only when:
  - network monitor reports failures (matched or ambiguous), OR
  - response parse failure + UI uncertainty (timed-out upload, input-only, or no UI confirmation).

## 0.3) Execution steps (this change)
1) Track attachment UI confirmation state during upload and after send.
2) Start per-attempt network monitor; stop after answer capture.
3) Feed network/UI signals into response-retry planner.
4) Update tests for retry planner to cover new gating.
5) Run unit tests for attachment retry + config/controls.

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
- Support Perplexity Space modes: Search / Deep research / Create files and apps (Labs).
- Search-only model selector + optional thinking toggle (ignore when unsupported/forced).
- Sources selection (Web, Academic, Social + connectors) with skip/abort behavior.
- Recency selector (default: last year) with config + CLI flag.
- Rename all user-facing Oracle references to Triangulator.
- Migrate config to `~/.triangulator/config.json` and use it everywhere (prod + tests).
- Keep model logic unchanged for now.
- Minimize diff to ease upstream Oracle merges.

## 3) Non-goals
- Multi-provider support or ChatGPT compatibility in Triangulator.
- Changes to model selection logic (future work).
- Connect Files (Perplexity connectors for file sources) support.
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

### E) Perplexity mode/settings support
- [PENDING] Config + CLI flags for mode, recency, sources, connectors, thinking, model fallback.
- [PENDING] Help text for all new flags (with defaults).

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
- Input selectors (ordered): `#ask-input[contenteditable="true"]`, `[contenteditable="true"][role="textbox"]`
- Editor type (textarea or contenteditable): contenteditable div (`#ask-input`)
- Send button selectors: `button.bg-subtle.text-foreground.border-2.!border-inverse` (blue submit button; no aria-label)
- Disabled state signals: [TODO]
- Commit signals (prove prompt accepted): [TODO]

### 5.5 Attachments (required)
- Upload supported: yes (file input present)
- File input selectors: `input[type="file"][data-testid="file-upload-input"]` (multiple), plus hidden `input[type="file"][multiple]` with accept list
- Open-attachment action: `button[aria-label="Attach files"]`
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

### 5.8 Mode selector (Spaces UI)
- Mode control location (Search / Deep research / Create files and apps): buttons above composer
- Selector(s) for each mode tab/button: `button[role="radio"][aria-label="Search"]`, `button[role="radio"][aria-label="Deep research"]`, `button[role="radio"][aria-label="Create files and apps"]`
- Active-state indicator: `aria-checked="true"` / `data-state="checked"`
- Availability/disabled states (plan limits): [TODO]

### 5.9 Search model + thinking toggle
- Model picker location (Search only): `button[aria-label="Choose a model"]`
- Model list item selectors + value mapping: `div[role="menuitem"]` inside `div[role="menu"]` (labels: Best, Sonar, Gemini 3 Flash/Pro, GPT-5.2, Claude Sonnet 4.5, Claude Opus 4.5 max, Grok 4.1, Kimi K2.5)
- Thinking toggle selector + on/off state: not found yet (likely model-dependent)
- Models with forced/unsupported thinking: [TODO]
- Plan-gated models behavior (e.g., Opus 4.5): [TODO]

### 5.10 Sources + connectors
- Sources menu selector (Web / Academic / Social): `button[aria-label="Sources"]` (menu not observed via DOM click yet)
- Connectors list container selector: [TODO]
- Connector toggle selector + disabled state indicator: [TODO]
- "No access / connect required" indicator: [TODO]
- Save/apply button selector (if any): [TODO]

### 5.11 Recency selector
- Recency menu selector: `button[aria-label="Set recency for web search"]`
- Supported values + selectors (default: last year): `div[role="menuitem"]` with labels All Time / Today / Last Week / Last Month / Last Year

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
- Add mode selection (Search / Deep research / Create files and apps).
- Add search-only model picker + thinking toggle.
- Add sources + connectors toggles with skip/abort behavior.
- Add recency selector with default fallback.

### Phase D: Docs + tests
- Update docs to Perplexity + Triangulator naming + new config path.
- Update tests that assert oracle strings or paths.
- Publish CLI options inventory.
- Document new flags + config keys (mode, thinking, sources, connectors, recency, model_fallback, skip_failed_sources).

## 7) Testing plan
- Config migration test (auto-copy).
- Browser smoke: Perplexity Spaces prompt + attachments + response capture.
- Browser smoke: mode switch, model selection (Search), thinking toggle (where supported).
- Browser smoke: sources/connectors + recency.
- No ChatGPT browser tests in Triangulator.

## 8) Acceptance criteria
- Triangulator uses Perplexity Spaces URLs and works with attachments.
- No chatgpt.com references remain in user-facing output/docs.
- Config path is `~/.triangulator/config.json` and auto-copies from `~/.oracle` on first run.
- Model logic unchanged.
- Modes selectable (Search/Deep research/Create files and apps); Search-only model selection works.
- Thinking toggle is honored when supported, ignored when forced/unsupported.
- Sources + recency configuration applied; connectors skip/abort behavior respects `skip_failed_sources`.
