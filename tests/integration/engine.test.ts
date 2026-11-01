import { afterEach, describe, expect, it } from 'vitest';
import { ADAPTERS } from '../../src/adapters';
import { createEngine, type Engine } from '../../src/engine/bootstrap';
import { ATTR } from '../../src/engine/style-manager';
import { DEFAULT_PREFS } from '../../src/shared/flags';
import type { DiagEvent, Prefs } from '../../src/shared/types';
import { fixture, loadPage } from '../fixtures/load';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function prefs(overrides: Partial<Prefs> = {}, googleEnabled = true): Prefs {
  const p = structuredClone(DEFAULT_PREFS);
  p.sites.google.enabled = googleEnabled;
  return { ...p, ...overrides };
}

interface Harness {
  engine: Engine;
  root: HTMLElement;
  events: DiagEvent[];
  doc: Document;
  win: Window;
  setPrefs(p: Prefs): void;
}

const engines: Engine[] = [];

function setup(page: string, url: string, initial: Prefs, retries: number[] = [1, 1, 1]): Harness {
  const dom = loadPage(page, url);
  const win = dom.window as unknown as Window;
  let current = initial;
  const events: DiagEvent[] = [];
  const engine = createEngine({
    window: win,
    adapters: ADAPTERS,
    loadPrefs: async () => current,
    report: (e) => events.push(e),
    retryDelaysMs: retries,
    schedule: (f) => queueMicrotask(f),
  });
  engines.push(engine);
  return {
    engine,
    root: win.document.documentElement,
    events,
    doc: win.document,
    win,
    setPrefs: (p) => {
      current = p;
    },
  };
}

afterEach(() => {
  while (engines.length) engines.pop()?.stop();
});

describe('engine on a supported Google results page', () => {
  const url = 'https://www.google.com/search?q=query';

  it('mounts, applies scoped attributes and reports healthy', async () => {
    const h = setup('google-results.html', url, prefs());
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.site)).toBe('google');
    expect(h.root.getAttribute(ATTR.route)).toBe('results');
    expect(h.root.getAttribute(ATTR.mode)).toBe('authentic');
    expect(h.engine.status()).toMatchObject({
      adapter: 'google',
      route: 'results',
      health: 'healthy',
    });
    expect(h.events).toContain('mounted');
  });

  it('never mutates ads, consent UI, the search form or result links', async () => {
    const h = setup('google-results.html', url, prefs());
    const before = ['#tads', '[data-consent]', 'form[action="/search"]', '#rso'].map(
      (s) => h.doc.querySelector(s)?.outerHTML,
    );
    await h.engine.start();
    await sleep(10);
    const after = ['#tads', '[data-consent]', 'form[action="/search"]', '#rso'].map(
      (s) => h.doc.querySelector(s)?.outerHTML,
    );
    expect(after).toEqual(before);
    expect(before.every(Boolean)).toBe(true);
    // Only <html> attributes are written by the engine.
    expect(h.doc.body.getAttributeNames()).toEqual([]);
  });

  it('measures the page scheme: light by default, dark when the page paints dark', async () => {
    const light = setup('google-results.html', url, prefs());
    await light.engine.start();
    expect(light.root.getAttribute(ATTR.scheme)).toBe('light');

    const dark = setup('google-results.html', url, prefs());
    dark.doc.body.style.backgroundColor = 'rgb(32, 33, 36)';
    await dark.engine.start();
    expect(dark.root.getAttribute(ATTR.scheme)).toBe('dark');
  });

  it('re-measures the scheme when the page theme changes after mount', async () => {
    const h = setup('google-results.html', url, prefs());
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.scheme)).toBe('light');
    h.doc.body.style.backgroundColor = 'rgb(20, 20, 20)';
    h.doc.body.append(h.doc.createElement('div')); // a DOM change triggers a refresh
    await sleep(20);
    expect(h.root.getAttribute(ATTR.scheme)).toBe('dark');
  });

  it('applies mode, high contrast and forced reduced motion from prefs', async () => {
    const p = prefs({ highContrast: true, motion: 'reduce' });
    p.sites.google.mode = 'compatibility';
    const h = setup('google-results.html', url, p);
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.mode)).toBe('compatibility');
    expect(h.root.getAttribute(ATTR.contrast)).toBe('high');
    expect(h.root.getAttribute(ATTR.motion)).toBe('reduce');
  });

  it('restores the native page when the site is disabled or the kill switch flips', async () => {
    const h = setup('google-results.html', url, prefs());
    await h.engine.start();
    h.setPrefs(prefs({ killSwitch: true }));
    await h.engine.reconcile();
    expect(h.root.getAttributeNames().filter((n) => n.startsWith('data-retroweb'))).toEqual([]);

    h.setPrefs(prefs());
    await h.engine.reconcile();
    expect(h.root.getAttribute(ATTR.site)).toBe('google');

    h.setPrefs(prefs({}, false));
    await h.engine.reconcile();
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    expect(h.events).toContain('unmounted');
  });

  it('clears stale attributes left by the early script when the site is not active', async () => {
    const h = setup('google-results.html', url, prefs({}, false));
    h.root.setAttribute(ATTR.site, 'google');
    await h.engine.start();
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
  });
});

