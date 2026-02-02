import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BrowserLogger, ChromeClient, PerplexityMode, PerplexityRecency } from '../types.js';
import {
  MENU_CONTAINER_SELECTOR,
  MENU_ITEM_SELECTOR,
  PERPLEXITY_MODE_BUTTONS,
  PERPLEXITY_MODEL_BUTTON_SELECTOR,
  PERPLEXITY_RECENCY_BUTTON_SELECTOR,
  PERPLEXITY_SOURCES_BUTTON_SELECTOR,
} from '../constants.js';
import { logDomFailure } from '../domDebug.js';
import { delay } from '../utils.js';
import { buildClickDispatcher } from './domEvents.js';

export async function ensurePerplexityMode(
  Runtime: ChromeClient['Runtime'],
  mode: PerplexityMode,
  logger: BrowserLogger,
) {
  const deadline = Date.now() + 7000;
  let lastDebug: { url?: string; labels?: string[] } | null = null;
  while (Date.now() < deadline) {
    const outcome = await Runtime.evaluate({
      expression: buildModeSelectionExpression(mode),
      awaitPromise: true,
      returnByValue: true,
    });
    const result = outcome.result?.value as
      | { status: 'selected' | 'already-selected'; label: string }
      | { status: 'missing'; debug?: { url?: string; labels?: string[] } };
    if (result && result.status !== 'missing') {
      const label = result.label ?? mode;
      logger(`Perplexity mode: ${label}`);
      return;
    }
    if (result?.debug) {
      lastDebug = result.debug;
    }
    await delay(250);
  }
  if (lastDebug?.labels?.length) {
    logger(
      `Perplexity mode controls missing on ${lastDebug.url ?? 'unknown page'}; ` +
        `candidates: ${lastDebug.labels.join(' | ')}`,
    );
  }
  await logDomFailure(Runtime, logger, 'perplexity-mode');
  throw new Error('Unable to locate Perplexity mode controls.');
}

export async function ensurePerplexityRecency(
  Runtime: ChromeClient['Runtime'],
  recency: PerplexityRecency,
  logger: BrowserLogger,
) {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline) {
    const outcome = await Runtime.evaluate({
      expression: buildRecencySelectionExpression(recency),
      awaitPromise: true,
      returnByValue: true,
    });
    const result = outcome.result?.value as
      | { status: 'selected' | 'already-selected'; label: string }
      | { status: 'menu-missing' | 'option-missing' | 'button-missing' };
    if (result && (result.status === 'selected' || result.status === 'already-selected')) {
      logger(`Recency: ${result.label}`);
      return;
    }
    await delay(250);
  }
  await logDomFailure(Runtime, logger, 'perplexity-recency');
  throw new Error('Unable to select Perplexity recency filter.');
}

export async function ensurePerplexitySources(
  Runtime: ChromeClient['Runtime'],
  logger: BrowserLogger,
  options: {
    sources?: string[] | null;
    connectors?: string[] | null;
    skipFailedSources?: boolean;
  },
) {
  const sources = options.sources ?? [];
  const connectors = options.connectors ?? [];
  const targets = [...sources, ...connectors].filter(Boolean);
  if (targets.length === 0) {
    return;
  }
  const outcome = await Runtime.evaluate({
    expression: buildSourcesSelectionExpression(targets),
    awaitPromise: true,
    returnByValue: true,
  });
  const result = outcome.result?.value as {
    status: 'ok' | 'menu-missing' | 'button-missing';
    missing?: string[];
    disabled?: string[];
    toggled?: string[];
    already?: string[];
    snapshot?: { sample: string; candidates: string[] };
  };
  if (!result || result.status !== 'ok') {
    await logDomFailure(Runtime, logger, 'perplexity-sources');
  }

  const missing = result?.missing ?? [];
  const disabled = result?.disabled ?? [];
  if (missing.length === 0 && disabled.length === 0) {
    if (result?.toggled?.length) {
      logger(`Sources updated: ${result.toggled.join(', ')}`);
    }
    return;
  }

  const skip = options.skipFailedSources !== false;
  if (skip) {
    logger(`Sources skipped (unavailable): ${[...missing, ...disabled].join(', ')}`);
    return;
  }
  const logPath = await writeSourcesDebugLog(result);
  throw new Error(
    `Unable to enable Perplexity sources/connectors: ${[...missing, ...disabled].join(', ')}. ` +
      `Debug log saved to ${logPath}`,
  );
}

export async function ensurePerplexityThinking(
  Runtime: ChromeClient['Runtime'],
  enabled: boolean,
  logger: BrowserLogger,
) {
  const outcome = await Runtime.evaluate({
    expression: buildThinkingToggleExpression(enabled),
    awaitPromise: true,
    returnByValue: true,
  });
  const result = outcome.result?.value as
    | { status: 'toggled'; label?: string }
    | { status: 'already'; label?: string }
    | { status: 'unsupported' };
  if (!result || result.status === 'unsupported') {
    logger('Thinking toggle: unsupported; continuing with default.');
    return;
  }
  logger(`Thinking toggle: ${result.status === 'already' ? 'already set' : 'updated'}`);
}

