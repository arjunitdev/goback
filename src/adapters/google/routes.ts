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
  if (path === '/') return 'home';
  if (path === '/search') {
    // tbm=isch is the Images vertical; other verticals (news, shopping, video) use
    // the results layout until they are researched separately.
    return url.searchParams.get('tbm') === 'isch' ? 'images' : 'results';
  }
  // Auth, consent, settings, maps and every other path stay native (FR-012).
  return null;
}
