# 10 — Development, release, deployment and operations

## 10.1 Team responsibilities
Product owner: scope/priorities. Researcher/designer: archive evidence and tokens. Extension engineer: framework. Three site adapter owners: implementation. QA: automation and visual baselines. Security/legal: review. Independent reviewer: phase signoff. For small teams roles can overlap except author and approver of same gate.

## 10.2 Indicative schedule (not a commitment)
Weeks 1–2: discovery, historical source audit, legal feasibility, prototype selector tests. Weeks 3–4: extension framework, Google pilot, early CSS. Weeks 5–7: YouTube routes, loaders and feature parity. Weeks 8–11: Facebook routes and privacy-safe integration. Weeks 12–13: hardening, accessibility, performance, browser matrix. Weeks 14–15: closed beta and store preparation. Week 16+: review, release, monitoring. Complexity of site changes may extend this significantly.

## 10.3 Development workflow
Issues linked to requirements and archive evidence; feature branches; PR templates include screenshots and feature crosswalk; two reviewers for sensitive code; CI required; release notes and migration plan. Never commit archived copyrighted assets into public repository without clearance. Use semantic versioning, adapter-specific version and changelog.

## 10.4 Release checklist
Developer account and publisher verification; extension ID; Manifest V3 validation; minimum permissions; privacy policy and support URL; accessible popup; store icon and screenshots that show actual functionality; clear 'unofficial' wording; no trademark-confusing extension branding; single-purpose statement; disclosure of supported sites and limitations; zip artifact and SHA-256; clean installation; update migration; uninstall behavior; incident contact; reviewer signatures.

## 10.5 Rollout
Internal dogfood (10 users) -> invite-only beta (50–100) -> public staged rollout if available via chosen channel. Chrome Web Store publication mechanisms and staged rollout availability must be confirmed at release time. Keep rollback package and ability to disable site adapters via a locally shipped update; no remote code execution. Test update and downgrade scenarios.

## 10.6 Operations
Weekly DOM compatibility smoke checks, automated synthetic test accounts where permitted, monthly dependency review, quarterly security/privacy policy audit, site-change incident triage, 48-hour target to investigate P0 incidents (staffing-dependent), changelog and support FAQ. Do not promise guaranteed uptime for an extension dependent on third-party DOM.

## 10.7 Deployment gate G10
Release manager checks every prior signoff, exact tested artifact hash, store policy audit, rollback plan, support readiness and known-issue disclosure. Final signoff from independent engineer + security/legal + product owner before submission.
