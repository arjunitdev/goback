import type { SiteAdapter } from '../../shared/types';

/** Placeholder until M2; never matches so the engine leaves YouTube native. */
export const youtubeAdapter: SiteAdapter = {
  id: 'youtube',
  version: '0.0.0',
  matches: () => false,
  detectRoute: () => null,
  probe: () => ({ supported: false, missing: ['not-implemented'] }),
  mount() {},
  refresh() {},
  unmount() {},
};
