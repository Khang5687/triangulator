import type { BrowserModelStrategy } from './types.js';

export const PERPLEXITY_URL = 'https://www.perplexity.ai/';
export const DEFAULT_MODEL_TARGET = 'GPT-5.2 Pro';
export const DEFAULT_MODEL_STRATEGY: BrowserModelStrategy = 'select';
export const COOKIE_URLS = ['https://www.perplexity.ai', 'https://perplexity.ai'];

export const INPUT_SELECTORS = [
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="ask"]',
  'textarea[aria-label*="Ask"]',
  'textarea[aria-label*="Question"]',
  'textarea[data-testid*="input"]',
  'textarea:not([disabled])',
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"]',
];

export const ANSWER_SELECTORS = [
  '[data-testid="answer"]',
  '[data-testid="final-answer"]',
  '[data-testid*="answer"]',
  'main [data-testid*="answer"]',
  'main .prose',
  'main .markdown',
  'article',
];

export const CONVERSATION_TURN_SELECTOR =
  'article[data-testid*="answer"], div[data-testid*="answer"], section[data-testid*="answer"], ' +
  'article[data-testid*="message"], div[data-testid*="message"], section[data-testid*="message"], ' +
  'article, section';
export const ASSISTANT_ROLE_SELECTOR = '[data-testid*="answer"], [data-testid*="response"], main .prose, main .markdown';
export const CLOUDFLARE_SCRIPT_SELECTOR = 'script[src*="/challenge-platform/"]';
export const CLOUDFLARE_TITLE = 'just a moment';
export const PROMPT_PRIMARY_SELECTOR = '[contenteditable="true"]';
export const PROMPT_FALLBACK_SELECTOR = 'textarea';
export const FILE_INPUT_SELECTORS = [
  'form input[type="file"]:not([accept])',
  'input[type="file"][multiple]:not([accept])',
  'input[type="file"][multiple]',
  'input[type="file"]:not([accept])',
  'form input[type="file"][accept]',
  'input[type="file"][accept]',
  'input[type="file"]',
  'input[type="file"][data-testid*="file"]',
];
// Legacy single selectors kept for compatibility with older call-sites
export const FILE_INPUT_SELECTOR = FILE_INPUT_SELECTORS[0];
export const GENERIC_FILE_INPUT_SELECTOR = FILE_INPUT_SELECTORS[3];
export const MENU_CONTAINER_SELECTOR = '[role="menu"], [data-radix-collection-root]';
export const MENU_ITEM_SELECTOR = 'button, [role="menuitem"], [role="menuitemradio"], [data-testid*="model-switcher-"]';
export const UPLOAD_STATUS_SELECTORS = [
  '[data-testid*="upload"]',
  '[data-testid*="attachment"]',
  '[data-testid*="progress"]',
  '[data-state="loading"]',
  '[data-state="uploading"]',
  '[data-state="pending"]',
  '[aria-live="polite"]',
  '[aria-live="assertive"]',
];

export const STOP_BUTTON_SELECTOR = 'button[aria-label*="Stop"], button[data-testid*="stop"]';
export const SEND_BUTTON_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[data-testid*="composer-send"]',
  'form button[type="submit"]',
  'button[type="submit"][data-testid*="send"]',
  'button[aria-label*="Send"]',
];
export const SEND_BUTTON_SELECTOR = SEND_BUTTON_SELECTORS[0];
export const MODEL_BUTTON_SELECTOR = '[data-testid*="model"], [aria-label*="Model"]';
export const COPY_BUTTON_SELECTOR = 'button[aria-label*="Copy"], button[data-testid*="copy"]';
// Action buttons that only appear once a turn has finished rendering.
export const FINISHED_ACTIONS_SELECTOR =
  'button[aria-label*="Copy"], button[aria-label*="Share"], button[data-testid*="copy"], button[data-testid*="share"]';
