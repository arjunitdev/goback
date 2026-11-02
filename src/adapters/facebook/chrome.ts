/**
 * The 2012-2015 logged-out Facebook page had a blue bar across the top with the wordmark. Modern
 * Facebook's landing page has none, so there is nothing to restyle: the extension adds one empty,
 * decorative element (ADR-026, an explicit and narrow exception to FR-012).
 *
 *  - the bar is a plain `div`, `aria-hidden`, with no text, links, handlers or form controls,
 *  - nothing existing is moved, hidden, restyled or reparented: the login form, its fields and
 *    buttons stay exactly as Facebook renders them (no stylesheet rule targets them),
 *  - `data-retroweb-bare` on <html> tells every stylesheet rule that restyles the page (fonts,
 *    backgrounds, the shared focus ring) to stand down, so the form keeps its own look,
 *  - it is marked `data-retroweb-injected` and removed again when the page stops being the
 *    landing page, the site is switched off or the extension unmounts.
 *
 * The page counts as the landing page only when Facebook's own login form wrapper is present and
 * no checkpoint or security form is. Every other authentication surface stays fully native.
 */
export const FBBAR_ID = 'rw-fbbar';
/** Set on <html> while the bar is up: every stylesheet rule that restyles the page stands down. */
export const BARE_ATTR = 'data-retroweb-bare';

const LANDING_FORM = ['form#login_form', '[data-testid="royal_login_form"]'];
const SECURITY_FORM = ['form[action*="checkpoint"]', '[data-testid="checkpoint_title"]'];

function exists(doc: Document, selectors: readonly string[]): boolean {
  return selectors.some((sel) => {
    try {
      return doc.querySelector(sel) !== null;
    } catch {
      return false; // an invalid selector must degrade, never throw
    }
  });
}

/** True on the logged-out landing page: Facebook's login form is there and no security form is. */
export function isLoginLanding(doc: Document): boolean {
  return exists(doc, LANDING_FORM) && !exists(doc, SECURITY_FORM);
}

export function hasLandingBar(doc: Document): boolean {
  return doc.getElementById(FBBAR_ID) !== null;
}

/** Idempotent. Added as the last child of <body> so it never reorders anything the page owns. */
export function mountLandingBar(doc: Document): void {
  if (hasLandingBar(doc) || !doc.body) return;
  const bar = doc.createElement('div');
  bar.id = FBBAR_ID;
  bar.setAttribute('data-retroweb-injected', '');
  bar.setAttribute('aria-hidden', 'true');
  doc.body.append(bar);
  doc.documentElement.setAttribute(BARE_ATTR, '');
}

export function unmountLandingBar(doc: Document): void {
  doc.getElementById(FBBAR_ID)?.remove();
  doc.documentElement.removeAttribute(BARE_ATTR);
}
