import { afterEach, describe, expect, it } from 'vitest';
import { ADAPTERS } from '../../src/adapters';
import { createEngine, type Engine } from '../../src/engine/bootstrap';
import { ATTR } from '../../src/engine/style-manager';
import { DEFAULT_PREFS } from '../../src/shared/flags';
import type { DiagEvent, Prefs, SiteId } from '../../src/shared/types';
import { fixture, loadPage } from '../fixtures/load';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const engines: Engine[] = [];
afterEach(() => {
  while (engines.length) engines.pop()?.stop();
});

function enabled(site: SiteId): Prefs {
  const p = structuredClone(DEFAULT_PREFS);
  p.sites[site].enabled = true;
  return p;
}

function setup(page: string, url: string, site: SiteId) {
  const dom = loadPage(page, url);
  const win = dom.window as unknown as Window;
  const events: DiagEvent[] = [];
  const engine = createEngine({
    window: win,
    adapters: ADAPTERS,
    loadPrefs: async () => enabled(site),
    report: (e) => events.push(e),
    retryDelaysMs: [1, 1, 1],
    schedule: (f) => queueMicrotask(f),
  });
  engines.push(engine);
  return {
    engine,
    events,
    win,
    jsdom: dom.window, // typed jsdom window, for CustomEvent / MutationObserver
    doc: win.document,
    root: win.document.documentElement,
  };
}

describe('youtube adapter on fixtures', () => {
  it.each([
    ['youtube-home.html', 'https://www.youtube.com/', 'home'],
    ['youtube-watch.html', 'https://www.youtube.com/watch?v=abc', 'watch'],
    ['youtube-results.html', 'https://www.youtube.com/results?search_query=x', 'results'],
  ])('mounts %s as route %s', async (file, url, route) => {
    const h = setup(file, url, 'youtube');
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.site)).toBe('youtube');
    expect(h.root.getAttribute(ATTR.route)).toBe(route);
    expect(h.engine.status()).toMatchObject({ adapter: 'youtube', route, health: 'healthy' });
  });

  it('never mutates the player, ads or consent UI', async () => {
    const h = setup('youtube-watch.html', 'https://www.youtube.com/watch?v=abc', 'youtube');
    const keep = () =>
      [...h.doc.querySelectorAll('[data-keep], #movie_player, ytd-popup-container')].map(
        (e) => e.outerHTML,
      );
    const before = keep();
    await h.engine.start();
    await sleep(10);
    expect(keep()).toEqual(before);
    expect(before.length).toBeGreaterThanOrEqual(3);
    expect(h.doc.body.getAttributeNames()).toEqual([]);
  });

  it('follows SPA navigation signalled by yt-navigate-finish', async () => {
    const h = setup('youtube-home.html', 'https://www.youtube.com/', 'youtube');
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.route)).toBe('home');

    h.win.history.pushState({}, '', '/results?search_query=cats');
    h.doc.body.innerHTML = new DOMParser().parseFromString(
      fixture('youtube-results.html'),
      'text/html',
    ).body.innerHTML;
    // No DOM-mutation wait: the site event alone must trigger the route check.
    h.doc.dispatchEvent(new h.jsdom.CustomEvent('yt-navigate-finish'));
    await sleep(20);
    expect(h.root.getAttribute(ATTR.route)).toBe('results');
    expect(h.events).toContain('route-change');
  });

  it('fails open on unrecognised markup', async () => {
    const h = setup('google-unknown.html', 'https://www.youtube.com/watch?v=abc', 'youtube');
    await h.engine.start();
    await sleep(60);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    expect(h.events).toContain('fail-open');
  });
});

describe('facebook adapter on fixtures', () => {
  it('styles a signed-in shell only after the probe passes (no early style)', async () => {
    const h = setup('facebook-feed.html', 'https://www.facebook.com/', 'facebook');
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.site)).toBe('facebook');
    expect(h.root.getAttribute(ATTR.route)).toBe('feed');
    expect(h.engine.status()).toMatchObject({ adapter: 'facebook', health: 'healthy' });
  });

  it('NEVER styles a login page, even when landmark roles are present', async () => {
    const h = setup('facebook-login.html', 'https://www.facebook.com/', 'facebook');
    const seen: string[] = [];
    new h.jsdom.MutationObserver(() => seen.push('attr')).observe(h.root, { attributes: true });
    await h.engine.start();
    await sleep(60);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    expect(seen).toEqual([]); // the attribute was never set, not even briefly
    expect(h.engine.status().missing).toContain('blocked:password-field');
  });

  it('drops the theme if a login form appears later (e.g. session expiry)', async () => {
    const h = setup('facebook-feed.html', 'https://www.facebook.com/', 'facebook');
    await h.engine.start();
    expect(h.root.hasAttribute(ATTR.site)).toBe(true);
    const pw = h.doc.createElement('input');
    pw.type = 'password';
    h.doc.body.append(pw);
    await sleep(60);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
  });

  it('never mutates posts, dialogs or privacy controls', async () => {
    const h = setup('facebook-feed.html', 'https://www.facebook.com/', 'facebook');
    const keep = () => [...h.doc.querySelectorAll('[data-keep]')].map((e) => e.outerHTML);
    const before = keep();
    await h.engine.start();
    await sleep(10);
    expect(keep()).toEqual(before);
    expect(before).toHaveLength(2);
    expect(h.doc.body.getAttributeNames()).toEqual([]);
  });

  it('leaves non-themed routes native', async () => {
    const h = setup('facebook-feed.html', 'https://www.facebook.com/settings', 'facebook');
    await h.engine.start();
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
  });
});

describe('sites are independent', () => {
  it('enabling only Google does not theme YouTube or Facebook', async () => {
    for (const [file, url] of [
      ['youtube-home.html', 'https://www.youtube.com/'],
      ['facebook-feed.html', 'https://www.facebook.com/'],
    ] as const) {
      const h = setup(file, url, 'google');
      await h.engine.start();
      expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    }
  });
});
