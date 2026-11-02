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

// Late-style adapters (e.g. Facebook, whose first paint may be a login wall) wait for the engine,
// unless their last visit left a "this was a safe, signed-in page" hint: then they style from the
// first paint too. If the hint is stale the engine corrects it as soon as it has probed the page.
const hintKey = adapter?.earlyStyle === false ? adapter.earlyHintKey : undefined;
if (adapter && route && hintKey) {
  const systemReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scheme =
    !(adapter.forceLightAttr || adapter.pinsLight) &&
    matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  const area = chromeLocalArea();
  Promise.all([loadPrefs(area), area.get(hintKey)])
    .then(([prefs, hint]) => {
      if (hint[hintKey] !== true || !isSiteActive(prefs, adapter.id)) return;
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
          lockLightAttr:
            prefs.sites[adapter.id].mode === 'authentic' ? adapter.forceLightAttr : undefined,
        },
        systemReduce,
      );
      // Keep the adapter's own markers current while the page builds itself (before each frame paints).
      adapter.earlyWatch?.(document);
    })
    .catch(() => undefined);
}

if (adapter && route && adapter.earlyStyle !== false) {
  const systemReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // <body> does not exist yet, so guess the page scheme from the system; the engine
  // measures the real page background after load and corrects it.
  // Authentic mode on a site that supports the light pin (YouTube) optimistically assumes light;
  // the engine measures the real page and corrects it if the pin did not take.
  const scheme =
    !(adapter.forceLightAttr || adapter.pinsLight) &&
    matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
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
      // Authentic is the default until prefs load: hold the dark theme off from the first paint.
      lockLightAttr: adapter.forceLightAttr,
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
          lockLightAttr:
            prefs.sites[adapter.id].mode === 'authentic' ? adapter.forceLightAttr : undefined,
        },
        systemReduce,
      );
      adapter.earlyWatch?.(document);
    })
    .catch(() => undefined);
}
