import { luminance, parseColor } from '../../engine/style-manager';

/**
 * Safety net for pages we cannot pre-verify. Google chooses its theme on the server and a few
 * panels (AI Overviews, chat boxes) hard-code dark-theme text colours that our light pin cannot
 * reach, which leaves pale text on a white page. Rather than ship an unreadable page, we measure:
 * if a large share of the visible text has far too little contrast against its background, the
 * engine treats the route as unsupported and fails open to the native page (FR-007).
 *
 * Read-only: only computed styles and geometry are read, never page text.
 */
export interface LegibilityOptions {
  /** Defaults to "inside or near the viewport"; tests inject a stub because jsdom has no layout. */
  isVisible?: (el: Element) => boolean;
  /** Contrast ratio under which text counts as unreadable (WCAG AA asks for 4.5). */
  floor?: number;
}

const MAX_TEXT_NODES = 800;
const MIN_SAMPLE = 20;
const MIN_BAD = 10;
const BAD_SHARE = 0.25;

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = el.ownerDocument.defaultView?.innerHeight ?? 0;
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < h * 1.5;
}

/** Background luminance behind an element, or null when it cannot be known (image, gradient). */
function backgroundLuminance(el: Element, view: Window): number | null {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const s = view.getComputedStyle(n);
    if (s.backgroundImage && s.backgroundImage !== 'none') return null;
    const c = parseColor(s.backgroundColor);
    if (c && c.a >= 0.5) return luminance(c);
  }
  return 1; // nothing paints a background: the (light) canvas
}

/** Text that is mid-fade (opacity animation) is transient and says nothing about the theme. */
function isFading(el: Element, view: Window): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const o = parseFloat(view.getComputedStyle(n).opacity);
    if (!Number.isNaN(o) && o < 0.9) return true;
  }
  return false;
}

/** True when the visible text is readable; false only when a clear majority-sized chunk is not. */
export function isLegible(doc: Document, options: LegibilityOptions = {}): boolean {
  const view = doc.defaultView;
  if (!view || !doc.body) return true;
  const visible = options.isVisible ?? onScreen;
  const floor = options.floor ?? 2;
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  const seen = new Set<Element>();
  let sampled = 0;
  let bad = 0;
  for (let i = 0; i < MAX_TEXT_NODES; i += 1) {
    const node = walker.nextNode();
    if (!node) break;
    const el = node.parentElement;
    if (!el || seen.has(el) || !node.nodeValue?.trim()) continue;
    seen.add(el);
    const tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    if (!visible(el)) continue;
    const style = view.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const fg = parseColor(style.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = backgroundLuminance(el, view);
    if (bg === null || isFading(el, view)) continue;
    sampled += 1;
    if (contrast(luminance(fg), bg) < floor) bad += 1;
  }
  return sampled < MIN_SAMPLE || bad < MIN_BAD || bad / sampled < BAD_SHARE;
}

/** How often the (not free) measurement may run, and how many times per address. */
const MIN_GAP_MS = 1500;
const MAX_RUNS = 8;
let lastKey = '';
let lastRun = 0;
let runs = 0;
let lastResult = true;

/** Rate-limited wrapper for the probe, which can fire on every batched DOM change. */
export function legibleNow(doc: Document, key: string, now = Date.now()): boolean {
  if (key !== lastKey) {
    lastKey = key;
    runs = 0;
    lastRun = 0;
    lastResult = true;
  }
  if (runs >= MAX_RUNS || now - lastRun < MIN_GAP_MS) return lastResult;
  runs += 1;
  lastRun = now;
  lastResult = isLegible(doc);
  return lastResult;
}
