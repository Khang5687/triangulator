# Perplexity Migration Plan (Triangulator)

## 0) Purpose
Document what must change to adapt the current ChatGPT browser automation to Perplexity.ai while keeping existing config behavior intact. This file is a template; fill in the Perplexity details after manual testing.

## 1) Current architecture map (ChatGPT path)
- Orchestration: src/browser/index.ts (runBrowserMode/runRemoteBrowserMode)
- Config/defaults: src/browser/config.ts, src/browser/types.ts, src/cli/browserConfig.ts, src/cli/browserDefaults.ts
- ChatGPT selectors/constants: src/browser/constants.ts
- Navigation + auth: src/browser/actions/navigation.ts (uses /backend-api/me)
- Model selection: src/browser/actions/modelSelection.ts
- Prompt composer: src/browser/actions/promptComposer.ts
- Attachments: src/browser/actions/attachments.ts, src/browser/actions/remoteFileTransfer.ts
- Response capture: src/browser/actions/assistantResponse.ts
- Reattach: src/browser/reattach.ts, src/browser/reattachHelpers.ts
- Docs: docs/browser-mode.md, docs/configuration.md, src/cli/help.ts

## 2) Goals
- Add Perplexity.ai browser automation without breaking ChatGPT or Gemini paths.
- Keep config behavior and defaults consistent for ChatGPT.
- Rename user-facing product text to Triangulator where safe, but keep existing config path and env vars unless explicitly migrating.

## 3) Non-goals (for initial cut)
- Full refactor of all browser actions into generic selectors.
- Perplexity model picker or thinking-time support unless explicitly discovered and requested.

## 4) Proposed approach (adapter-based)
Create a small site adapter layer so each target site owns its selectors and behaviors:
- ChatGPT adapter wraps existing logic and selectors with no behavior change.
- Perplexity adapter provides its own selectors, auth probe, prompt submit, response capture, and required attachments support plus optional model selection.
- Resolver chooses adapter by hostname or explicit config option.

## 5) Perplexity discovery checklist (fill after testing)
### 5.1 Target site basics
- Base URL (canonical): [TODO]
- Supported hostnames for resolver: [TODO]
- Conversation URL pattern(s): [TODO]
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

### 5.5 Model selection (optional)
- Model picker exists: [TODO]
- Open-menu selector: [TODO]
- Menu container selector: [TODO]
- Menu item selector: [TODO]
- Current model label selector: [TODO]
- Matching strategy: [TODO]
- Failure mode (strict vs best-effort): [TODO]

### 5.6 Attachments (required)
- Upload supported: [TODO]
- File input selectors: [TODO]
- Open-attachment action: [TODO]
- Upload-in-progress signals: [TODO]
- Attachment chip selectors: [TODO]
- Completion signals: [TODO]
- DataTransfer injection viable: [TODO]

### 5.7 Response capture
- Answer root selectors: [TODO]
- Streaming indicator (stop button or spinner): [TODO]
- Completion indicator (stop disappears or stable text): [TODO]
- Copy-to-markdown button selector (if any): [TODO]

### 5.8 Reattach
- Stable conversation key extraction: [TODO]
- Build URL from key: [TODO]
- Sidebar or history navigation needed: [TODO]

## 6) Implementation plan (once checklist is filled)
### Phase A: Adapter skeleton (no behavior change)
- Add adapter interfaces and resolver.
- Create ChatGPT adapter that wraps existing logic and selectors.
- Update orchestration to route through adapter.

### Phase B: Perplexity core path (minimal viable)
- Implement Perplexity adapter with selectors and auth probe.
- Implement Perplexity prompt submission, attachments, and response capture.
- Disable model selection and thinking time by default for Perplexity.

### Phase C: Optional capabilities
- Model selection if supported.
- Reattach improvements if needed beyond URL-based.

### Phase D: Docs and naming
- Update docs to mention Perplexity support and site selection.
- Update CLI or help text to say Triangulator where safe.
- Keep config path and env vars unchanged unless a migration plan is agreed.

## 7) Testing plan
- Unit tests for adapter resolver and config defaults.
- Browser smoke for ChatGPT with no regression.
- Perplexity manual smoke with login, prompt, response capture.
- Attachment tests required.

## 8) Open questions
- Do we want an explicit browser-site flag, or rely on URL inference: [TODO]
- Should Perplexity support model selection on day one: [TODO]
- Should we rename config path and env vars now or later: [TODO]

## 9) Acceptance criteria
- ChatGPT browser mode behavior unchanged from baseline.
- Perplexity prompt can be sent and response captured reliably.
- Clear error when user requests unsupported features (model selection, thinking time).
- Docs describe how to use Perplexity and how to supply selectors.
