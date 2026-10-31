# RetroWeb 2012 — Engineering documentation

**Status:** planning baseline; implementation and archival capture not yet completed.  
**Targets:** YouTube, Google Search, Facebook desktop experiences as seen during 2012.  
**Product goal:** reproduce historical presentation while preserving current first-party website features and authentication.  
**Release target:** Chrome Manifest V3 first; Chromium compatibility subsequently.

## Reading order
1. [Product requirements](docs/01-product-requirements.md)
2. [Historical evidence and archive protocol](docs/02-historical-research.md)
3. [Architecture](docs/03-architecture.md)
4. [YouTube specification](docs/04-youtube.md)
5. [Google specification](docs/05-google.md)
6. [Facebook specification](docs/06-facebook.md)
7. [Design assets and animation](docs/07-design-system.md)
8. [Security, privacy, legal](docs/08-security-legal.md)
9. [Testing and quality](docs/09-testing.md)
10. [Delivery, deployment, maintenance](docs/10-delivery.md)
11. [Independent engineer review gates](docs/11-review-gates.md)
12. [Risk register and decisions](docs/12-risks-decisions.md)
13. [Sources](docs/13-sources.md)

## Non-negotiable engineering rules
- Do not proxy or replace the websites, steal cookies, read private data, or intercept credentials.
- Do not inject remotely hosted executable code; bundle reviewed extension code.
- Do not claim endorsement by Google, YouTube, or Meta.
- No original archived logos, icons, sprites, or proprietary fonts are distributed without rights clearance. Preserve visual fidelity through documented, independently produced equivalents where required.
- No release gate can pass solely because the UI looks good: core workflows must remain functional.
- Every phase ends with an independent reviewer sign-off; failures reopen the phase.
- Historical references must be dated and evidence-backed; '2012' is not a single universal interface.

## Definition of complete
A Chrome Web Store release is approved only after the reviewer has signed all gates, permission and privacy disclosures are accurate, legal review is complete, and the three target-site compatibility suites pass on supported configurations. No guarantee of perfect equivalence across future site updates is made.
