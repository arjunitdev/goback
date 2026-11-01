import { isSiteActive } from '../shared/flags';
import type { AdapterContext, AdapterStatus, DiagEvent, Prefs, SiteAdapter } from '../shared/types';
import { HealthMonitor } from './health';
import { createBatchedObserver, type BatchedObserver } from './observer';
import { createRouteWatcher, type RouteWatcher } from './router';
import { ATTR, applyStyleState, clearStyleState, detectScheme } from './style-manager';

export interface EngineDeps {
  window: Window;
  adapters: readonly SiteAdapter[];
  loadPrefs(): Promise<Prefs>;
  report(event: DiagEvent): void;
  /** Dev flavor only: enable the recreated wordmark attribute. */
  wordmark?: boolean;
  /** Delays between probe retries while a page is still rendering. */
  retryDelaysMs?: readonly number[];
  schedule?: (flush: () => void) => void;
  failThreshold?: number;
}

export interface Engine {
  start(): Promise<void>;
  /** Re-read prefs and reconcile (called on storage changes). */
  reconcile(): Promise<void>;
  stop(): void;
  status(): AdapterStatus;
}

interface Mounted {
  adapter: SiteAdapter;
  route: string;
  ctx: AdapterContext;
  /** Attributes are on <html>. False until the first healthy probe for late-style adapters. */
  styled: boolean;
}

/**
 * Probe retry schedule (~20s in total). Single-page apps like YouTube can take
 * several seconds to render a route on a cold or slow connection; failing open too
 * early would wrongly drop the theme on healthy pages (observed live, 2026-10-31).
 */
const DEFAULT_RETRIES = [400, 1200, 3000, 6000, 10000] as const;

