/**
 * Route detection for facebook.com. Pure functions of the URL.
 *
 * Facebook has no stable route taxonomy, so only the surfaces the docs call out
 * are themed (feed, profile/Timeline, groups). Everything else stays native,
 * including authentication, security, privacy, payments, messaging and ads tools.
 */
export type FacebookRoute = 'feed' | 'profile' | 'groups';

export function matchesFacebook(url: URL): boolean {
  return url.protocol === 'https:' && url.hostname === 'www.facebook.com';
}

/** First path segments that are NOT a profile or page vanity name. */
const RESERVED = new Set([
  'login',
  'logout',
  'checkpoint',
  'recover',
  'reg',
  'r.php',
  'help',
  'policies',
  'privacy',
  'settings',
  'security',
  'ads',
  'adsmanager',
  'business',
  'payments',
  'pay',
  'messages',
  'messenger',
  'marketplace',
  'watch',
  'gaming',
  'reel',
  'reels',
  'stories',
  'events',
  'friends',
  'bookmarks',
  'notifications',
  'photo',
  'photo.php',
  'video.php',
  'share',
  'dialog',
  'plugins',
  'tr',
  'l.php',
  'index.php',
  'home.php',
  'search',
  'hashtag',
  'pages',
  'saved',
  'memories',
  'fundraisers',
  'donate',
  'two_factor',
  'confirmemail.php',
  'device-based',
  'authentication',
  'account_status',
  'support',
  'legal',
  'about',
  'careers',
  'terms',
  'cookies',
  'ajax',
  'api',
  'v2.0',
]);

export function routeFromUrl(url: URL): FacebookRoute | null {
  if (!matchesFacebook(url)) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return 'feed';
  if (path === '/groups' || path.startsWith('/groups/')) return 'groups';
  if (path === '/profile.php') return 'profile';
  const m = /^\/([A-Za-z0-9.]{3,})$/.exec(path);
  if (m && !RESERVED.has((m[1] ?? '').toLowerCase())) return 'profile';
  return null;
}
