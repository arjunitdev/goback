import { SITE_ORIGINS } from './flags';
import type { SiteId } from './types';

export type Flavor = 'dev' | 'store' | 'test';

/** Recreated wordmarks ship only outside the store flavor (ADR-011). */
export function includesWordmark(flavor: Flavor): boolean {
  return flavor !== 'store';
}

/** Per-site stylesheets, relative to the extension root. */
export function siteCss(site: SiteId, flavor: Flavor): string[] {
  const css = [`styles/${site}.css`];
  if (site === 'google' && includesWordmark(flavor)) css.push('styles/google-wordmark.css');
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
export function registrationsFor(site: SiteId, flavor: Flavor): ScriptRegistration[] {
  const matches = [...SITE_ORIGINS[site]];
  return [
    {
      id: `rw-${site}-early`,
      matches,
      js: ['content/early.js'],
      css: siteCss(site, flavor),
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
