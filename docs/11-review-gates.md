# 11 — Mandatory independent engineering reviews

## 11.1 Review protocol
For every gate: author submits deliverables and evidence; independent engineer reads code/docs and reproduces tests; reviewer records PASS, PASS WITH NONBLOCKING NOTES, or FAIL; FAIL creates actionable issues with owner and due date; author remediates; reviewer re-tests and signs. Reviewer must not approve own implementation. Keep approvals in repository `reviews/Gxx-YYYY-MM-DD.md` with commit SHA, environment, evidence links, decisions, blockers and signature/handle.

## 11.2 Gate sequence
G1 Product scope -> G2 Historical research -> G3 Architecture -> G4 YouTube -> G5 Google -> G6 Facebook -> G7 Assets/motion -> G8 Security/legal -> G9 QA -> G10 Deployment. Parallel work is allowed, but dependent implementation cannot be declared complete before its prerequisite gate passes.

## 11.3 Standard review template
```
Gate:
Commit SHA:
Author:
Reviewer (independent):
Date:
Evidence examined:
Tests reproduced:
Requirements traced:
Security/privacy implications:
Historical fidelity and asset provenance:
Performance/accessibility results:
Blockers (severity/owner):
Decision: PASS | PASS WITH NOTES | FAIL
Remediation/re-review date:
Reviewer signoff:
```

## 11.4 Definition of done per component
Historical evidence recorded; design tokens documented; implementation code reviewed; functionality crosswalk complete; keyboard/accessibility verified; performance measured; visual baseline compared; licenses cleared; regression tests in CI; rollback behavior verified; documentation and screenshots updated.

## 11.5 Final audit
Sample 10% of previously approved components for regression; confirm all signoffs match release commit, permissions have not expanded without review, asset manifests match shipped files, all known P0/P1 issues resolved, and no misleading fidelity claims.
