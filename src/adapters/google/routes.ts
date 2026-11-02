/**
 * Route detection for google.com (pilot scope, ADR-006: www.google.com only).
 * Pure functions of the URL so they are cheap to unit test and safe at document_start.
 */
export type GoogleRoute = 'home' | 'results' | 'images';

export function matchesGoogle(url: URL): boolean {
  return url.protocol === 'https:' && url.hostname === 'www.google.com';
}

export function routeFromUrl(url: URL): GoogleRoute | null {
  if (!matchesGoogle(url)) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  // /webhp is the home page too: it is where the results page's "Google" link goes.
  if (path === '/' || path === '/webhp') return 'home';
  if (path === '/search') {
    // udm=50 is AI Mode: a chat page with its own hard-coded colours. It did not exist in 2013,
    // and restyling half of it left pale text on white, so it stays native.
    if (url.searchParams.get('udm') === '50') return null;
    // tbm=isch is the Images vertical; other verticals (news, shopping, video) use
    // the results layout until they are researched separately.
    const vertical = url.searchParams.get('tbm') === 'isch' || url.searchParams.get('udm') === '2';
    return vertical ? 'images' : 'results';
  }
  // Auth, consent, settings, maps and every other path stay native (FR-012).
  return null;
}
