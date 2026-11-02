import { luminance, parseColor } from '../../engine/style-manager';

/**
 * Google picks its theme on the server, and a dark account's results page hard-codes pale
 * colours (text, icons, fade-out gradients) on classes that the light variable pin cannot reach.
 * On the white 2013 page those read as ghost text. Class names are obfuscated and change, so
 * instead of listing them we measure: anything pale on a light background gets a marker
 * attribute, and the stylesheet gives marked nodes a readable colour.
 *
 * Only computed styles and geometry are read (never page text), and the only write is the
 * attribute, which is removed again on unmount.
 */
export const FIX_ATTR = 'data-rw-fix';

export interface RepairOptions {
  /** Defaults to "inside or near the viewport"; tests inject a stub because jsdom has no layout. */
  isVisible?: (el: Element) => boolean;
}

const MAX_TEXT_NODES = 1500;
const MAX_ICONS = 400;
const MAX_FADES = 8000;
/** Contrast ratio under which text or an icon counts as ghosted (WCAG AA asks for 4.5; real light greys sit near 2.6). */
const FLOOR = 2.5;
/** The extension's own bars: never repaired. */
const OWN_UI = '#rw-gbar, #rw-gtools';

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = el.ownerDocument.defaultView?.innerHeight ?? 0;
  return r.width > 0 && r.height > 0 && r.bottom > -h && r.top < h * 2.5;
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

/**
 * What is actually painted behind an on-screen element: the first opaque layer under its centre,
 * wherever it sits in the tree (a pill's colour is often a sibling, not an ancestor). Returns null
 * for an image or gradient, undefined when the point is off screen and nothing can be said.
 */
function paintedBehind(el: Element, view: Window): number | null | undefined {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x >= view.innerWidth || y >= view.innerHeight) return undefined;
  const doc = el.ownerDocument;
  if (typeof doc.elementsFromPoint !== 'function') return undefined; // no layout engine (tests)
  for (const e of doc.elementsFromPoint(x, y)) {
    if (e === el || el.contains(e)) continue;
    const s = view.getComputedStyle(e);
    if (s.backgroundImage && s.backgroundImage !== 'none') return null;
    const c = parseColor(s.backgroundColor);
    if (c && c.a >= 0.5) return luminance(c);
  }
  return undefined;
}

/** True when the layer really behind the element is dark enough for its pale colour to be fine. */
function readableInPlace(el: Element, view: Window, fgLum: number): boolean {
  const behind = paintedBehind(el, view);
  return behind === null || (behind !== undefined && contrast(fgLum, behind) >= FLOOR);
}

/**
 * Some controls paint their background on a ::before/::after layer (a pill behind its label), which
 * element backgrounds cannot see. Pale text there is probably on a dark pill, so it is left alone.
 */
function hasPaintedLayer(el: Element, view: Window): boolean {
  let n: Element | null = el;
  for (let i = 0; i < 6 && n; i += 1, n = n.parentElement) {
    for (const pseudo of ['::before', '::after']) {
      const s = view.getComputedStyle(n, pseudo);
      if (s.content === 'none' || s.content === 'normal') continue;
      const c = parseColor(s.backgroundColor);
      if ((c && c.a >= 0.3) || (s.backgroundImage && s.backgroundImage !== 'none')) return true;
    }
  }
  return false;
}

function isFading(el: Element, view: Window): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const o = parseFloat(view.getComputedStyle(n).opacity);
    if (!Number.isNaN(o) && o < 0.9) return true;
  }
  return false;
}

function mark(el: Element, kind: string): void {
  if (el.getAttribute(FIX_ATTR) !== kind) el.setAttribute(FIX_ATTR, kind);
}

