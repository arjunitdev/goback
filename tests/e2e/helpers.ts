import { chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** Built by `npm run build:test` (host access granted at install; never published). */
export const EXT = resolve('dist-test');

export const fixtureHtml = (name: string) => readFileSync(join('tests', 'fixtures', name), 'utf8');

export interface Harness {
  ctx: BrowserContext;
  sw: Worker;
  extId: string;
  /** Requests that left the machine for anything but a stubbed site or the extension itself. */
  externalRequests: string[];
  close(): Promise<void>;
}

const STUBBED =
  /^(https:\/\/www\.(google|youtube|facebook)\.com\/|chrome-extension:|data:|blob:|about:)/;

export async function launch(): Promise<Harness> {
  const profile = mkdtempSync(join(tmpdir(), 'retroweb-pw-'));
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', // new headless mode, which supports extensions
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const externalRequests: string[] = [];
  ctx.on('request', (req) => {
    if (!STUBBED.test(req.url())) externalRequests.push(req.url());
  });
  return {
    ctx,
    sw,
    extId: new URL(sw.url()).host,
    externalRequests,
    close: async () => {
      await ctx.close();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

/** Serve a synthetic fixture for every request to an origin; no live site is contacted. */
export async function stub(
  page: Page,
  origin: string,
  pick: (pathname: string) => string,
  transform: (html: string) => string = (h) => h,
) {
  await page.route(`${origin}/**`, (route) => {
    const { pathname } = new URL(route.request().url());
    return route.fulfill({
      contentType: 'text/html',
      body: transform(fixtureHtml(pick(pathname))),
    });
  });
}

export const prefs = (enabled: string[], over: Record<string, unknown> = {}) => ({
  schema: 1,
  killSwitch: false,
  motion: 'system',
  highContrast: false,
  sites: {
    youtube: { enabled: enabled.includes('youtube'), mode: 'authentic', theme: 2012 },
    google: { enabled: enabled.includes('google'), mode: 'authentic', theme: 2012 },
    facebook: { enabled: enabled.includes('facebook'), mode: 'authentic', theme: 2012 },
  },
  ...over,
});

export async function setPrefs(h: Harness, value: unknown) {
  await h.sw.evaluate(async (p) => chrome.storage.local.set({ prefs: p }), value);
}

export async function registeredIds(h: Harness): Promise<string[]> {
  return h.sw.evaluate(async () =>
    (await chrome.scripting.getRegisteredContentScripts()).map((s) => s.id).sort(),
  );
}
