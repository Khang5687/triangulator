import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BrowserLogger, ChromeClient, PerplexityMode, PerplexityRecency } from '../types.js';
import {
  MENU_CONTAINER_SELECTOR,
  MENU_ITEM_SELECTOR,
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
  let lastDebug: { url?: string; labels?: string[]; active?: string | null } | null = null;
  while (Date.now() < deadline) {
    const outcome = await Runtime.evaluate({
      expression: buildModeSelectionExpression(mode),
      awaitPromise: true,
      returnByValue: true,
    });
    const result = outcome.result?.value as
      | { status: 'selected' | 'already-selected'; label: string; activeLabel?: string | null }
      | { status: 'missing'; debug?: { url?: string; labels?: string[]; active?: string | null } };
    if (result && result.status !== 'missing') {
      const label = result.label ?? mode;
      const activeLabel = result.activeLabel ?? label;
      logger(`Perplexity mode: ${label}${activeLabel && activeLabel !== label ? ` (active: ${activeLabel})` : ''}`);
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
        `active=${lastDebug.active ?? 'unknown'}; candidates: ${lastDebug.labels.join(' | ')}`,
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
      | { status: 'menu-missing' | 'option-missing' | 'button-missing' | 'unsupported' };
    if (result && (result.status === 'selected' || result.status === 'already-selected')) {
      logger(`Recency: ${result.label}`);
      return;
    }
    if (result?.status === 'unsupported') {
      logger('Recency: control not available; skipping.');
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
  const sources = (options.sources ?? []).filter((source) => String(source).toLowerCase() !== 'web');
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
    status: 'ok' | 'menu-missing' | 'button-missing' | 'unsupported';
    missing?: string[];
    disabled?: string[];
    toggled?: string[];
    already?: string[];
    snapshot?: { sample: string; candidates: string[] };
  };
  if (result?.status === 'unsupported') {
    logger('Sources: control not available; skipping.');
    return;
  }
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
  const modeLiteral = JSON.stringify(mode);
  return `(async () => {
    ${buildClickDispatcher()}
    const normalize = (value) => (value || '').toLowerCase().replace(/\\s+/g, ' ').trim();
    const wantedLabels = {
      search: ['search'],
      deep_research: ['deep research', 'research'],
      create_files: ['create files and apps', 'create files', 'create', 'labs', 'apps'],
    };
    const allWanted = Object.values(wantedLabels).flat();
    const getLabel = (node) => {
      if (!node) return '';
      return (
        (node.getAttribute?.('aria-label') || '').trim() ||
        (node.getAttribute?.('title') || '').trim() ||
        (node.textContent || '').trim()
      );
    };
    const isChecked = (node) => {
      if (!node) return false;
      return (
        node.getAttribute('aria-checked') === 'true' ||
        node.getAttribute('aria-selected') === 'true' ||
        node.getAttribute('aria-pressed') === 'true' ||
        node.getAttribute('data-state') === 'checked'
      );
    };
    const currentActiveLabel = () => {
      const candidates = Array.from(document.querySelectorAll('button[role="radio"], [role="radio"], [role="tab"]'));
      const active = candidates.find((node) => isChecked(node));
      return active ? getLabel(active) : null;
    };
    const desired = wantedLabels[${modeLiteral}] || [${modeLiteral}];
    const findGroup = () => {
      const candidates = Array.from(document.querySelectorAll('button, [role="radio"], [role="tab"]'));
      const labelMatchesAny = (node) => {
        const label = normalize(getLabel(node));
        return allWanted.some((entry) => label.includes(entry));
      };
      const modeCandidates = candidates.filter(labelMatchesAny);
      const best = { node: null, matchCount: 0, totalCount: Infinity };
      for (const node of modeCandidates) {
        let parent = node.parentElement;
        for (let depth = 0; depth < 5 && parent; depth += 1) {
          const groupNodes = Array.from(parent.querySelectorAll('button, [role="radio"], [role="tab"]'));
          const labels = new Set(
            groupNodes
              .map((child) => normalize(getLabel(child)))
              .filter((label) => allWanted.some((entry) => label.includes(entry))),
          );
          const matchCount = labels.size;
          const totalCount = groupNodes.length;
          if (matchCount > best.matchCount || (matchCount === best.matchCount && totalCount < best.totalCount)) {
            best.node = parent;
            best.matchCount = matchCount;
            best.totalCount = totalCount;
          }
          parent = parent.parentElement;
        }
      }
      return best.node;
    };
    const findButton = () => {
      const group = findGroup();
      const scope = group || document;
      const candidates = Array.from(scope.querySelectorAll('button[role="radio"], [role="radio"], [role="tab"], button'));
      const labelMatches = (node) => {
        const label = normalize(getLabel(node));
        return desired.some((entry) => label.includes(entry));
      };
      const exactMatch = candidates.find((node) => normalize(getLabel(node)) === desired[0]);
      if (exactMatch) return exactMatch;
      const radioMatch = candidates.find((node) => labelMatches(node) && node.getAttribute?.('role') === 'radio');
      if (radioMatch) return radioMatch;
      return candidates.find(labelMatches) || null;
    };
    const waitForStableSelection = async () => {
      const stableThreshold = 3;
      const pollMs = 200;
      const deadline = Date.now() + 2000;
      let stableCount = 0;
      while (Date.now() < deadline) {
        const current = normalize(currentActiveLabel() || '');
        const matched = desired.some((entry) => current.includes(entry));
        if (matched) {
          stableCount += 1;
          if (stableCount >= stableThreshold) {
            return currentActiveLabel();
          }
        } else {
          stableCount = 0;
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
      return currentActiveLabel();
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
      return { status: 'missing', debug: { url: location.href, labels, active: currentActiveLabel() } };
    }
    const label = getLabel(button) || ${modeLiteral};
    const checked = isChecked(button);
    if (checked) {
      const stableLabel = await waitForStableSelection();
      const normalizedStable = normalize(stableLabel || '');
      const stillMatched = desired.some((entry) => normalizedStable.includes(entry));
      if (!stillMatched) {
        return { status: 'missing', debug: { url: location.href, labels: desired, active: stableLabel } };
      }
      return { status: 'already-selected', label, activeLabel: stableLabel || label };
    }
    if (typeof button.scrollIntoView === 'function') {
      button.scrollIntoView({ block: 'center', inline: 'center' });
    }
    dispatchClickSequence(button);
    if (typeof button.click === 'function') {
      button.click();
    }
    let stableLabel = await waitForStableSelection();
    let normalizedStable = normalize(stableLabel || '');
    let matched = desired.some((entry) => normalizedStable.includes(entry));
    if (!matched) {
      dispatchClickSequence(button);
      if (typeof button.click === 'function') {
        button.click();
      }
      stableLabel = await waitForStableSelection();
      normalizedStable = normalize(stableLabel || '');
      matched = desired.some((entry) => normalizedStable.includes(entry));
    }
    if (!matched) {
      return { status: 'missing', debug: { url: location.href, labels: desired, active: stableLabel } };
    }
    return { status: 'selected', label, activeLabel: stableLabel };
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
    const normalize = (value) => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\\s+/g, ' ').trim();
    const menuMatchesRecency = (menu) => {
      if (!menu) return false;
      const text = normalize(menu.innerText || '');
      return Object.values(labelMap).some((label) => text.includes(normalize(label)));
    };
    const findMenu = () => {
      const menus = Array.from(document.querySelectorAll('${MENU_CONTAINER_SELECTOR}'));
      return menus.length ? menus[menus.length - 1] : null;
    };
    const closeMenus = () => {
      document.body?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    const openMenu = async (node) => {
      if (!node) return null;
      dispatchClickSequence(node);
      await new Promise((resolve) => setTimeout(resolve, 200));
      let menu = findMenu();
      if (!menu) {
        const deadline = performance.now() + 800;
        while (!menu && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          menu = findMenu();
        }
      }
      if (menuMatchesRecency(menu)) return menu;
      closeMenus();
      return null;
    };
    let button = document.querySelector(BUTTON_SELECTOR);
    let menu = await openMenu(button);
    if (!menu) {
      const prompt = document.querySelector('[contenteditable="true"], textarea');
      const scope = prompt?.closest('form') || prompt?.closest('section') || prompt?.parentElement || document;
      const candidates = Array.from(scope.querySelectorAll('button')).filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.hasAttribute('disabled')) return false;
        const type = (node.getAttribute('type') || '').toLowerCase();
        if (type === 'submit') return false;
        const label = normalize(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '');
        if (!label.includes('source')) return false;
        if (label.includes('send') || label.includes('submit')) return false;
        return true;
      });
      for (const candidate of candidates) {
        if (candidate === button) continue;
        menu = await openMenu(candidate);
        if (menu) {
          button = candidate;
          break;
        }
      }
    }
    if (!button || !menu) return { status: 'unsupported' };
    const labelNorm = normalize(desiredLabel);
    const items = Array.from(menu.querySelectorAll(ITEM_SELECTOR));
    const match = items.find((node) => normalize(node.textContent) === labelNorm);
    if (!match) return { status: 'option-missing' };
    const findClickable = (node) => {
      if (!node || !(node instanceof HTMLElement)) return null;
      const clickableSelector = 'button, [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox]';
      let clickable = node.closest(clickableSelector);
      if (clickable) return clickable;
      clickable = node.querySelector(clickableSelector);
      if (clickable) return clickable;
      return node;
    };
    const clickable = findClickable(match) ?? match;
    const checked =
      clickable.getAttribute('aria-checked') === 'true' ||
      clickable.getAttribute('aria-selected') === 'true' ||
      clickable.getAttribute('data-state') === 'checked';
    if (checked) return { status: 'already-selected', label: desiredLabel };
    dispatchClickSequence(clickable);
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
    const targets = ${targetsLiteral}
      .map((t) => (t || '').trim())
      .filter(Boolean)
      .filter((t) => (t || '').toLowerCase() !== 'web');
    if (!targets.length) {
      return { status: 'ok', missing: [], disabled: [], toggled: [], already: [] };
    }
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
      if (node instanceof HTMLInputElement) {
        return Boolean(node.checked);
      }
      const ariaChecked = node.getAttribute('aria-checked');
      const ariaSelected = node.getAttribute('aria-selected');
      const dataState = (node.getAttribute('data-state') || '').toLowerCase();
      return ariaChecked === 'true' || ariaSelected === 'true' || dataState === 'checked' || dataState === 'selected';
    };
    const findClickable = (node) => {
      if (!node || !(node instanceof HTMLElement)) return null;
      const clickableSelector =
        'button, [role=menuitemcheckbox], [role=menuitemradio], [role=menuitem], [role=checkbox], [role=switch], input[type=checkbox], input[type=radio]';
      let clickable = node.closest(clickableSelector);
      if (clickable) return clickable;
      clickable = node.querySelector(clickableSelector);
      if (clickable) return clickable;
      let parent = node.parentElement;
      for (let depth = 0; depth < 4 && parent; depth += 1) {
        const candidate = parent.querySelector(clickableSelector);
        if (candidate) return candidate;
        parent = parent.parentElement;
      }
      return node;
    };
    const findMenu = () => {
      const menus = Array.from(document.querySelectorAll(MENU_SELECTOR));
      return menus.length ? menus[menus.length - 1] : null;
    };
    const menuMatchesTargets = (menu) => {
      if (!menu) return false;
      const text = normalize(menu.innerText || '');
      const hasTarget = targets.some((target) => text.includes(normalize(target)));
      if (hasTarget) return true;
      return ['web', 'academic', 'social', 'sources'].some((token) => text.includes(token));
    };
    const closeMenus = () => {
      document.body?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    const openMenu = async (node) => {
      if (!node) return null;
      dispatchClickSequence(node);
      await new Promise((resolve) => setTimeout(resolve, 200));
      let menu = findMenu();
      const isOpen = () => {
        if (!node || !(node instanceof HTMLElement)) return false;
        const ariaExpanded = node.getAttribute('aria-expanded');
        const dataState = (node.getAttribute('data-state') || '').toLowerCase();
        return ariaExpanded === 'true' || dataState === 'open';
      };
      if (!menu) {
        const deadline = performance.now() + 1200;
        while (!menu && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          menu = findMenu();
          if (!menu && isOpen()) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            menu = findMenu();
          }
        }
      }
      if (menuMatchesTargets(menu)) return menu;
      closeMenus();
      return null;
    };
    let button = document.querySelector(BUTTON_SELECTOR);
    let menu = await openMenu(button);
    if (!menu) {
      const prompt = document.querySelector('[contenteditable="true"], textarea');
      const scope = prompt?.closest('form') || prompt?.closest('section') || prompt?.parentElement || document;
      const candidates = Array.from(scope.querySelectorAll('button')).filter((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.hasAttribute('disabled')) return false;
        const type = (node.getAttribute('type') || '').toLowerCase();
        if (type === 'submit') return false;
        const label = normalize(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '');
        if (label.includes('send') || label.includes('submit')) return false;
        return true;
      });
      for (const candidate of candidates) {
        if (candidate === button) continue;
        menu = await openMenu(candidate);
        if (menu) {
          button = candidate;
          break;
        }
      }
    }
    if (!button || !menu) return { status: 'unsupported', missing: targets };
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
      const node = findClickable(match.node) ?? match.node;
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
