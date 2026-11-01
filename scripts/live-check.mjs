/* global chrome, document -- these run inside the browser page / extension worker via evaluate() */
// MANUAL development aid, never run in CI (docs/09 §9.3: tests use synthetic fixtures only).
// Opens ONE public, logged-out page per URL with the `test` build loaded, then reports what the
// engine did and saves a screenshot. Use it to verify selectors against the real site.
//
//   npm run build:test
//   node scripts/live-check.mjs <outDir> <url> [<url> ...]
//
// Never use it with signed-in profiles. It uses a throwaway browser profile.
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [outDir, ...urls] = process.argv.slice(2);
if (!outDir || urls.length === 0) {
  console.error('usage: node scripts/live-check.mjs <outDir> <url> [<url> ...]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const ext = resolve('dist-test');
const profile = mkdtempSync(join(tmpdir(), 'retroweb-live-'));
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});

try {
  // LIVE_DARK=1 reproduces a dark-theme YouTube (the theme is a server-side cookie, f6=400).
  if (process.env.LIVE_DARK) {
    await ctx.addCookies([
      { name: 'PREF', value: 'f6=400&tz=UTC', domain: '.youtube.com', path: '/', secure: true },
    ]);
  }
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const site = { enabled: true, mode: 'authentic', theme: 2012 };
  await sw.evaluate(
    (s) =>
      chrome.storage.local.set({
        prefs: {
          schema: 1,
          killSwitch: false,
          motion: 'system',
          highContrast: false,
          sites: { google: s, youtube: s, facebook: s },
        },
      }),
    site,
  );
  await new Promise((r) => setTimeout(r, 1500)); // let the background register scripts

  let i = 0;
  for (const url of urls) {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000); // engine retry window is ~5s
    const attrs = await page.evaluate(() =>
      Object.fromEntries(
        document.documentElement
          .getAttributeNames()
          .filter((n) => n.startsWith('data-retroweb'))
          .map((n) => [n, document.documentElement.getAttribute(n)]),
      ),
    );
    const status = await sw.evaluate(
      async (u) => {
        const [tab] = await chrome.tabs.query({ url: u });
        if (!tab?.id) return 'no tab';
        try {
          return await chrome.tabs.sendMessage(tab.id, { type: 'status' });
        } catch (e) {
          return `no reply: ${e}`;
        }
      },
      url.split('#')[0].split('?')[0] + '*',
    );
    // Optional: LIVE_EVAL="<js expression>" prints what it returns, e.g. computed styles.
    if (process.env.LIVE_EVAL) {
      console.log('eval:', JSON.stringify(await page.evaluate(process.env.LIVE_EVAL), null, 1));
    }
    const file = join(outDir, `live-${++i}.png`);
    await page.screenshot({ path: file });
    console.log(
      JSON.stringify({ url, title: await page.title(), attrs, status, screenshot: file }, null, 2),
    );
    await page.close();
  }
  const diag = await sw.evaluate(
    async () => (await chrome.storage.local.get('diagnostics')).diagnostics,
  );
  console.log('diagnostics:', JSON.stringify(diag));
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}
