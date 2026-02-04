/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-04
 * @tags: [playwright, browser, screenshot, automation]
 * @related: []
 * @priority: medium
 * @complexity: medium
 * @dependencies: [@playwright/test]
 */

import { chromium, Browser, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const DEFAULT_BASE_URL = 'http://localhost:3000';

interface BrowserAction {
  action: 'screenshot' | 'click' | 'type' | 'navigate' | 'scroll' | 'wait' | 'pdf';
  target?: string;
  value?: string;
  fullPage?: boolean;
  selector?: string;
}

async function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

function resolveUrl(target: string): string {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target;
  }
  // Handle paths like "/about" or "about"
  const pagePath = target.startsWith('/') ? target : `/${target}`;
  return `${DEFAULT_BASE_URL}${pagePath}`;
}

function generateFilename(prefix: string, ext: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.${ext}`;
}

async function takeScreenshot(page: Page, target: string, fullPage: boolean = true): Promise<string> {
  await ensureScreenshotsDir();

  const url = resolveUrl(target);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait a bit for any animations to settle
  await page.waitForTimeout(500);

  const pageName = target.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  const filename = generateFilename(pageName || 'page', 'png');
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage,
    animations: 'disabled'
  });

  return filepath;
}

async function takePdf(page: Page, target: string): Promise<string> {
  await ensureScreenshotsDir();

  const url = resolveUrl(target);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const pageName = target.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  const filename = generateFilename(pageName || 'page', 'pdf');
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  await page.pdf({ path: filepath, format: 'A4' });

  return filepath;
}

async function clickElement(page: Page, selector: string): Promise<void> {
  await page.click(selector);
  await page.waitForTimeout(300);
}

async function typeText(page: Page, selector: string, text: string): Promise<void> {
  await page.fill(selector, text);
}

async function scrollPage(page: Page, direction: 'top' | 'bottom' | 'up' | 'down'): Promise<void> {
  switch (direction) {
    case 'top':
      await page.evaluate(() => window.scrollTo(0, 0));
      break;
    case 'bottom':
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      break;
    case 'up':
      await page.evaluate(() => window.scrollBy(0, -500));
      break;
    case 'down':
      await page.evaluate(() => window.scrollBy(0, 500));
      break;
  }
  await page.waitForTimeout(300);
}

async function executeActions(actions: BrowserAction[]): Promise<{ results: string[]; errors: string[] }> {
  const results: string[] = [];
  const errors: string[] = [];

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();

    for (const action of actions) {
      try {
        switch (action.action) {
          case 'screenshot':
            if (!action.target) {
              errors.push('Screenshot requires a target URL or path');
              continue;
            }
            const screenshotPath = await takeScreenshot(page, action.target, action.fullPage ?? true);
            results.push(`Screenshot saved: ${screenshotPath}`);
            break;

          case 'pdf':
            if (!action.target) {
              errors.push('PDF requires a target URL or path');
              continue;
            }
            const pdfPath = await takePdf(page, action.target);
            results.push(`PDF saved: ${pdfPath}`);
            break;

          case 'navigate':
            if (!action.target) {
              errors.push('Navigate requires a target URL or path');
              continue;
            }
            const url = resolveUrl(action.target);
            await page.goto(url, { waitUntil: 'networkidle' });
            results.push(`Navigated to: ${url}`);
            break;

          case 'click':
            if (!action.selector) {
              errors.push('Click requires a selector');
              continue;
            }
            await clickElement(page, action.selector);
            results.push(`Clicked: ${action.selector}`);
            break;

          case 'type':
            if (!action.selector || !action.value) {
              errors.push('Type requires a selector and value');
              continue;
            }
            await typeText(page, action.selector, action.value);
            results.push(`Typed "${action.value}" into: ${action.selector}`);
            break;

          case 'scroll':
            const direction = (action.value || 'down') as 'top' | 'bottom' | 'up' | 'down';
            await scrollPage(page, direction);
            results.push(`Scrolled: ${direction}`);
            break;

          case 'wait':
            const ms = parseInt(action.value || '1000', 10);
            await page.waitForTimeout(ms);
            results.push(`Waited: ${ms}ms`);
            break;

          default:
            errors.push(`Unknown action: ${action.action}`);
        }
      } catch (err) {
        errors.push(`Error in ${action.action}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return { results, errors };
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`Usage: npx ts-node scripts/browser.ts <action> [options]

Actions:
  screenshot <url|path> [--viewport]  Take a screenshot
  pdf <url|path>                       Save page as PDF

Examples:
  npx ts-node scripts/browser.ts screenshot /
  npx ts-node scripts/browser.ts screenshot /about --viewport
  npx ts-node scripts/browser.ts pdf /pricing
  npx ts-node scripts/browser.ts screenshot https://example.com
`);
    process.exit(0);
  }

  const action = args[0] as BrowserAction['action'];
  const target = args[1];
  const fullPage = !args.includes('--viewport');

  if (!target && (action === 'screenshot' || action === 'pdf' || action === 'navigate')) {
    console.error(`Error: ${action} requires a target URL or path`);
    process.exit(1);
  }

  const { results, errors } = await executeActions([
    { action, target, fullPage }
  ]);

  results.forEach(r => console.log(r));
  errors.forEach(e => console.error(e));

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
