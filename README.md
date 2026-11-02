# RetroWeb 2012

An **unofficial** Chrome (Manifest V3) extension that restyles Google Search, YouTube and Facebook to an early-2010s look while keeping every site feature working. It changes how pages look, on your device only.

Not affiliated with, endorsed by or sponsored by Google, YouTube or Meta. Their names and logos belong to their owners.

## Install (Chrome, Brave, Edge)

```
npm install
npm run build
```

1. Open `chrome://extensions` (or `brave://extensions`) and turn on **Developer mode**.
2. **Load unpacked** and choose the `dist` folder.
3. Pin the extension, open its popup, switch on the sites you want and accept the access prompt.
4. Reload those sites once or twice.

After rebuilding, press the reload arrow on the extension's card, then reload the site.

If a page looks native, open the popup on that tab: **Health** says why. The extension fails open by design: if a site changes its markup, it switches itself off for that page instead of breaking it.

## Logos

`npm run build` makes the **personal build** in `dist/`. It paints look-alike wordmarks and, if you place your own image files under `src/assets/private/` (git-ignored, never committed), those as well. `npm run build:store` makes `dist-store/`, which contains no logos at all. Do not publish or share a build that contains logos you do not have rights to.

## Develop

```
npm run verify      # typecheck, lint, unit + integration tests, both builds, package audit
npm run test:e2e    # Playwright against synthetic fixtures (never the live sites)
```

Layout: `src/engine` (router, observer, style manager, health), `src/adapters/<site>`, `src/styles`, `src/background`, `src/popup`, `src/options`, `tests/{unit,integration,e2e,fixtures}`, `scripts/`.

## Privacy and safety

- Stores only your on/off choices and display settings locally; see [PRIVACY.md](PRIVACY.md).
- No network requests, no remote code, no analytics, no cookies or account data read.
- Login, payment, CAPTCHA and security pages are left native (the one exception is a decorative bar on Facebook's logged-out page; the login form is never touched).

## Status

Tested against synthetic fixtures and partly against the live logged-out sites. Signed-in pages could not be verified with a test account, so expect rough edges there.
