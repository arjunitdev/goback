import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { launch, prefs, registeredIds, setPrefs, stub, type Harness } from './helpers';

const YT = 'https://www.youtube.com';
const FB = 'https://www.facebook.com';
const G = 'https://www.google.com';

let h: Harness;
test.beforeAll(async () => {
  h = await launch();
});
test.afterAll(async () => {
  await h.close();
});

const color = (page: import('@playwright/test').Page, sel: string, prop = 'color') =>
  page
    .locator(sel)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

async function enable(sites: string[], over: Record<string, unknown> = {}) {
  await setPrefs(h, prefs(sites, over));
  await expect
    .poll(() => registeredIds(h))
    .toEqual(sites.flatMap((s) => [`rw-${s}-early`, `rw-${s}-main`]).sort());
}

test.describe('YouTube', () => {
  const pick = (p: string) =>
    p.startsWith('/watch')
      ? 'youtube-watch.html'
      : p.startsWith('/results')
        ? 'youtube-results.html'
        : 'youtube-home.html';

  test('themes the watch page but never touches the player, ads or consent', async () => {
    await enable(['youtube']);
    const page = await h.ctx.newPage();
    await stub(page, YT, pick);
    await page.goto(`${YT}/watch?v=abc`);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-retroweb', 'youtube');
    await expect(html).toHaveAttribute('data-retroweb-route', 'watch');

    // 2014 reference page grey: #f1f1f1.
    expect(await color(page, 'ytd-app', 'background-color')).toBe('rgb(241, 241, 241)');
    expect(await color(page, 'ytd-guide-renderer', 'font-family')).toContain('Roboto');

    // The player subtree keeps its native look: our font rule is fenced away from it.
    expect(await color(page, '#movie_player .ytp-ad-module', 'font-family')).not.toContain('Roboto');
    for (const sel of [
      '#movie_player video',
      'ytd-ad-slot-renderer',
      'ytd-consent-bump-v2-lightbox button',
    ]) {
      await expect(page.locator(sel)).toHaveCount(1);
    }
    expect(await page.locator('[data-keep]').count()).toBe(3);
    await page.close();
  });

  test('follows a single-page navigation signalled by the page-world event', async () => {
    const page = await h.ctx.newPage();
    await stub(page, YT, pick);
    await page.goto(`${YT}/`);
    await expect(page.locator('html')).toHaveAttribute('data-retroweb-route', 'home');

    // Dispatched in the PAGE world; the isolated content script must still see it.
    await page.evaluate(() => {
      history.pushState({}, '', '/results?search_query=x');
      document
        .querySelector('ytd-page-manager')!
        .replaceChildren(document.createElement('ytd-search'));
      document.dispatchEvent(new CustomEvent('yt-navigate-finish'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-retroweb-route', 'results');
    await page.close();
  });

  test('holds a dark-theme account on the light 2012 look, then gives dark back when switched off', async () => {
    await enable(['youtube']);
    const page = await h.ctx.newPage();
    // A dark-theme YouTube: the site marks <html dark> and re-adds it when its script runs.
    await stub(page, YT, pick, (html) => html.replace('<html lang="en">', '<html lang="en" dark>'));
    await page.goto(`${YT}/watch?v=abc`);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-retroweb', 'youtube');
    await expect(html).not.toHaveAttribute('dark', /.*/);
    await expect(html).toHaveAttribute('data-retroweb-had-dark', 'dark');
    await expect(html).toHaveAttribute('data-retroweb-scheme', 'light');

    // The site's own script flips it back on: it is stripped again.
    await page.evaluate(() => document.documentElement.setAttribute('dark', ''));
    await expect(html).not.toHaveAttribute('dark', /.*/);

    // Kill switch: the extension stands down and the user's dark theme returns.
    await setPrefs(h, prefs(['youtube'], { killSwitch: true }));
    await expect(html).not.toHaveAttribute('data-retroweb', /.+/);
    await expect(html).toHaveAttribute('dark', '');
    await expect(html).not.toHaveAttribute('data-retroweb-had-dark', /.*/);
    await page.close();
    await setPrefs(h, prefs(['youtube']));
  });
});

test.describe('Facebook', () => {
  const pick = (p: string) =>
    p.startsWith('/login') ? 'facebook-login.html' : 'facebook-feed.html';

  test('themes a signed-in shell after the probe passes, leaving dialogs native', async () => {
    await enable(['facebook']);
    const page = await h.ctx.newPage();
    await stub(page, FB, pick);
    await page.goto(`${FB}/`);
    await expect(page.locator('html')).toHaveAttribute('data-retroweb', 'facebook');
    expect(await color(page, '[role="banner"]', 'background-color')).toBe('rgb(59, 89, 152)');
    expect(await color(page, '[role="feed"] a', 'font-family')).toContain('lucida');
    // Privacy/dialog UI keeps its own typography.
    expect(await color(page, '[role="dialog"] button', 'font-family')).not.toContain('lucida');
    expect(await page.locator('[data-keep]').count()).toBe(2);
    await page.close();
  });

  test('landing page: a blue bar is added and the login form is left exactly as Facebook draws it', async () => {
    await enable(['facebook']);
    const page = await h.ctx.newPage();
    await stub(page, FB, () => 'facebook-landing.html');
    await page.goto(`${FB}/`);
    await expect(page.locator('#rw-fbbar')).toBeVisible();
    expect(await color(page, '#rw-fbbar', 'background-color')).toBe('rgb(59, 89, 152)');
    expect(await color(page, '#rw-fbbar', 'position')).toBe('fixed');
    // None of the page-restyling rules apply here: fonts and form controls keep their own look.
    expect(await color(page, 'body', 'font-family')).not.toContain('lucida');
    expect(await color(page, 'input[type="password"]', 'font-family')).not.toContain('lucida');
    expect(await color(page, 'body', 'background-color')).not.toBe('rgb(233, 234, 237)');
    expect(await page.locator('[data-keep]').count()).toBe(2);
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // The shared keyboard-focus ring must not be drawn on the login fields either.
    await page.locator('input[type="password"]').focus();
    expect(await color(page, 'input[type="password"]', 'outline-color')).not.toBe('rgb(77, 144, 254)');
    await page.close();
  });

  test('dark signed-in shell: the header is still blue', async () => {
    const page = await h.ctx.newPage();
    await stub(page, FB, () => 'facebook-feed-dark.html');
    await page.goto(`${FB}/`);
    await expect(page.locator('html')).toHaveAttribute('data-retroweb', 'facebook');
    await expect(page.locator('html')).toHaveAttribute('data-retroweb-scheme', 'dark');
    expect(await color(page, '[role="banner"]', 'background-color')).toBe('rgb(59, 89, 152)');
    await page.close();
  });

  test('never styles a login page, not even for one frame', async () => {
    const page = await h.ctx.newPage();
    await stub(page, FB, () => 'facebook-login.html');
    await page.addInitScript(() => {
      (window as unknown as { __writes: string[] }).__writes = [];
      new MutationObserver((records) => {
        for (const r of records) {
          if (r.attributeName?.startsWith('data-retroweb')) {
            (window as unknown as { __writes: string[] }).__writes.push(r.attributeName);
          }
        }
      }).observe(document.documentElement, { attributes: true });
    });
    await page.goto(`${FB}/`);
    await page.waitForTimeout(2500); // longer than the test build's retry window
    const writes = await page.evaluate(
      () => (window as unknown as { __writes: string[] }).__writes,
    );
    expect(writes).toEqual([]);
    expect(await color(page, 'body', 'font-family')).not.toContain('lucida');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.close();
  });
});

test.describe('theme and accessibility behaviour', () => {
  const pickG = (p: string) => (p === '/' ? 'google-home.html' : 'google-results.html');

  test('dark pages keep their own colours but still get shape and typography', async () => {
    await enable(['google']);
    const page = await h.ctx.newPage();
    await stub(page, G, pickG, (html) =>
      html.replace('<body>', '<body style="background:#202124">'),
    );
    await page.goto(`${G}/search?q=cats`);
    await expect(page.locator('html')).toHaveAttribute('data-retroweb-scheme', 'dark');
    expect(await color(page, '#rso h3')).not.toBe('rgb(17, 34, 204)'); // palette withheld
    expect(await color(page, '#rso h3', 'font-size')).toBe('18px'); // shape/typography kept
    await page.close();
  });

  test('forced and system reduced motion are honoured (FR-009)', async () => {
    await enable(['google']);
    const page = await h.ctx.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stub(page, G, pickG);
    await page.goto(`${G}/`);
    await expect(page.locator('html')).toHaveAttribute('data-retroweb-motion', 'reduce');
    await page.close();

    await setPrefs(h, prefs(['google'], { motion: 'reduce' }));
    const page2 = await h.ctx.newPage();
    await stub(page2, G, pickG);
    await page2.goto(`${G}/`);
    await expect(page2.locator('html')).toHaveAttribute('data-retroweb-motion', 'reduce');
    await page2.close();
  });

  test('stays intact and overflow-free across viewport widths and zoom-equivalent sizes (FR-008)', async () => {
    await enable(['google']);
    // 1024–2560 desktop widths, plus 512/720 = 200% / 140% zoom of the smaller ones.
    for (const width of [512, 720, 1024, 1440, 1920, 2560]) {
      const page = await h.ctx.newPage();
      await page.setViewportSize({ width, height: 900 });
      await stub(page, G, pickG);
      await page.goto(`${G}/search?q=cats`);
      await expect(page.locator('html')).toHaveAttribute('data-retroweb', 'google');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
      await page.close();
    }
  });

  test('popup and options pages have no automated accessibility violations', async () => {
    for (const path of ['popup.html', 'options.html']) {
      const page = await h.ctx.newPage();
      await page.goto(`chrome-extension://${h.extId}/${path}`);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`),
        path,
      ).toEqual([]);
      await page.close();
    }
  });

  test('no site made an unexpected network request', () => {
    expect(h.externalRequests).toEqual([]);
  });
});
