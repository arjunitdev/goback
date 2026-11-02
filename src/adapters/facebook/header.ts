import { parseColor } from '../../engine/style-manager';

/**
 * Facebook's header markup is hashed and unverified here (no signed-in test account), so instead of
 * guessing selectors the extension measures the live header and marks the two things the stylesheet
 * needs to know about, with an attribute only:
 *
 *  - `bar`:    every box that really paints the header's background. They are found by hit-testing: at a
 *              few points in empty parts of the bar, every element stacked there that is header-sized and
 *              has an opaque background is one of the layers the person sees. That finds the dark colour
 *              wherever it lives (the banner, a wrapper many levels up, an inner row), whatever the markup.
 *  - `search`: the search pill, so the stylesheet can restyle it and move it clear of the wider wordmark.
 *
 * Only computed styles and geometry are read (never page text); the only write is the attribute, which is
 * removed again on unmount.
 */
export const HEADER_ATTR = 'data-rw-fb';

type Box = { x: number; y: number; width: number; height: number };

export interface HeaderOptions {
  /** Tests inject geometry because jsdom has no layout. */
  rectOf?: (el: Element) => Box;
  /** Elements painted at a point, topmost first (document.elementsFromPoint). */
  stackAt?: (x: number, y: number) => Element[];
  /** Viewport width; defaults to the window's. */
  viewportWidth?: number;
}

const MAX_DESCENDANTS = 200;
const MAX_ANCESTORS = 4;
/** Where the bar's empty stretches are, as fractions of the viewport width (between the left cluster, the tabs and the right cluster). */
const PROBE_X = [0.25, 0.75];
const FALLBACK_BAR_HEIGHT = 56;

function mark(el: Element, kind: 'bar' | 'search'): boolean {
  if (el.getAttribute(HEADER_ATTR) === kind) return false;
  el.setAttribute(HEADER_ATTR, kind);
  return true;
}

function opaque(el: Element, view: Window): boolean {
  const c = parseColor(view.getComputedStyle(el).backgroundColor);
  return c !== null && c.a >= 0.5;
}

/**
 * The search pill is a box with any background at all (Facebook paints it as a translucent overlay, which
 * is not "opaque") or clearly rounded corners.
 */
function pillLike(el: Element, view: Window): boolean {
  const s = view.getComputedStyle(el);
  const c = parseColor(s.backgroundColor);
  if (c !== null && c.a > 0.02) return true;
  const radius = parseFloat(s.borderTopLeftRadius);
  return Number.isFinite(radius) && radius >= 8;
}

/** Marks the header's background layers and search pill; returns how many nodes were newly marked. */
export function markHeader(doc: Document, options: HeaderOptions = {}): number {
  const view = doc.defaultView;
  const banner = doc.querySelector('[role="banner"]');
  if (!view || !banner) return 0;
  const rectOf = options.rectOf ?? ((el: Element) => el.getBoundingClientRect());
  const stackAt =
    options.stackAt ??
    ((x: number, y: number) =>
      typeof doc.elementsFromPoint === 'function' ? doc.elementsFromPoint(x, y) : []);
  const vw = options.viewportWidth ?? view.innerWidth;
  const b = rectOf(banner);
  // The bar's height: the banner's, unless it is only a small wrapper.
  const barHeight = b.height >= 30 ? b.height : FALLBACK_BAR_HEIGHT;
  const barTop = b.height >= 30 ? b.y : 0;
  const isBarSized = (r: Box) =>
    r.width >= vw * 0.9 &&
    r.height >= barHeight * 0.7 &&
    r.height <= barHeight * 1.6 &&
    Math.abs(r.y - barTop) <= barHeight;
  let marked = 0;

  // 1. What is painted at empty points along the bar: the real background layers.
  const midY = barTop + barHeight / 2;
  for (const fx of PROBE_X) {
    for (const el of stackAt(vw * fx, midY)) {
      if (el === doc.documentElement || el === doc.body) continue;
      if (isBarSized(rectOf(el)) && opaque(el, view) && mark(el, 'bar')) marked += 1;
    }
  }

  // 2. The banner, a few wrappers around it, and boxes inside it that span the bar (for pages where the
  //    hit test finds nothing, e.g. a point covered by a transparent overlay).
  const layers: Element[] = [banner];
  let up: Element | null = banner.parentElement;
  for (let i = 0; i < MAX_ANCESTORS && up && up !== doc.body && up !== doc.documentElement; i += 1) {
    layers.push(up);
    up = up.parentElement;
  }
  layers.push(...Array.from(banner.querySelectorAll('div')).slice(0, MAX_DESCENDANTS));
  for (const el of layers) {
    if (isBarSized(rectOf(el)) && opaque(el, view) && mark(el, 'bar')) marked += 1;
  }

  // 3. The search pill: the nearest box around the top search field that is opaque and clearly narrower than
  //    the bar. Start above the field itself: an <input> has its own (white) default background.
  const field = doc.querySelector('input[type="search"]');
  const fieldTop = field ? rectOf(field).y : Infinity;
  if (field && fieldTop < barTop + barHeight) {
    for (let el: Element | null = field.parentElement, i = 0; el && el !== doc.body && i < 6; el = el.parentElement, i += 1) {
      const r = rectOf(el);
      if (r.width > 0 && r.width < vw * 0.5 && r.height <= barHeight && pillLike(el, view)) {
        if (mark(el, 'search')) marked += 1;
        break;
      }
    }
  }
  return marked;
}

/** How often the (not free) scan may run; the header re-renders when you navigate, so there is no run cap. */
const MIN_GAP_MS = 400;
let lastRun = 0;
let trailing: ReturnType<typeof setTimeout> | null = null;

/** Rate-limited wrapper for the adapter hook; a call inside the gap schedules one trailing scan. */
export function markHeaderNow(doc: Document, now = Date.now()): void {
  if (now - lastRun < MIN_GAP_MS) {
    trailing ??= setTimeout(() => {
      trailing = null;
      lastRun = Date.now();
      markHeader(doc);
    }, MIN_GAP_MS);
    return;
  }
  lastRun = now;
  markHeader(doc);
}

export function clearHeader(doc: Document): void {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  for (const el of Array.from(doc.querySelectorAll(`[${HEADER_ATTR}]`))) el.removeAttribute(HEADER_ATTR);
}