describe('engine routing', () => {
  it('leaves auth/consent/settings paths native', async () => {
    const h = setup('google-results.html', 'https://www.google.com/signin', prefs());
    await h.engine.start();
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
  });

  it('leaves other google hosts and regional domains native (ADR-006)', async () => {
    for (const u of ['https://accounts.google.com/', 'https://www.google.co.uk/search?q=a']) {
      const h = setup('google-results.html', u, prefs());
      await h.engine.start();
      expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    }
  });

  it('re-applies on a client-side route change (home -> results)', async () => {
    const h = setup('google-home.html', 'https://www.google.com/', prefs());
    await h.engine.start();
    expect(h.root.getAttribute(ATTR.route)).toBe('home');

    h.win.history.pushState({}, '', '/search?q=cats');
    h.doc.body.innerHTML = new DOMParser().parseFromString(
      fixture('google-results.html'),
      'text/html',
    ).body.innerHTML;
    await sleep(20);
    expect(h.root.getAttribute(ATTR.route)).toBe('results');
    expect(h.events).toContain('route-change');
    expect(h.engine.status().health).toBe('healthy');
  });

  it('drops the theme when navigating from a supported to an unsupported route', async () => {
    const h = setup('google-results.html', 'https://www.google.com/search?q=a', prefs());
    await h.engine.start();
    h.win.history.pushState({}, '', '/preferences');
    h.doc.body.append(h.doc.createElement('div'));
    await sleep(20);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
  });
});

describe('engine fail-open (FR-007, R01)', () => {
  it('restores native presentation when markup is unrecognised, and says so', async () => {
    const h = setup('google-unknown.html', 'https://www.google.com/search?q=a', prefs());
    await h.engine.start();
    await sleep(60);
    expect(h.root.hasAttribute(ATTR.site)).toBe(false);
    expect(h.events).toContain('fail-open');
    const status = h.engine.status();
    expect(status.health).toBe('failed');
    expect(status.missing).toContain('search-box');
  });

  it('recovers when the page finishes rendering before the retries run out', async () => {
    const h = setup(
      'google-unknown.html',
      'https://www.google.com/search?q=a',
      prefs(),
      [30, 30, 30],
    );
    await h.engine.start();
    h.doc.body.innerHTML = new DOMParser().parseFromString(
      fixture('google-results.html'),
      'text/html',
    ).body.innerHTML;
    await sleep(120);
    expect(h.root.getAttribute(ATTR.site)).toBe('google');
    expect(h.events).not.toContain('fail-open');
  });
});
