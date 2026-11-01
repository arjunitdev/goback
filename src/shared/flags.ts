import type { DisplayMode, Prefs, SiteId } from './types';

export const SITE_IDS: readonly SiteId[] = ['youtube', 'google', 'facebook'];

/** Sites that have a working adapter. Drives the popup, manifest, registrations and build. */
export const IMPLEMENTED_SITES: readonly SiteId[] = ['google', 'youtube', 'facebook'];

export const SITE_LABELS: Record<SiteId, string> = {
  youtube: 'YouTube',
  google: 'Google Search',
  facebook: 'Facebook',
};

/** Origins requested on activation, never at install (ADR-003). */
export const SITE_ORIGINS: Record<SiteId, readonly string[]> = {
  youtube: ['https://www.youtube.com/*'],
  google: ['https://www.google.com/*'],
  facebook: ['https://www.facebook.com/*'],
};

export const DEFAULT_PREFS: Prefs = {
  schema: 1,
  killSwitch: false,
  motion: 'system',
  highContrast: false,
  sites: {
    youtube: { enabled: false, mode: 'authentic', theme: 2012 },
    google: { enabled: false, mode: 'authentic', theme: 2012 },
    facebook: { enabled: false, mode: 'authentic', theme: 2012 },
  },
};

export function isSiteActive(prefs: Prefs, site: SiteId): boolean {
  return !prefs.killSwitch && prefs.sites[site].enabled;
}

export function isDisplayMode(value: unknown): value is DisplayMode {
  return value === 'authentic' || value === 'compatibility';
}