function buildModeSelectionExpression(mode: PerplexityMode): string {
  const selectorMap = JSON.stringify(PERPLEXITY_MODE_BUTTONS);
  const modeLiteral = JSON.stringify(mode);
  return `(async () => {
    ${buildClickDispatcher()}
    const SELECTORS = ${selectorMap};
    const target = SELECTORS[${modeLiteral}];
    const normalize = (value) => (value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
    const wantedLabels = {
      search: ['search'],
      deep_research: ['deep research', 'research'],
      create_files: ['create files and apps', 'create files', 'create', 'labs', 'apps'],
    };
    const getLabel = (node) => {
      if (!node) return '';
      return (
        (node.getAttribute?.('aria-label') || '').trim() ||
        (node.getAttribute?.('title') || '').trim() ||
        (node.textContent || '').trim()
      );
    };
    const desired = wantedLabels[${modeLiteral}] || [${modeLiteral}];
    const findButton = () => {
      const direct = target ? document.querySelector(target) : null;
      if (direct) return direct;
      const candidates = Array.from(document.querySelectorAll('button, [role="radio"], [role="tab"]'));
      return (
        candidates.find((node) => {
          const label = normalize(getLabel(node));
          return desired.some((entry) => label.includes(entry));
        }) || null
      );
    };
    let button = findButton();
    if (!button) {
      const focusTargets = Array.from(document.querySelectorAll('[contenteditable="true"], textarea'));
      const focusNode = focusTargets.find((node) => node instanceof HTMLElement) || null;
      if (focusNode) {
        dispatchClickSequence(focusNode);
        if (typeof focusNode.focus === 'function') {
          focusNode.focus();
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        button = findButton();
      }
    }
    if (!button) {
      const labels = Array.from(document.querySelectorAll('button, [role="radio"], [role="tab"]'))
        .map((node) => normalize(getLabel(node)))
        .filter(Boolean)
        .slice(0, 12);
      return { status: 'missing', debug: { url: location.href, labels } };
    }
    const label = getLabel(button) || ${modeLiteral};
    const checked =
      button.getAttribute('aria-checked') === 'true' ||
      button.getAttribute('aria-selected') === 'true' ||
      button.getAttribute('aria-pressed') === 'true' ||
      button.getAttribute('data-state') === 'checked';
    if (checked) return { status: 'already-selected', label };
    dispatchClickSequence(button);
    return { status: 'selected', label };
  })()`;
}

function buildRecencySelectionExpression(recency: PerplexityRecency): string {
  const recencyLiteral = JSON.stringify(recency);
  const buttonSelector = JSON.stringify(PERPLEXITY_RECENCY_BUTTON_SELECTOR);
  const itemSelector = JSON.stringify(MENU_ITEM_SELECTOR);
  return `(async () => {
    ${buildClickDispatcher()}
    const RECENCY = ${recencyLiteral};
    const BUTTON_SELECTOR = ${buttonSelector};
    const ITEM_SELECTOR = ${itemSelector};
    const labelMap = {
      all: 'All Time',
      day: 'Today',
      week: 'Last Week',
      month: 'Last Month',
      year: 'Last Year',
    };
    const desiredLabel = labelMap[RECENCY];
    const button = document.querySelector(BUTTON_SELECTOR);
    if (!button) return { status: 'button-missing' };
    dispatchClickSequence(button);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const normalize = (value) => (value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
    const labelNorm = normalize(desiredLabel);
    const items = Array.from(document.querySelectorAll(ITEM_SELECTOR));
    const match = items.find((node) => normalize(node.textContent) === labelNorm);
    if (!match) return { status: 'option-missing' };
    const checked =
      match.getAttribute('aria-checked') === 'true' ||
      match.getAttribute('aria-selected') === 'true' ||
      match.getAttribute('data-state') === 'checked';
    if (checked) return { status: 'already-selected', label: desiredLabel };
    dispatchClickSequence(match);
    return { status: 'selected', label: desiredLabel };
  })()`;
}

