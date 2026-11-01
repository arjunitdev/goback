import type { DisplayMode, MotionPref, SiteId } from '../shared/types';

export type ColorScheme = 'light' | 'dark';

export const ATTR = {
  site: 'data-retroweb',
  route: 'data-retroweb-route',
  mode: 'data-retroweb-mode',
  motion: 'data-retroweb-motion',
  contrast: 'data-retroweb-contrast',
  wordmark: 'data-retroweb-wordmark',
  scheme: 'data-retroweb-scheme',
  /** Holds the NAME of the site's dark-theme attribute while we have removed it, so any bundle can restore it. */
  hadDark: 'data-retroweb-had-dark',
} as const;

export interface StyleState {
  site: SiteId;
  route: string;
  mode: DisplayMode;
  motion: MotionPref;
  highContrast: boolean;
  /** Dev flavor only: recreated look-alike wordmark (ADR-011). */
  wordmark: boolean;
  /**
   * Whether the host page is currently rendered light or dark. The 2012 colour
   * palette is only applied on light pages: forcing light text colours onto a
   * dark page (or the reverse) makes content unreadable.
   */
  scheme: ColorScheme;
  /**
   * If set, the site's dark-theme attribute (e.g. `dark`) is held off <html>, so the
   * page renders its own light theme and `scheme` is reported as light.
   */
  lockLightAttr?: string;
}

const LIGHT_LOCKS = new WeakMap<HTMLElement, MutationObserver>();

/**
 * Holds a dark-theme attribute off <html> (Authentic mode: the 2012 sites had no dark
 * theme). The site's own script may re-add it, so a small observer strips it again. The
 * observer ends by itself once our site attribute is gone, and the attribute NAME is kept
 * on <html> so unlockLight() (from any content-script bundle) can restore it exactly.
 */
export function lockLight(root: HTMLElement, attr: string): void {
  const strip = () => {
    if (root.hasAttribute(attr)) {
      root.setAttribute(ATTR.hadDark, attr);
      root.removeAttribute(attr);
    }
  };
  strip();
  if (LIGHT_LOCKS.has(root)) return;
  const obs = new MutationObserver(() => {
    if (!root.hasAttribute(ATTR.site)) {
      obs.disconnect();
      LIGHT_LOCKS.delete(root);
      return;
    }
    strip();
  });
  obs.observe(root, { attributes: true, attributeFilter: [attr, ATTR.site] });
  LIGHT_LOCKS.set(root, obs);
}

/** Puts the dark-theme attribute back if (and only if) we removed it. */
export function unlockLight(root: HTMLElement): void {
  LIGHT_LOCKS.get(root)?.disconnect();
  LIGHT_LOCKS.delete(root);
  const attr = root.getAttribute(ATTR.hadDark);
  if (attr) {
    root.setAttribute(attr, '');
    root.removeAttribute(ATTR.hadDark);
  }
}

/** Motion is reduced if the user asked for it OR the system prefers it (FR-009). */
export function effectiveReducedMotion(pref: MotionPref, systemPrefersReduce: boolean): boolean {
  return pref === 'reduce' || systemPrefersReduce;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): Rgba | null {
  const m =
    /^rgba?\(\s*(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)(?:[ ,/]+(\d*\.?\d+%?))?\s*\)$/.exec(
      value.trim(),
    );
  if (!m) return null;
  const alphaRaw = m[4];
  let a = 1;
  if (alphaRaw !== undefined)
    a = alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw);
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
}

/** Relative luminance, 0 (black) to 1 (white). */
function luminance({ r, g, b }: Rgba): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Reads the page's own background (body, then <html>) and classifies it. If
 * neither paints a background, the browser canvas shows through, which is light
 * unless the system scheme says otherwise.
 */
export function detectScheme(doc: Document, systemDark: boolean): ColorScheme {
  const view = doc.defaultView;
  if (!view) return 'light';
  for (const el of [doc.body, doc.documentElement]) {
    if (!el) continue;
    const color = parseColor(view.getComputedStyle(el).backgroundColor);
    if (color && color.a >= 0.5) return luminance(color) < 0.18 ? 'dark' : 'light';
  }
  return systemDark ? 'dark' : 'light';
}

/**
 * All presentation is driven by attributes on <html>; stylesheets are scoped
 * to `html[data-retroweb="<site>"]`. Removing the attributes restores the
 * native page, which is also the fail-open path.
 */
export function applyStyleState(root: HTMLElement, state: StyleState, systemReduce: boolean): void {
  root.setAttribute(ATTR.site, state.site);
  root.setAttribute(ATTR.route, state.route);
  root.setAttribute(ATTR.mode, state.mode);
  // The scheme is whatever the caller measured (or optimistically guessed at document_start):
  // holding the dark attribute off is not proof the page turned light, so it is never forced.
  if (state.lockLightAttr) lockLight(root, state.lockLightAttr);
  else unlockLight(root);
  root.setAttribute(ATTR.scheme, state.scheme);
  setFlag(root, ATTR.motion, effectiveReducedMotion(state.motion, systemReduce) ? 'reduce' : null);
  setFlag(root, ATTR.contrast, state.highContrast ? 'high' : null);
  setFlag(root, ATTR.wordmark, state.wordmark ? 'on' : null);
}

export function clearStyleState(root: HTMLElement): void {
  // Restore the site's dark-theme attribute FIRST, while our site attribute is still present,
  // so every light-lock observer sees the site attribute vanish and stands down (no re-strip).
  unlockLight(root);
  for (const name of Object.values(ATTR)) root.removeAttribute(name);
}

function setFlag(root: HTMLElement, name: string, value: string | null): void {
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}
