export type SiteId = 'youtube' | 'google' | 'facebook';
export type DisplayMode = 'authentic' | 'compatibility';
/** 'system' follows prefers-reduced-motion; 'reduce' forces it. Motion can never be forced on (FR-009). */
export type MotionPref = 'system' | 'reduce';

export interface SitePrefs {
  enabled: boolean;
  mode: DisplayMode;
  /** Historical theme version; only the 2012 baseline exists today. */
  theme: 2012;
}

export interface Prefs {
  schema: 1;
  /** Global kill switch (FR-001): when true, nothing is applied anywhere. */
  killSwitch: boolean;
  motion: MotionPref;
  highContrast: boolean;
  sites: Record<SiteId, SitePrefs>;
}

export type HealthState = 'healthy' | 'degraded' | 'failed';

export interface AdapterContext {
  document: Document;
  url: URL;
  route: string;
  prefs: Prefs;
  site: SitePrefs;
}

/** Adapter contract (docs/03 §3.7). */
export interface SiteAdapter {
  id: SiteId;
  /** Adapter version, tracked independently from the extension version (docs/03 §3.8). */
  version: string;
  matches(url: URL): boolean;
  detectRoute(document: Document, url: URL): string | null;
  probe(document: Document, route: string): { supported: boolean; missing: string[] };
  /** Stable subtree the mutation coordinator watches; defaults to <body>. */
  observeRoot?(document: Document): Node | null;
  /**
   * Apply attributes at document_start (default true). Set false when the first
   * paint may be a page that must stay native (e.g. a login wall): styles are
   * then applied only after the first probe passes.
   */
  earlyStyle?: boolean;
  /**
   * Name of the <html> attribute the site uses to switch to its dark theme (YouTube: `dark`).
   * In Authentic mode the engine holds it off, because the 2012 sites had no dark theme;
   * Compatibility mode and teardown restore it.
   */
  forceLightAttr?: string;
  /** Document events that signal a client-side navigation (e.g. YouTube's yt-navigate-finish). */
  navigationEvents?: readonly string[];
  /**
   * Route changes inside this site keep the theme in place (only the route attribute and probes
   * change) instead of tearing everything down and re-applying it. Safe for CSS-only adapters.
   */
  keepOnRouteChange?: boolean;
  mount(ctx: AdapterContext): Promise<void> | void;
  refresh(ctx: AdapterContext): void;
  unmount(ctx: AdapterContext): void;
}

/** Status reported to the popup for QA / diagnostics persona. */
export interface AdapterStatus {
  adapter: SiteId | null;
  adapterVersion: string | null;
  route: string | null;
  health: HealthState | 'inactive';
  missing: string[];
}

export type Message = { type: 'diag'; event: DiagEvent } | { type: 'status' } | { type: 'sync' };

/** Allow-listed diagnostic events: names only, never page content (docs/08 §8.2). */
export const DIAG_EVENTS = [
  'mounted',
  'unmounted',
  'probe-miss',
  'fail-open',
  'route-change',
  'observer-cap',
] as const;
export type DiagEvent = (typeof DIAG_EVENTS)[number];
export type DiagCounters = Partial<Record<DiagEvent, number>>;
