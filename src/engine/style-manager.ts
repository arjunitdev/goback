import type { DisplayMode, MotionPref, SiteId } from '../shared/types';

export const ATTR = {
  site: 'data-retroweb',
  route: 'data-retroweb-route',
  mode: 'data-retroweb-mode',
  motion: 'data-retroweb-motion',
  contrast: 'data-retroweb-contrast',
  wordmark: 'data-retroweb-wordmark',
} as const;

export interface StyleState {
  site: SiteId;
  route: string;
  mode: DisplayMode;
  motion: MotionPref;
  highContrast: boolean;
  /** Dev flavor only: recreated look-alike wordmark (ADR-011). */
  wordmark: boolean;
}

/** Motion is reduced if the user asked for it OR the system prefers it (FR-009). */
export function effectiveReducedMotion(pref: MotionPref, systemPrefersReduce: boolean): boolean {
  return pref === 'reduce' || systemPrefersReduce;
}

/**
 * All presentation is driven by attributes on <html>; stylesheets are scoped
 * to `html[data-retroweb="<site>"]`. Removing the attributes restores the
 * native page, which is also the fail-open path.
 */
export function applyStyleState(root: HTMLElement, state: StyleState, systemReduce: boolean): void {
  root.setAttribute(ATTR.site, state.site);
  root.setAttribute(ATTR.route, state.route);
  root.setAttribute(ATTR.mode, state.mode);
  setFlag(root, ATTR.motion, effectiveReducedMotion(state.motion, systemReduce) ? 'reduce' : null);
  setFlag(root, ATTR.contrast, state.highContrast ? 'high' : null);
  setFlag(root, ATTR.wordmark, state.wordmark ? 'on' : null);
}

export function clearStyleState(root: HTMLElement): void {
  for (const name of Object.values(ATTR)) root.removeAttribute(name);
}

function setFlag(root: HTMLElement, name: string, value: string | null): void {
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}