function buildSourcesSelectionExpression(targets: string[]): string {
  const targetsLiteral = JSON.stringify(targets);
  const buttonSelector = JSON.stringify(PERPLEXITY_SOURCES_BUTTON_SELECTOR);
  const menuSelector = JSON.stringify(MENU_CONTAINER_SELECTOR);
  return `(async () => {
    ${buildClickDispatcher()}
    const BUTTON_SELECTOR = ${buttonSelector};
    const MENU_SELECTOR = ${menuSelector};
    const targets = ${targetsLiteral}.map((t) => (t || '').trim()).filter(Boolean);
    const button = document.querySelector(BUTTON_SELECTOR);
    if (!button) return { status: 'button-missing', missing: targets };
    dispatchClickSequence(button);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const normalize = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim();
    const getLabel = (node) => {
      if (!node || !(node instanceof HTMLElement)) return '';
      return (
        (node.getAttribute('aria-label') || '').trim() ||
        (node.getAttribute('title') || '').trim() ||
        (node.textContent || '').trim()
      );
    };
    const isDisabled = (node) => {
      if (!node || !(node instanceof HTMLElement)) return true;
      if (node.hasAttribute('disabled')) return true;
      const aria = node.getAttribute('aria-disabled');
      const dataDisabled = node.getAttribute('data-disabled');
      return aria === 'true' || dataDisabled === 'true';
    };
    const isSelected = (node) => {
      if (!node || !(node instanceof HTMLElement)) return false;
      const ariaChecked = node.getAttribute('aria-checked');
      const ariaSelected = node.getAttribute('aria-selected');
      const dataState = (node.getAttribute('data-state') || '').toLowerCase();
      return ariaChecked === 'true' || ariaSelected === 'true' || dataState === 'checked' || dataState === 'selected';
    };
    const findMenu = () => {
      const menus = Array.from(document.querySelectorAll(MENU_SELECTOR));
      return menus.length ? menus[menus.length - 1] : null;
    };
    let menu = findMenu();
    const menuDeadline = performance.now() + 1200;
    while (!menu && performance.now() < menuDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      menu = findMenu();
    }
    const lookup = (root) => Array.from(
      root
        ? root.querySelectorAll('button, [role=menuitem], [role=menuitemcheckbox], label, div, span')
        : [],
    )
      .map((node) => ({ node, text: getLabel(node) }))
      .filter((entry) => entry.text.length > 0 && entry.text.length < 80);
    let candidates = lookup(menu);
    const missing = [];
    const disabled = [];
    const toggled = [];
    const already = [];
    for (const target of targets) {
      const normTarget = normalize(target);
      const match = candidates.find((entry) => normalize(entry.text).includes(normTarget));
      if (!match) {
        missing.push(target);
        continue;
      }
      const node = match.node;
      if (isDisabled(node)) {
        disabled.push(target);
        continue;
      }
      if (isSelected(node)) {
        already.push(target);
        continue;
      }
      dispatchClickSequence(node);
      toggled.push(target);
    }
    dispatchClickSequence(button);
    return {
      status: 'ok',
      missing,
      disabled,
      toggled,
      already,
      snapshot: {
        sample: (document.body?.innerText || '').slice(0, 500),
        candidates: candidates.slice(0, 30).map((entry) => entry.text),
      },
    };
  })()`;
}

function buildThinkingToggleExpression(enabled: boolean): string {
  const enabledLiteral = JSON.stringify(enabled);
  const modelButtonSelector = JSON.stringify(PERPLEXITY_MODEL_BUTTON_SELECTOR);
  const menuSelector = JSON.stringify(MENU_CONTAINER_SELECTOR);
  return `(() => {
    ${buildClickDispatcher()}
    const ENABLED = ${enabledLiteral};
    const MODEL_BUTTON_SELECTOR = ${modelButtonSelector};
    const MENU_SELECTOR = ${menuSelector};
    const normalize = (value) => (value || '').toLowerCase();
    const labelFor = (node) => (node.getAttribute('aria-label') || node.textContent || '').trim();
    const isChecked = (node) => {
      const ariaChecked = node.getAttribute('aria-checked');
      const ariaPressed = node.getAttribute('aria-pressed');
      const dataState = (node.getAttribute('data-state') || '').toLowerCase();
      return ariaChecked === 'true' || ariaPressed === 'true' || dataState === 'checked' || dataState === 'on';
    };
    const findToggle = (root) => {
      const scope = root ?? document;
      const nodes = Array.from(
        scope.querySelectorAll('button, [role=switch], [role=checkbox], [role=menuitem], [role=menuitemcheckbox]')
      );
      return nodes.find((node) => {
        const label = normalize(labelFor(node));
        return label.includes('thinking') || label.includes('reasoning');
      });
    };
    let toggle = findToggle();
    if (!toggle) {
      const button = document.querySelector(MODEL_BUTTON_SELECTOR);
      if (button) {
        dispatchClickSequence(button);
        const menus = Array.from(document.querySelectorAll(MENU_SELECTOR));
        const menu = menus.length ? menus[menus.length - 1] : null;
        toggle = findToggle(menu);
      }
    }
    if (!toggle) return { status: 'unsupported' };
    const isOn = isChecked(toggle);
    if ((ENABLED && isOn) || (!ENABLED && !isOn)) {
      return { status: 'already', label: labelFor(toggle) };
    }
    dispatchClickSequence(toggle);
    return { status: 'toggled', label: labelFor(toggle) };
  })()`;
}

async function writeSourcesDebugLog(payload: unknown): Promise<string> {
  const dir = path.join(os.homedir(), '.triangulator', 'debug');
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const filename = `perplexity-sources-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, JSON.stringify(payload, null, 2), 'utf8');
  return fullPath;
}
