# OOX preview dependency review — 2026-10-04

This is an initial review, not a security audit or assurance of zero vulnerabilities.

## Compatible fixes

- axios 1.19.0 → 1.20.0.
- brace-expansion 5.0.9 → 5.0.12.
- Audit count after updates: 6 high, 11 moderate, 0 critical (17 affected package entries). Counts include packages that inherit findings from dependencies; they are not 17 independent vulnerabilities.
- Purchase/listing transaction validation and purchase-confirmation tests: 43 passed. Preview build and targeted lint passed.

## Remaining assessment

- qs 6.11.2 is pinned by the cross-window wallet provider. Parsing/stringification advisories need review against the wallet provider's actual inputs, followed by a compatible SDK update or tested override.
- sdk-core pins uuid 8.3.2. The reported buffer-bounds advisory concerns v3/v5/v6 with a supplied buffer. One inspected sdk-core wallet randomness call uses v4; that observation does not establish safety of all transitive uses.
- High-severity braces findings propagate through micromatch, jest-message-util, expect and @types/jest, including the iframe provider's dependency tree. Reachability in the shipped browser bundle still needs verification.
- Existing React 19 peer compatibility warning from zustand's use-sync-external-store 1.2.0 remains. The build passes, but wallet state behavior should be exercised on actual devices.
- Do not apply npm audit fix --force: its suggestion includes downgrading sdk-dapp to 2.26.7, incompatible with this implementation's v5 API usage.

## Before public rollout

Finish remaining dependency reachability/remediation review. Check seller listings with a real wallet. Test mobile signing and return behavior, then verify the celebration follows both a successful transaction and matching wallet ownership. Listing/cancel/price-management actions require their own tests; public enablement must reflect which actions have actually been validated.
