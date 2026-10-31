import type { SiteAdapter } from '../../shared/types';

/** Placeholder until M3; never matches so the engine leaves Facebook native. */
export const facebookAdapter: SiteAdapter = {
  id: 'facebook',
  version: '0.0.0',
  matches: () => false,
  detectRoute: () => null,
  probe: () => ({ supported: false, missing: ['not-implemented'] }),
  mount() {},
  refresh() {},
  unmount() {},
};
