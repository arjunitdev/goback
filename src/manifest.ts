import { IMPLEMENTED_SITES, SITE_ORIGINS } from './shared/flags';
import { includesWordmark, type Flavor } from './shared/registration';

export { IMPLEMENTED_SITES };

export interface Manifest {
  [key: string]: unknown;
}

const originsOf = (): string[] => IMPLEMENTED_SITES.flatMap((s) => [...SITE_ORIGINS[s]]);

/**
 * Builds manifest.json. Flavors:
 *  - store: no wordmark assets, host access only via optional permissions.
 *  - dev:   store + recreated wordmarks (ADR-011).
 *  - test:  dev + host access granted at install so Playwright can run without a prompt.
 *           NEVER publish a test build.
 */
export function buildManifest(flavor: Flavor, version: string): Manifest {
  const manifest: Manifest = {
    manifest_version: 3,
    name:
      flavor === 'store' ? 'RetroWeb 2012 (unofficial)' : `RetroWeb 2012 (unofficial, ${flavor})`,
    version,
    description:
      'Unofficial. Restyles supported sites to a researched 2012-era look. Not affiliated with or endorsed by Google, YouTube or Meta.',
    minimum_chrome_version: '120',
    icons: { '16': 'icons/icon-16.png', '48': 'icons/icon-48.png', '128': 'icons/icon-128.png' },
    permissions: ['storage', 'scripting'],
    // Site access is requested on activation, never at install (ADR-003).
    optional_host_permissions: originsOf(),
    background: { service_worker: 'background.js' },
    action: { default_title: 'RetroWeb 2012', default_popup: 'popup.html' },
    options_ui: { page: 'options.html', open_in_tab: true },
  };

  if (flavor === 'test') manifest.host_permissions = originsOf();

  if (includesWordmark(flavor)) {
    manifest.web_accessible_resources = IMPLEMENTED_SITES.map((site) => ({
      resources: [`assets/${site}-2012.svg`],
      matches: [...SITE_ORIGINS[site]],
    }));
  }
  return manifest;
}
