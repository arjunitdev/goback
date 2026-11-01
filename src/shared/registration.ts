import { SITE_ORIGINS } from './flags';
import type { SiteId } from './types';

export type Flavor = 'dev' | 'store' | 'test';

/** Recreated wordmarks ship only outside the store flavor (ADR-011). */
export function includesWordmark(flavor: Flavor): boolean {
  return flavor !== 'store';
}

/**
 * Build-time facts about optional PRIVATE assets (user-supplied or archive-derived,
 * for the user's own machine only). Never true for the store flavor: see
 * `privateAllowed` and the store audit.
 */
export interface BuildAssets {
  youtubePrivate?: boolean;
  googlePrivate?: boolean;
}

/** Private assets are limited to non-store flavors, whatever the caller asks for. */
export function privateAllowed(flavor: Flavor, assets: BuildAssets = {}): BuildAssets {
  return flavor === 'store' ? {} : assets;
}

/** Per-site stylesheets, relative to the extension root. Order matters: later rules win ties. */
export function siteCss(site: SiteId, flavor: Flavor, assets: BuildAssets = {}): string[] {
  const css = [`styles/${site}.css`];
  if (includesWordmark(flavor)) css.push(`styles/${site}-wordmark.css`);
  if (site === 'youtube' && privateAllowed(flavor, assets).youtubePrivate) {
    css.push('styles/youtube-private.css');
  }
  if (site === 'google' && privateAllowed(flavor, assets).googlePrivate) {
    css.push('styles/google-private.css');
  }
  return css;
}

export interface ScriptRegistration {
  id: string;
  matches: string[];
  js: string[];
  css?: string[];
  runAt: 'document_start' | 'document_idle';
  persistAcrossSessions: true;
  allFrames: false;
}

/**
 * Two registrations per active site: the early one carries the stylesheet so it
 * paints before first render; the main one runs the engine once the DOM is ready.
 */
export function registrationsFor(
  site: SiteId,
  flavor: Flavor,
  assets: BuildAssets = {},
): ScriptRegistration[] {
  const matches = [...SITE_ORIGINS[site]];
  return [
    {
      id: `rw-${site}-early`,
      matches,
      js: ['content/early.js'],
      css: siteCss(site, flavor, assets),
      runAt: 'document_start',
      persistAcrossSessions: true,
      allFrames: false,
    },
    {
      id: `rw-${site}-main`,
      matches,
      js: ['content/main.js'],
      runAt: 'document_idle',
      persistAcrossSessions: true,
      allFrames: false,
    },
  ];
}
