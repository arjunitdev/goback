import { ADAPTERS } from '../adapters';
import { applyStyleState, clearStyleState } from '../engine/style-manager';
import { isSiteActive } from '../shared/flags';
import { chromeLocalArea, loadPrefs } from '../shared/storage';

/**
 * document_start script. The background only registers it (together with the
 * site stylesheet) while the site is enabled, permitted and not killed, so
 * setting the attributes synchronously is safe and avoids a flash of the
 * modern UI (R05). Prefs are then read asynchronously to refine mode/motion
 * and to undo everything if the kill switch flipped in the meantime.
 */
const root = document.documentElement;
const url = new URL(location.href);
const adapter = ADAPTERS.find((a) => a.matches(url));
const route = adapter?.detectRoute(document, url) ?? null;

// Late-style adapters (e.g. Facebook, whose first paint may be a login wall) wait for the engine.
if (adapter && route && adapter.earlyStyle !== false) {
  const systemReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // <body> does not exist yet, so guess the page scheme from the system; the engine
  // measures the real page background after load and corrects it.
  const scheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyStyleState(
    root,
    {
      site: adapter.id,
      route,
      mode: 'authentic',
      motion: 'system',
      highContrast: false,
      wordmark: __WORDMARK__,
      scheme,
    },
    systemReduce,
  );

  loadPrefs(chromeLocalArea())
    .then((prefs) => {
      if (!isSiteActive(prefs, adapter.id)) {
        clearStyleState(root);
        return;
      }
      applyStyleState(
        root,
        {
          site: adapter.id,
          route,
          mode: prefs.sites[adapter.id].mode,
          motion: prefs.motion,
          highContrast: prefs.highContrast,
          wordmark: __WORDMARK__,
          scheme,
        },
        systemReduce,
      );
    })
    .catch(() => undefined);
}
