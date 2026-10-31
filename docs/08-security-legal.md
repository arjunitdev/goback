# 08 — Security, privacy, policy and legal review

## 8.1 Threat model
Threats: hostile page scripts, DOM XSS, selector collision, malicious updates, credential exposure, sensitive feed observation, extension permission abuse, supply-chain compromise, phishing confusion, branding infringement. Mitigations: isolated world content scripts, no unsafe HTML, no eval/remote code, least privilege, dependency scanning, pinned builds, static asset review, separate storage of only preferences, clear publisher identity.

## 8.2 Data policy
Store only per-site enabled state, theme variant, accessibility options, adapter diagnostic counters (not page contents), schema version. No collection of URLs containing queries, account names, comments, searches, messages, cookies, tokens, or personal data. Diagnostics default local/off; any optional export is user-initiated and redacted. Write privacy policy reflecting actual implementation, not promises.

## 8.3 Compliance checklist
Chrome Web Store single-purpose rule; permission justifications; accurate listing and screenshots; no remote hosted executable code; no impersonation; no copyright/trademark infringement; no misleading ads or monetization; no hidden behavior; no payment/security UI spoofing. Review YouTube Terms and relevant Google/Meta terms with counsel before distribution; policy compliance is not established by Chrome Store approval alone.

## 8.4 Intellectual property decisions
Archive for research does not grant republication rights. Maintain asset license manifest. Prefer independent recreation of general visual styling; historic logos/icons may be protected by trademark/copyright. Do not ship scraped first-party JS/CSS or archived sprite sheets absent rights. Preserve live-site logos when they are already provided by the site and are not altered in a misleading manner; legal review required for edge cases. Mark extension unofficial in popup and listing.

## 8.5 Security tests
Static analysis; dependency/license audit; malicious DOM injection fixtures; CSP review; verify no outbound network requests; check no credential inputs touched; review every manifest permission; manual Chrome Web Store policy checklist; penetration test of messaging boundaries and storage; test all rollback paths.

## 8.6 Review gate G8
Security engineer and legal/policy reviewer separately approve threat model, manifest, asset ledger, privacy disclosures, store branding and terms-risk memo. Any unresolved high-severity item blocks release.
