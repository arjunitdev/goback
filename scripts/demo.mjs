/* global chrome -- runs inside the extension service worker via evaluate() */
// Opens a visible Chromium window with the `test` build loaded and all three sites
// already enabled, so you can browse and see the extension working.
//
//   npm run build:test && node scripts/demo.mjs
//
// The window stays open until you close it. It uses a throwaway profile (no sign-ins).
// This is a demo helper, not a test: it contacts the real sites, once per tab you open.
import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ext = resolve('dist-test');
const profile = mkdtempSync(join(tmpdir(), 'retroweb-demo-'));

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: false,
  viewport: null, // use the real window size
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--start-maximized'],
});

const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
const on = { enabled: true, mode: 'authentic', theme: 2012 };
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
  on,
);
await new Promise((r) => setTimeout(r, 1500)); // let the background register the scripts

const urls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/',
  'https://www.google.com/',
  'https://www.facebook.com/',
];
const first = ctx.pages()[0] ?? (await ctx.newPage());
await first.goto(urls[0]);
for (const url of urls.slice(1)) {
  const page = await ctx.newPage();
  await page.goto(url).catch(() => undefined);
}
await first.bringToFront();
console.log('RetroWeb demo is open. Close the browser window when you are done.');

await new Promise((resolveClosed) => ctx.on('close', resolveClosed));
rmSync(profile, { recursive: true, force: true });
