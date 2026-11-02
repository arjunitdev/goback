import { parseColor } from '../../engine/style-manager';

/**
 * Facebook's header markup is hashed and unverified here (no signed-in test account), so instead of
 * guessing selectors the extension measures the live header and marks the two things the stylesheet
 * needs to know about, with an attribute only:
 *
 *  - `bar`:    the element(s) that actually paint the header's background. The dark colour is rarely on the
 *              `[role=banner]` node itself; it can sit on a wrapper or an inner row. Any box that spans the
 *              header and has an opaque background gets the blue.
 *  - `search`: the search pill, so the stylesheet can move it clear of the wider wordmark.
 *
 * Only computed styles and geometry are read (never page text); the only write is the attribute, which is
 * removed again on unmount.
 */
export const HEADER_ATTR = 'data-rw-fb';

export interface HeaderOptions {
  /** Tests inject geometry because jsdom has no layout. */
  rectOf?: (el: Element) => { x: number; y: number; width: number; height: number };
}

const MAX_DESCENDANTS = 200;
const MAX_ANCESTORS = 4;

function mark(el: Element, kind: 'bar' | 'search'): boolean {
  if (el.getAttribute(HEADER_ATTR) === kind) return false;
  el.setAttribute(HEADER_ATTR, kind);
  return true;
}

function opaque(el: Element, view: Window): boolean {
  const c = parseColor(view.getComputedStyle(el).backgroundColor);
  return c !== null && c.a >= 0.5;
}

/** Marks the header's background layers and search pill; returns how many nodes were newly marked. */
export function markHeader(doc: Document, options: HeaderOptions = {}): number {
  const view = doc.defaultView;
  const banner = doc.querySelector('[role="banner"]');
  if (!view || !banner) return 0;
  const rectOf = options.rectOf ?? ((el: Element) => el.getBoundingClientRect());
  const b = rectOf(banner);
  if (b.width <= 0 || b.height <= 0) return 0;
  let marked = 0;

  // Background layers: the banner, a few wrappers around it, and boxes inside it that span the bar.
  const layers: Element[] = [banner];
  let up: Element | null = banner.parentElement;
  for (let i = 0; i < MAX_ANCESTORS && up && up !== doc.body && up !== doc.documentElement; i += 1) {
    layers.push(up);
    up = up.parentElement;
  }
  layers.push(...Array.from(banner.querySelectorAll('div')).slice(0, MAX_DESCENDANTS));
  for (const el of layers) {
    const r = rectOf(el);
    const spansBar =
      r.width >= b.width * 0.9 &&
      r.height >= b.height * 0.7 &&
      r.height <= b.height * 1.6 &&
      Math.abs(r.y - b.y) <= b.height;
    if (spansBar && opaque(el, view) && mark(el, 'bar')) marked += 1;
  }

  // The search pill: the nearest box around the search field that is opaque and clearly narrower than the bar.
  const field = banner.querySelector('input[type="search"], [role="search"] input');
  // Start above the field itself: an <input> has its own (white) default background and is not the pill.
  for (let el: Element | null = field?.parentElement ?? null, i = 0; el && el !== banner && i < 6; el = el.parentElement, i += 1) {
    const r = rectOf(el);
    if (r.width > 0 && r.width < b.width * 0.5 && r.height <= b.height && opaque(el, view)) {
      if (mark(el, 'search')) marked += 1;
      break;
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
