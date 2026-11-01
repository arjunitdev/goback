import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Built by `npm run build:test` (host access granted at install; never published).
const EXT = resolve('dist-test');
const fixtureHtml = (name: string) => readFileSync(join('tests', 'fixtures', name), 'utf8');

let ctx: BrowserContext;
let sw: Worker;
let extId: string;
let profile: string;
const externalRequests: string[] = [];

/** Serve synthetic fixtures for google.com so no live site is ever contacted. */
async function stubGoogle(page: Page) {
  await page.route('https://www.google.com/**', (route) => {
    const url = new URL(route.request().url());
    const body = url.pathname === '/' ? 'google-home.html' : 'google-results.html';
    return route.fulfill({ contentType: 'text/html', body: fixtureHtml(body) });
  });
}

async function setPrefs(prefs: unknown) {
  await sw.evaluate(async (p) => chrome.storage.local.set({ prefs: p }), prefs);
}

async function registeredIds(): Promise<string[]> {
  return sw.evaluate(async () =>
    (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id).sort(),
  );
}

const prefsOn = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  killSwitch: false,
  motion: 'system',
  highContrast: false,
  sites: {
    youtube: { enabled: false, mode: 'authentic', theme: 2012 },
    google: { enabled: true, mode: 'authentic', theme: 2012 },
    facebook: { enabled: false, mode: 'authentic', theme: 2012 },
  },
  ...over,
});

test.beforeAll(async () => {
  profile = mkdtempSync(join(tmpdir(), 'retroweb-pw-'));
  ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', // new headless mode, which supports extensions
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  extId = new URL(sw.url()).host;
  ctx.on('request', (req) => {
    const u = req.url();
    if (!/^(https:\/\/www\.google\.com\/|chrome-extension:|data:|blob:|about:)/.test(u))
      externalRequests.push(u);
  });
});

test.afterAll(async () => {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
});

test('nothing is registered or applied until the user opts in (FR-001)', async () => {
  expect(await registeredIds()).toEqual([]);
  const page = await ctx.newPage();
  await stubGoogle(page);
  await page.goto('https://www.google.com/search?q=cats');
  await expect(page.locator('html')).not.toHaveAttribute('data-retroweb', /.+/);
  await page.close();
});

test('enabling Google registers scripts and styles the results page without touching ads/consent', async () => {
  await setPrefs(prefsOn());
  await expect.poll(registeredIds).toEqual(['rw-google-early', 'rw-google-main']);

  const page = await ctx.newPage();
  await stubGoogle(page);
  const adsBefore = fixtureHtml('google-results.html');
  await page.goto('https://www.google.com/search?q=cats');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-retroweb', 'google');
  await expect(html).toHaveAttribute('data-retroweb-route', 'results');

  const color = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => getComputedStyle(el).color);
  expect(await color('#rso h3')).toBe('rgb(17, 34, 204)'); // --rw-title #1122cc
  expect(await color('#rso cite')).toBe('rgb(0, 153, 51)'); // --rw-url #093
  expect(await color('#tads h3')).not.toBe('rgb(17, 34, 204)'); // ads untouched

  // Engine reports healthy through the content-script status channel.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.retroweb))
    .toBe('google');

  // Functional elements are still there and unchanged.
  await expect(page.locator('#tads')).toBeVisible();
  await expect(page.locator('[data-consent] button')).toBeVisible();
  await expect(page.locator('textarea[name="q"]')).toBeEditable();
  expect(await page.locator('#rso a').first().getAttribute('href')).toBe('https://example.org/a');
  expect(adsBefore).toContain('Sponsored result');
  await page.close();
});

test('dev/test flavor swaps in the recreated wordmark via CSS only', async () => {
  const page = await ctx.newPage();
  await stubGoogle(page);
  await page.goto('https://www.google.com/');
  await expect(page.locator('html')).toHaveAttribute('data-retroweb-wordmark', 'on');
  const content = await page
    .locator('img[alt="Google"]')
    .evaluate((el) => getComputedStyle(el).content);
  expect(content).toContain('chrome-extension://');
  // The look-alike, or (on a machine with the private archive logo) the real one, which wins.
  expect(content).toMatch(/google-2012\.svg|google-private\/logo\.png/);
  // The original <img> and its alt text remain in the DOM.
  await expect(page.locator('img[alt="Google"]')).toHaveCount(1);
  await page.close();
});

test('kill switch removes registrations and restores the native page (FR-001)', async () => {
  await setPrefs(prefsOn({ killSwitch: true }));
  await expect.poll(registeredIds).toEqual([]);
  const page = await ctx.newPage();
  await stubGoogle(page);
  await page.goto('https://www.google.com/search?q=cats');
  await expect(page.locator('html')).not.toHaveAttribute('data-retroweb', /.+/);
  expect(
    await page
      .locator('#rso h3')
      .first()
      .evaluate((el) => getComputedStyle(el).color),
  ).not.toBe('rgb(17, 34, 204)');
  await page.close();
});

test('unrecognised markup fails open: native page, counter recorded', async () => {
  await setPrefs(prefsOn());
  await expect.poll(registeredIds).toEqual(['rw-google-early', 'rw-google-main']);
  const page = await ctx.newPage();
  await page.route('https://www.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: fixtureHtml('google-unknown.html') }),
  );
  await page.goto('https://www.google.com/search?q=cats');
  // Early script styles immediately; engine then fails open after its retry window (~5s).
  await expect(page.locator('html')).not.toHaveAttribute('data-retroweb', /.+/, {
    timeout: 15_000,
  });
  const counters = await sw.evaluate(
    async () =>
      (await chrome.storage.local.get('diagnostics')).diagnostics as Record<string, number>,
  );
  expect(counters['fail-open']).toBeGreaterThanOrEqual(1);
  await page.close();
});

test('popup shows the unofficial label and the kill switch persists', async () => {
  await setPrefs(prefsOn());
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await expect(popup.getByText('Unofficial', { exact: true })).toBeVisible();
  await expect(popup.getByRole('checkbox', { name: 'Google Search', exact: true })).toBeChecked();
  await popup.getByLabel('Pause everywhere (kill switch)').check();
  await expect
    .poll(() =>
      sw.evaluate(
        async () =>
          ((await chrome.storage.local.get('prefs')).prefs as { killSwitch: boolean }).killSwitch,
      ),
    )
    .toBe(true);
  await popup.close();
});

test('the extension made no unexpected network requests', () => {
  expect(externalRequests).toEqual([]);
});
