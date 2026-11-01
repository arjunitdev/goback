# 14 — Store listing draft and release checklist status

_Draft. Nothing here has been submitted, reviewed or signed. See `reviews/` for gate status._

## Single-purpose statement
Restyles the appearance of google.com, youtube.com and facebook.com to a 2012-era look, on the user's device, when the user turns it on.

## Short description (≤132 chars)
Unofficial. Gives Google, YouTube and Facebook a 2012-era look. Per-site opt-in, no data collected. Not affiliated with them.

## Detailed description (draft)
RetroWeb 2012 is an unofficial extension that changes how three sites look, to resemble how they appeared in 2012. It does not change what the sites do: search, playback, sign-in, posting, ads and consent screens all stay the site's own.

- Opt in per site; pause everywhere with one switch.
- Authentic mode (more faithful) or Compatibility mode (lighter touch).
- Respects reduced-motion and keeps dark-theme pages readable.
- If a site changes in a way the extension doesn't recognise, it removes its styling instead of breaking the page.
- No data collection, no analytics, no network requests, no remote code.

Not affiliated with, endorsed by or sponsored by Google, YouTube or Meta. Product names are used only to say which sites are supported. Visual fidelity is approximate: values are reconstructed from memory and not yet verified against dated captures.

## Permission justifications
See `PRIVACY.md`. `storage` and `scripting` plus optional per-site host access, requested on activation.

## Assets needed
- Store icons: placeholder icons exist (`src/assets/icons`); a designed icon is needed.
- Screenshots must show the real, working extension on the real sites (docs/10 §10.4). None are included, and **screenshots of the dev build with look-alike wordmarks must not be used** until ADR-010 is resolved.

## Release checklist status (docs/10 §10.4)
| Item | Status |
|---|---|
| Manifest V3 validation, minimum permissions | Done and audited by `scripts/audit-package.mjs` |
| Reproducible zip + SHA-256 | Done (`npm run package:store`) |
| Privacy policy | Draft in `PRIVACY.md`, needs contact + legal review |
| Single-purpose statement, listing text, "unofficial" wording | Drafted above |
| Developer account, publisher verification, extension ID | **Not done** |
| Support URL, incident contact | **Not done** |
| Trademark/terms review (ADR-010, docs/08 §8.3) | **Not done**: blocks any listing that names the three sites |
| Evidence ledger and G2 historical sign-off | **Not done** |
| Signed-in verification (Facebook especially) | **Not done** |
| Google results-page verification | **Not done** (CAPTCHA blocks automation) |
| Independent gate sign-offs G1–G10 | **Not done** (templates only) |
| Clean install, update migration, uninstall tests | **Not done** manually |
| Closed beta (10, then 50–100 users) | **Not done** |
