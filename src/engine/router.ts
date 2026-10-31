export interface RouteWatcher {
  /** Compare the current href with the last seen one; fire onChange if it differs. */
  check(): boolean;
  dispose(): void;
}

/**
 * Detects URL changes without monkey-patching history (docs/03 §3.5 step 4).
 * Sources: popstate, hashchange, the Navigation API when present, and explicit
 * check() calls from the mutation coordinator (covers pushState by the page).
 */
export function createRouteWatcher(win: Window, onChange: (href: string) => void): RouteWatcher {
  let last = win.location.href;

  const check = (): boolean => {
    const now = win.location.href;
    if (now === last) return false;
    last = now;
    onChange(now);
    return true;
  };

  const handler = () => {
    check();
  };

  const nav = (win as unknown as { navigation?: EventTarget }).navigation;
  win.addEventListener('popstate', handler);
  win.addEventListener('hashchange', handler);
  nav?.addEventListener('navigatesuccess', handler);

  return {
    check,
    dispose() {
      win.removeEventListener('popstate', handler);
      win.removeEventListener('hashchange', handler);
      nav?.removeEventListener('navigatesuccess', handler);
    },
  };
}
