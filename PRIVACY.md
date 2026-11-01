# Privacy policy — RetroWeb 2012 (unofficial)

_Draft for legal review (docs/08 §8.3). Describes what the code in this repository actually does as of 2026-10-31. Not yet reviewed by counsel._

RetroWeb 2012 is an unofficial browser extension. It is **not affiliated with, endorsed by or sponsored by Google, YouTube or Meta**. It changes only how supported pages look, on your device.

## What it stores
Only these settings, in your browser's local extension storage (`chrome.storage.local`):

- whether each supported site is switched on, and its display mode (authentic or compatibility);
- the global pause switch, the reduced-motion choice and the high-contrast choice;
- local diagnostic counters: how many times a named event happened (for example "mounted" or "fail-open"). These are numbers keyed by a fixed list of event names.

## What it does not do
- It does **not** collect, read, store or transmit page content, URLs, search terms, account names, posts, messages, comments, contacts, cookies, tokens or anything you type. It only checks that certain page elements exist, to know whether its styling still fits the page.
- It makes **no network requests** of its own, has no analytics or advertising, and loads **no remote code**. All code and styles are bundled in the extension.
- It never touches login, password, payment, CAPTCHA, consent or security screens, and it leaves ads and the video player as the site provides them.
- Nothing leaves your device. The diagnostic counters can be viewed and reset in the extension's Settings page.

## Permissions and why
| Permission | Why |
|---|---|
| `storage` | Save the settings above. |
| `scripting` | Switch the styling on for a site only after you enable it. |
| Optional site access: `www.google.com`, `www.youtube.com`, `www.facebook.com` | Requested one site at a time when you turn that site on, so the styles can be applied. You can withdraw access any time in Settings. |

## Your choices
Turn a site off, use the pause switch, withdraw site access in Settings, or uninstall the extension. Uninstalling removes all stored settings.

## Contact
TODO before publication: name and a support/incident contact (docs/10 §10.4).
