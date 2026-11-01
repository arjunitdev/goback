/**
 * Route detection for youtube.com. Pure functions of the URL so they are cheap
 * to test and safe to run at document_start.
 */
export type YoutubeRoute =
  'home' | 'watch' | 'results' | 'channel' | 'playlist' | 'feed' | 'shorts';

export function matchesYoutube(url: URL): boolean {
  return url.protocol === 'https:' && url.hostname === 'www.youtube.com';
}

export function routeFromUrl(url: URL): YoutubeRoute | null {
  if (!matchesYoutube(url)) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/watch') return 'watch';
  if (path === '/results') return 'results';
  if (path === '/playlist') return 'playlist';
  if (path.startsWith('/shorts/')) return 'shorts';
  if (path.startsWith('/feed/')) return 'feed';
  if (/^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)(\/|$)/.test(path)) return 'channel';
  // Account, premium, payments, sign-in, embeds, terms and every other path stay native (FR-012).
  return null;
}