export function createEngine(deps: EngineDeps): Engine {
  const win = deps.window;
  const doc = win.document;
  const retries = deps.retryDelaysMs ?? DEFAULT_RETRIES;
  const health = new HealthMonitor({ failThreshold: deps.failThreshold ?? retries.length + 1 });

  let mounted: Mounted | null = null;
  let generation = 0;
  let latched: string | null = null; // "site:route" that failed open; stays native until nav/prefs change
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryIndex = 0;
  let observer: BatchedObserver | null = null;
  let watcher: RouteWatcher | null = null;
  let lastStatus: AdapterStatus = inactiveStatus();

  function inactiveStatus(): AdapterStatus {
    return { adapter: null, adapterVersion: null, route: null, health: 'inactive', missing: [] };
  }

  function clearRetry(): void {
    if (retryTimer !== null) clearTimeout(retryTimer);
    retryTimer = null;
  }

  function systemReduce(): boolean {
    return typeof win.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  }

  function systemDark(): boolean {
    return typeof win.matchMedia === 'function'
      ? win.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }

  function style(ctx: AdapterContext, adapter: SiteAdapter): void {
    applyStyleState(
      doc.documentElement,
      {
        site: adapter.id,
        route: ctx.route,
        mode: ctx.site.mode,
        motion: ctx.prefs.motion,
        highContrast: ctx.prefs.highContrast,
        wordmark: deps.wordmark === true,
        scheme: detectScheme(doc, systemDark()),
      },
      systemReduce(),
    );
  }

  /** Re-measure the page scheme (theme toggled, late stylesheet) without a full restyle. */
  function refreshScheme(): void {
    const m = mounted;
    if (!m?.styled) return;
    const next = detectScheme(doc, systemDark());
    if (doc.documentElement.getAttribute(ATTR.scheme) !== next) {
      doc.documentElement.setAttribute(ATTR.scheme, next);
    }
  }

  function teardown(): void {
    clearRetry();
    observer?.disconnect();
    if (mounted) {
      try {
        mounted.adapter.unmount(mounted.ctx);
      } catch {
        // Unmount must never block restoring the native page.
      }
      deps.report('unmounted');
    }
    clearStyleState(doc.documentElement);
    mounted = null;
    health.reset();
    retryIndex = 0;
    lastStatus = inactiveStatus();
  }

  function failOpen(m: Mounted): void {
    latched = `${m.adapter.id}:${m.route}`;
    const missing = health.missing;
    deps.report('fail-open');
    teardown();
    lastStatus = {
      adapter: m.adapter.id,
      adapterVersion: m.adapter.version,
      route: m.route,
      health: 'failed',
      missing,
    };
  }

  function probeNow(): void {
    const m = mounted;
    if (!m) return;
    const result = m.adapter.probe(doc, m.route);
    const before = health.state;
    const state = health.record(result);
    if (result.missing.length > 0 && before === 'healthy') deps.report('probe-miss');
    lastStatus = {
      adapter: m.adapter.id,
      adapterVersion: m.adapter.version,
      route: m.route,
      health: state,
      missing: health.missing,
    };
    if (state === 'failed') {
      failOpen(m);
      return;
    }
    if (result.supported && !m.styled) {
      m.styled = true;
      style(m.ctx, m.adapter);
    }
    if (!result.supported) scheduleRetry();
  }

  function scheduleRetry(): void {
    clearRetry();
    const delay = retries[retryIndex];
    if (delay === undefined) return;
    retryIndex += 1;
    retryTimer = setTimeout(probeNow, delay);
  }

  async function reconcile(trigger: 'prefs' | 'nav' | 'start'): Promise<void> {
    const gen = ++generation;
    const prefs = await deps.loadPrefs();
    if (gen !== generation) return; // a newer reconcile superseded this one

    const url = new URL(win.location.href);
    const adapter = deps.adapters.find((a) => a.matches(url));
    if (!adapter || !isSiteActive(prefs, adapter.id)) {
      latched = null;
      if (mounted || doc.documentElement.hasAttribute('data-retroweb')) teardown();
      return;
    }
    const route = adapter.detectRoute(doc, url);
    if (!route) {
      teardown();
      return;
    }
    const key = `${adapter.id}:${route}`;
    if (trigger === 'prefs') latched = null; // user changed settings: give it another chance
    if (latched === key) return;
    if (latched !== null && latched !== key) latched = null;

    const ctx: AdapterContext = { document: doc, url, route, prefs, site: prefs.sites[adapter.id] };

    if (mounted && mounted.adapter === adapter && mounted.route === route) {
      mounted.ctx = ctx;
      if (mounted.styled) style(ctx, adapter);
      adapter.refresh(ctx);
      probeNow();
      return;
    }

    teardown();
    health.reset();
    retryIndex = 0;
    const early = adapter.earlyStyle !== false;
    const next: Mounted = { adapter, route, ctx, styled: early };
    mounted = next;
    if (early) style(ctx, adapter);
    try {
      await adapter.mount(ctx);
    } catch {
      if (gen === generation) failOpen(next);
      return;
    }
    if (gen !== generation) return;
    deps.report('mounted');
    watchDom(adapter);
    probeNow();
  }

  function watchDom(adapter: SiteAdapter): void {
    observer ??= createBatchedObserver(
      (info) => {
        if (info.capped) deps.report('observer-cap');
        if (watcher?.check()) return; // route change triggers a full reconcile
        const m = mounted;
        if (!m) return;
        refreshScheme();
        m.adapter.refresh(m.ctx);
        probeNow();
      },
      { schedule: deps.schedule },
    );
    const root = adapter.observeRoot?.(doc) ?? doc.body ?? doc.documentElement;
    observer.observe(root);
  }

  // Document events some sites fire on client-side navigation (e.g. yt-navigate-finish).
  const navEvents = [...new Set(deps.adapters.flatMap((a) => a.navigationEvents ?? []))];
  const onNavEvent = () => {
    watcher?.check();
  };

  const schemeQuery =
    typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-color-scheme: dark)') : null;

  return {
    async start() {
      watcher = createRouteWatcher(win, () => {
        deps.report('route-change');
        void reconcile('nav');
      });
      for (const ev of navEvents) doc.addEventListener(ev, onNavEvent);
      schemeQuery?.addEventListener('change', refreshScheme);
      await reconcile('start');
    },
    reconcile: () => reconcile('prefs'),
    stop() {
      generation += 1;
      schemeQuery?.removeEventListener('change', refreshScheme);
      for (const ev of navEvents) doc.removeEventListener(ev, onNavEvent);
      watcher?.dispose();
      watcher = null;
      teardown();
      observer = null;
    },
    status: () => lastStatus,
  };
}
