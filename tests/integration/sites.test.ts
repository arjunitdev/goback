import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADAPTERS } from '../../src/adapters';
import { SCROLL_SETTLE_MS, youtubeAdapter } from '../../src/adapters/youtube';
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

  it('keeps the theme painted through a click: the site attribute is never dropped or re-set', async () => {
    const h = setup('youtube-home.html', 'https://www.youtube.com/', 'youtube');
    await h.engine.start();
    const seen: Array<string | null> = [];
    new h.jsdom.MutationObserver((records) => {
      for (const r of records) seen.push(`${r.attributeName}=${h.root.getAttribute(r.attributeName!)}`);
    }).observe(h.root, { attributes: true });

    h.win.history.pushState({}, '', '/results?search_query=cats');
    h.doc.body.innerHTML = new DOMParser().parseFromString(
      fixture('youtube-results.html'),
      'text/html',
    ).body.innerHTML;
    h.doc.dispatchEvent(new h.jsdom.CustomEvent('yt-navigate-finish'));
    await sleep(20);

    expect(h.root.getAttribute(ATTR.route)).toBe('results');
    expect(h.root.getAttribute(ATTR.site)).toBe('youtube');
    // Nothing was ever removed (a removal reads back as null), so no native frame can paint.
    expect(seen).not.toContain(`${ATTR.site}=null`);
    expect(seen).not.toContain(`${ATTR.scheme}=null`);
    expect(h.engine.status()).toMatchObject({ route: 'results', health: 'healthy' });
  });

  it('watches only the route container, so deep page rendering costs the engine nothing', async () => {
    const dom = loadPage('youtube-watch.html', 'https://www.youtube.com/watch?v=abc');
    const win = dom.window as unknown as Window;
    const refresh = vi.spyOn(youtubeAdapter, 'refresh');
    try {
      const engine = createEngine({
        window: win,
        adapters: ADAPTERS,
        loadPrefs: async () => enabled('youtube'),
        report: () => undefined,
        retryDelaysMs: [1, 1, 1],
        schedule: (f) => queueMicrotask(f),
        healthyThrottleMs: 0,
      });
      engines.push(engine);
      await engine.start();
      await sleep(10);
      refresh.mockClear();

      // Deep inserts (what YouTube does thousands of times while rendering): no engine work.
      const deep = win.document.querySelector('#movie_player') ?? win.document.body;
      for (let i = 0; i < 50; i += 1) deep.append(win.document.createElement('span'));
      await sleep(20);
      expect(refresh).not.toHaveBeenCalled();

      // A swap in the route container (ytd-page-manager's direct children) is still noticed.
      win.document.querySelector('ytd-page-manager')!.append(win.document.createElement('div'));
      await sleep(20);
      expect(refresh).toHaveBeenCalled();
    } finally {
      refresh.mockRestore();
    }
  });

  it('throttles DOM-driven work while healthy but still reacts afterwards', async () => {
    const dom = loadPage('youtube-watch.html', 'https://www.youtube.com/watch?v=abc');
    const win = dom.window as unknown as Window;
    const engine = createEngine({
      window: win,
      adapters: ADAPTERS,
      loadPrefs: async () => enabled('youtube'),
      report: () => undefined,
      retryDelaysMs: [1, 1, 1],
      schedule: (f) => queueMicrotask(f),
      healthyThrottleMs: 40,
    });
    engines.push(engine);
    await engine.start();
    const root = win.document.documentElement;
    expect(root.getAttribute(ATTR.scheme)).toBe('light');

    // YouTube is watched shallowly: only direct children of <ytd-page-manager> (the route container).
    const pm = win.document.querySelector('ytd-page-manager')!;
    // The first batch after mount runs straight away and opens the throttle window.
    pm.append(win.document.createElement('div'));
    await sleep(5);
    // A change inside the window is not measured yet; once the window passes, the deferred
    // check catches it.
    win.document.body.style.backgroundColor = 'rgb(20, 20, 20)';
    pm.append(win.document.createElement('div'));
    await sleep(5);
    expect(root.getAttribute(ATTR.scheme)).toBe('light');
    await sleep(80);
    expect(root.getAttribute(ATTR.scheme)).toBe('dark');
  });

  it('puts a watch page back at the top if it jumped by itself, but never after the person scrolls', async () => {
    const run = async (input: boolean) => {
      const dom = loadPage('youtube-watch.html', 'https://www.youtube.com/watch?v=abc');
      const win = dom.window as unknown as Window;
      const scrollTo = vi.fn();
      Object.defineProperty(win, 'scrollY', { value: 120, configurable: true });
      win.scrollTo = scrollTo as unknown as typeof win.scrollTo;
      const engine = createEngine({
        window: win,
        adapters: ADAPTERS,
        loadPrefs: async () => enabled('youtube'),
        report: () => undefined,
        retryDelaysMs: [1, 1, 1],
        schedule: (f) => queueMicrotask(f),
      });
      engines.push(engine);
      await engine.start();
      if (input) win.dispatchEvent(new (dom.window as unknown as typeof globalThis).Event('wheel'));
      await sleep(SCROLL_SETTLE_MS[0]! + 150);
      engine.stop();
      return scrollTo;
    };
    const jumped = await run(false);
    expect(jumped).toHaveBeenCalledWith(0, 0);
    const scrolledByPerson = await run(true);
    expect(scrolledByPerson).not.toHaveBeenCalled();
  });

  it('fails open on unrecognised markup', async () => {
    const h = setup('google-unknown.html', 'https://www.youtube.com/watch?v=abc', 'youtube');
    await h.engine.start();
    await sleep(60);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    expect(h.events).toContain('fail-open');
  });
});

describe('google adapter: home chrome follows route and mode', () => {
  it('adds the 2012 bar on the home route in Authentic mode and removes it when the site is switched off', async () => {
    const h = setup('google-home.html', 'https://www.google.com/', 'google');
    await h.engine.start();
    expect(h.doc.getElementById('rw-gbar')).not.toBeNull();
    h.engine.stop();
    expect(h.doc.getElementById('rw-gbar')).toBeNull();
  });

  it('adds only the services bar on the results route', async () => {
    const h = setup('google-results.html', 'https://www.google.com/search?q=x', 'google');
    await h.engine.start();
    expect(h.doc.getElementById('rw-gbar')).not.toBeNull();
    expect(h.doc.getElementById('rw-gtools')).toBeNull();
    h.engine.stop();
    expect(h.doc.querySelector('[data-retroweb-injected]')).toBeNull();
  });

  it('adds nothing in Compatibility mode', async () => {
    const dom = loadPage('google-home.html', 'https://www.google.com/');
    const win = dom.window as unknown as Window;
    const p = enabled('google');
    p.sites.google.mode = 'compatibility';
    const engine = createEngine({
      window: win,
      adapters: ADAPTERS,
      loadPrefs: async () => p,
      report: () => undefined,
      retryDelaysMs: [1, 1, 1],
      schedule: (f) => queueMicrotask(f),
    });
    engines.push(engine);
    await engine.start();
    expect(win.document.querySelector('[data-retroweb-injected]')).toBeNull();
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
