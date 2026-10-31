# 03 — Technical architecture

## 3.1 Stack
Chrome Manifest V3, TypeScript, Vite or equivalent deterministic build, Vitest unit tests, Playwright browser tests, ESLint, Prettier, CSS modules/scoped style tokens. Pin versions at implementation time and maintain lockfile/SBOM. Avoid UI frameworks injected into target pages unless justified by measured performance.

## 3.2 Modules
- Extension action popup: per-site enable, mode, year, diagnostics and revert.
- Options: accessibility, per-site preferences, help and privacy.
- Background service worker: install/update migration, permission state, optional diagnostics; never rely on its continuous execution.
- Early critical CSS: lightweight selectors to reduce flash of modern UI.
- Site adapter: route detection, feature probes, selectors, component mapping, lifecycle and teardown.
- Mutation coordinator: batched observer, dedupe, disconnect and reattach on route change; cap processed nodes.
- Styling engine: CSS custom properties, scoped classes, historical tokens, high-specificity isolation, versioned variants.
- Feature preservation layer: never replace interactive nodes where possible; use CSS grid/order; if wrappers are needed, retain original DOM nodes, event handlers and ARIA semantics.
- Health/rollback: if selectors mismatch, avoid blank screens and disable only affected transform.

## 3.3 Recommended tree
```
src/
  manifest.ts
  background/index.ts
  popup/{index.ts,ui.ts}
  options/{index.ts,ui.ts}
  shared/{types.ts,storage.ts,events.ts,flags.ts,diagnostics.ts}
  engine/{bootstrap.ts,router.ts,observer.ts,style-manager.ts,health.ts}
  adapters/{youtube,google,facebook}/{index.ts,selectors.ts,routes.ts,features.ts}
  styles/{tokens,base,youtube,google,facebook}/
  assets/{original,licensed}/
tests/{unit,integration,e2e,visual,accessibility,fixtures}/
```

## 3.4 Permissions strategy
Use minimal permissions: `storage`, `activeTab` if appropriate, optional host permissions for three supported domains. Request site access on activation rather than broad all-sites access. Match `www.youtube.com`, `www.google.com` plus approved Google regional domains, `www.facebook.com`; include actual subdomains only after threat review. Avoid `<all_urls>`, `webRequest`, cookies, history and tabs unless formally justified. Test whether dynamic content script registration is appropriate for optional hosts.

## 3.5 Rendering lifecycle
1. At document_start, inject small critical CSS only for enabled sites, acknowledging asynchronous settings lookup can still cause flash.
2. At document_idle or safe DOM readiness, identify route, inspect capability probes and apply site-specific scoped classes.
3. MutationObserver watches only stable container roots; batch via microtask/requestAnimationFrame, guard recursion, handle replaced roots and remove listeners on teardown.
4. Handle SPA navigation via observable URL/DOM state and browser navigation APIs when permitted; do not monkey-patch first-party internals without documented need.
5. If unknown UI version or selector failures exceed threshold, restore native presentation and report local diagnostics.

## 3.6 DOM invariants
No `innerHTML` injection from page text; no eval; no overriding authentication forms; no replacing native video players; no interception of network APIs; no deletion of first-party interactive nodes. Avoid CSS rules that accidentally conceal ads, consent controls, legal notices or safety warnings. Preserve original tab order and keyboard behavior.

## 3.7 Adapter contract (illustrative)
```ts
interface SiteAdapter {
  id: 'youtube' | 'google' | 'facebook';
  matches(url: URL): boolean;
  detectRoute(document: Document, url: URL): string | null;
  probe(document: Document): { supported: boolean; missing: string[] };
  mount(ctx: AdapterContext): Promise<void> | void;
  refresh(ctx: AdapterContext): void;
  unmount(ctx: AdapterContext): void;
}
```

## 3.8 Compatibility versioning
Track extension release, adapter version, tested website DOM signature, and historical theme version separately. Feature flags allow selectively disabling one component, not the whole site. Ship CSS/JS only in reviewed extension updates; no remote executable patches.

## 3.9 Review gate G3
Second engineer checks threat boundaries, selectors, permission rationale, lifecycle teardown, mutation complexity, CSS containment, error recovery, storage migration and maintainability. Architecture must pass proof-of-concept on all three sites before full implementation.
