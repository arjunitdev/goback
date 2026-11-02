/**
 * The 2012 Google home page had a black services bar ("Search Images Maps Play YouTube News
 * Gmail Drive") and "Advanced search / Language tools" beside the search box. Modern Google has
 * neither, so there is nothing to restyle. These are two small elements the extension adds, only
 * on the home route:
 *
 *  - plain links to fixed, real Google addresses (https only, no page text, no scripts),
 *  - clearly marked `data-retroweb-injected` so they are easy to find and audit,
 *  - removed again when the route changes, the site is switched off or the extension unmounts.
 *
 * Nothing existing is moved, hidden or replaced. The one Google element that receives a child is
 * the search box wrapper (an absolutely positioned link group), found structurally.
 */
export const GBAR_ID = 'rw-gbar';
export const GTOOLS_ID = 'rw-gtools';

export interface ChromeLink {
  label: string;
  href: string;
}

/** The March-2013 bar (docs/evidence/google-2013-03.md). "More" opened a menu and is not faked. */
export const GBAR_LINKS: readonly ChromeLink[] = [
  { label: 'Search', href: 'https://www.google.com/webhp' },
  { label: 'Images', href: 'https://www.google.com/imghp' },
  { label: 'Maps', href: 'https://maps.google.com/' },
  { label: 'Play', href: 'https://play.google.com/' },
  { label: 'YouTube', href: 'https://www.youtube.com/' },
  { label: 'News', href: 'https://news.google.com/' },
  { label: 'Gmail', href: 'https://mail.google.com/mail/' },
  { label: 'Drive', href: 'https://drive.google.com/' },
];

export const GTOOLS_LINKS: readonly ChromeLink[] = [
  { label: 'Advanced search', href: 'https://www.google.com/advanced_search' },
  { label: 'Language tools', href: 'https://www.google.com/language_tools' },
];

function build(doc: Document, tag: 'nav' | 'div', id: string, label: string, links: readonly ChromeLink[]) {
  const el = doc.createElement(tag);
  el.id = id;
  el.setAttribute('data-retroweb-injected', '');
  el.setAttribute('aria-label', label);
  links.forEach((l, i) => {
    const a = doc.createElement('a');
    a.href = l.href;
    a.textContent = l.label;
    a.rel = 'noopener';
    if (id === GBAR_ID && i === 0) a.setAttribute('aria-current', 'page');
    el.append(a);
  });
  return el;
}

/** The nearest ancestor of the search field that is a positioned box wide enough to be the field. */
function findSearchBox(doc: Document): Element | null {
  const view = doc.defaultView;
  const field = doc.querySelector('form[role="search"] textarea[name="q"], form[role="search"] input[name="q"]');
  if (!view || !field) return null;
  for (let n = field.parentElement; n && n.localName !== 'form'; n = n.parentElement) {
    if (view.getComputedStyle(n).position === 'relative' && n.getBoundingClientRect().width >= 300) {
      return n;
    }
  }
  return null;
}

/** The bar alone (results and Images pages): which tab is "current" follows the page. */
export function mountServicesBar(doc: Document, current = 'Search'): void {
  if (!doc.body) return;
  const bar =
    doc.getElementById(GBAR_ID) ?? build(doc, 'nav', GBAR_ID, 'Google services', GBAR_LINKS);
  for (const a of bar.querySelectorAll('a')) {
    if (a.textContent === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  if (!bar.isConnected) doc.body.prepend(bar);
}

/** Idempotent: adds whatever is missing, so it is safe to call on every refresh. */
export function mountHomeChrome(doc: Document): void {
  if (!doc.body) return;
  mountServicesBar(doc);
  if (!doc.getElementById(GTOOLS_ID)) {
    const box = findSearchBox(doc);
    if (box) box.append(build(doc, 'div', GTOOLS_ID, 'Search tools', GTOOLS_LINKS));
  }
}

export function unmountHomeChrome(doc: Document): void {
  doc.getElementById(GBAR_ID)?.remove();
  doc.getElementById(GTOOLS_ID)?.remove();
}