function repairText(doc: Document, view: Window, visible: (el: Element) => boolean): number {
  let marked = 0;
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  const seen = new Set<Element>();
  for (let i = 0; i < MAX_TEXT_NODES; i += 1) {
    const node = walker.nextNode();
    if (!node) break;
    const el = node.parentElement;
    if (!el || seen.has(el) || !node.nodeValue?.trim()) continue;
    seen.add(el);
    const tag = el.localName;
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || el.closest('svg')) continue;
    if (el.hasAttribute(FIX_ATTR) || el.closest(OWN_UI) || !visible(el)) continue;
    const style = view.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const fg = parseColor(style.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = backgroundLuminance(el, view);
    if (bg === null || bg < 0.5 || isFading(el, view)) continue;
    const fgLum = luminance(fg);
    if (contrast(fgLum, bg) >= FLOOR || hasPaintedLayer(el, view)) continue;
    if (readableInPlace(el, view, fgLum)) continue;
    // Links keep their link colour, pale body text goes dark, and mid greys stay muted.
    mark(el, el.closest('a') ? 'link' : fgLum > 0.55 ? 'text' : 'muted');
    marked += 1;
  }
  return marked;
}

function repairIcons(doc: Document, view: Window, visible: (el: Element) => boolean): number {
  let marked = 0;
  const icons = doc.querySelectorAll('svg');
  for (let i = 0; i < icons.length && i < MAX_ICONS; i += 1) {
    const svg = icons[i]!;
    if (svg.closest(OWN_UI) || !visible(svg)) continue;
    const bg = backgroundLuminance(svg, view);
    if (bg === null || bg < 0.5) continue;
    // A pale fill on the icon itself, or on its shapes, is a dark-theme icon.
    for (const shape of [svg, ...Array.from(svg.querySelectorAll('path, circle, rect, polygon'))]) {
      if (shape.hasAttribute(FIX_ATTR)) continue;
      const s = view.getComputedStyle(shape);
      const fill = parseColor(s.fill);
      if (!fill || fill.a < 0.5 || contrast(luminance(fill), bg) >= FLOOR) continue;
      if (hasPaintedLayer(shape, view) || readableInPlace(shape, view, luminance(fill))) continue;
      mark(shape, 'icon');
      marked += 1;
    }
  }
  return marked;
}

/** Fade-out overlays (e.g. under a collapsed "Show more" panel) are drawn to the dark page colour. */
function repairFades(doc: Document, view: Window, visible: (el: Element) => boolean): number {
  let marked = 0;
  const root = doc.getElementById('main') ?? doc.body;
  const nodes = root.querySelectorAll('div, span, a');
  for (let i = 0; i < nodes.length && i < MAX_FADES; i += 1) {
    const el = nodes[i]!;
    if (el.hasAttribute(FIX_ATTR) || !visible(el)) continue;
    const image = view.getComputedStyle(el).backgroundImage;
    if (!image || !image.includes('gradient')) continue;
    const stops = image.match(/rgba?\([^)]*\)/g) ?? [];
    const dark = stops.some((s) => {
      const c = parseColor(s);
      return c !== null && c.a >= 0.3 && luminance(c) < 0.2;
    });
    if (!dark) continue;
    mark(el, 'fade');
    marked += 1;
  }
  return marked;
}

/** Marks every pale-on-light leak currently on screen; returns how many nodes were marked. */
export function repairLeaks(doc: Document, options: RepairOptions = {}): number {
  const view = doc.defaultView;
  if (!view || !doc.body) return 0;
  const visible = options.isVisible ?? onScreen;
  return repairText(doc, view, visible) + repairIcons(doc, view, visible) + repairFades(doc, view, visible);
}

/** How often the (not free) scan may run; pages append results as you scroll, so there is no run cap. */
const MIN_GAP_MS = 400;
let lastRun = 0;
let lastKey = '';
let trailing: ReturnType<typeof setTimeout> | null = null;

/**
 * Rate-limited wrapper for the adapter hook, which fires on every batched DOM change. A call that
 * arrives inside the gap schedules one trailing scan, so content that lands late is still checked.
 */
export function repairNow(doc: Document, key: string, now = Date.now()): number {
  if (key !== lastKey) {
    lastKey = key;
    lastRun = 0;
  }
  if (now - lastRun < MIN_GAP_MS) {
    trailing ??= setTimeout(() => {
      trailing = null;
      lastRun = Date.now();
      repairLeaks(doc);
    }, MIN_GAP_MS);
    return 0;
  }
  lastRun = now;
  return repairLeaks(doc);
}

export function clearRepairs(doc: Document): void {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  for (const el of Array.from(doc.querySelectorAll(`[${FIX_ATTR}]`))) el.removeAttribute(FIX_ATTR);
}
