# OOX integration security assessment — 2026-10-05

Scope: explorer purchase/list transaction construction, review/sign/broadcast controls, API listing validation, ownership confirmation, wallet dependencies and browser deployment settings on `feature/oox-purchase-preview`. This is a code/dependency assessment, not an independent penetration test or an audit of OOX smart contracts, infrastructure, wallet software or Netlify/GitHub account security. It cannot establish zero vulnerabilities.

## Result

The reviewed transaction path pins mainnet and the OOX contract, checks the transaction against independently constructed expected fields, and rejects changed wallet/network or purchase quotes before broadcast. No private keys/seed phrases are collected by application code. Automated checks pass. Findings below remain tracked; production rollout has not been performed.

## Fixed in this assessment

- Missing, non-integer, negative, unsafe or reversed listing timestamps could bypass JavaScript availability comparisons. Reject these responses before purchase review/signing.
- Truthy strings could pass active/purchasable checks. Require exact boolean true; require the atomic price to be a positive decimal string.
- Reject unsupported marketplace actions and malformed/future review timestamps.
- Both cross-window and iframe wallet providers pinned vulnerable qs 6.11.2. Scoped overrides now resolve qs 6.16.0. Tests verify each provider resolves that version, callback query round trips, and the advisory's attacker-controlled constructor/isBuffer shape does not crash stringification.
- Added Netlify `frame-ancestors 'self'` to reduce clickjacking, `nosniff`, and `strict-origin-when-cross-origin` referrer policy. TOML parses successfully. Headers require post-deploy verification; wallet return should be checked after this update.
- Earlier compatible updates: axios 1.20.0 and brace-expansion 5.0.12.

## Evidence

- `node --test tests/*.test.mjs`: 58 passed, 0 failed. Covers wrong collection/nonce/NFT, changed price/seller/currency, unavailable/expired/malformed listings; altered sender/receiver/value/data/gas/network/guardian/relayer; and celebration only for successful expected transaction plus matching wallet NFT.
- Targeted ESLint: passed for OOX, My Pittz and wallet initialization.
- Mainnet preview production build: passed. Existing large-chunk and React peer compatibility warnings remain.
- Owner reports purchase, signing cancellation, listing view, xPortal return and post-purchase celebration working. This is user-supplied live testing evidence, not independently reproduced financial transactions during the assessment. Signing cancellation is distinct from cancelling an existing marketplace listing; listing cancellation remains through OOX.
- Manual review: quote rechecked before and after signing; payload checked before and after signing; wallet/network rechecked immediately before broadcast; 60-second review expiry before signing; balance includes conservative fee cap; in-flight lock; no automatic broadcast retry. Submission orchestration was inspected, not covered by mocked end-to-end provider tests.
- Source scan found no application use of eval, new Function, dangerouslySetInnerHTML, privateKey, mnemonic or seedPhrase.
- Temporary production build with source maps: 1,145 mapped source entries. No source modules for braces, micromatch, jest-message-util, expect, uuid or qs. Maps were created only in `/tmp/pittz-security-build`, not enabled for deployment. This supports lack of a direct module path in this build, not a guarantee about every prebuilt dependency or future build.

## Remaining dependency findings

`npm audit` after remediation: 6 high, 10 moderate, 0 critical; 16 affected package entries. These include propagated dependency findings, not 16 independent vulnerabilities.

- **braces <=3.0.3**: high severity stack-exhaustion DoS on deeply nested brace patterns. GitHub advisory GHSA-vfj7-8cjw-p6xm reports no patched version. Installed via micromatch → jest-message-util → expect → @types/jest in the iframe provider dependency tree. Those source modules are absent from the inspected browser build. Remains a dependency/build-environment exposure; do not pass untrusted patterns into this tooling. Reassess on dependency/build changes.
- **uuid 8.3.2**: moderate severity supplied-buffer bounds advisory GHSA-w5hq-g745-h8pq affects v3/v5/v6. sdk-core's inspected wallet randomness uses v4 with crypto.randomBytes(16); uuid source modules are absent from the inspected browser build. Avoid an unverified major override of sdk-core's pin. Track an upstream compatible update and recheck reachability when wallet features change.
- **React 19 peer warning**: zustand's use-sync-external-store 1.2.0 declares React <=18. Build and reported owner wallet tests pass; real-device wallet regression remains needed after dependency changes.
- Do not run npm audit fix --force: its proposed sdk-dapp downgrade is incompatible with the v5 APIs used here.

## Operational limits and release checks

- OOX API/contract is an external trust boundary. Client guards cannot establish smart-contract security or independently prove marketplace royalties/fees. SDK exclusivity is not security evidence.
- The transaction lock is browser-memory scoped and is not durable across refreshes/tabs. A network failure after sending can leave broadcast outcome uncertain. The UI warns to check wallet/explorer history and never automatically retries; owners must follow that warning before manual retry.
- Listing prices can change during signing. The client rechecks before broadcast, but only on-chain rules govern a race after the final check.
- Private preview access is configured in Netlify by the owner; frontend flags are not authentication. The preview still sends real mainnet transactions when authorized by a wallet.
- Security headers limit framing but do not implement a full script/connect/image CSP. A strict policy needs compatibility testing against xPortal/WalletConnect and external NFT images.
- Keep preview private. Verify deployed headers and repeat connect/review/sign-cancel/return after these changes. No purchase is needed to check signing cancellation. Confirm a real list transaction separately if public listing will be enabled; viewing My Listings is not evidence that creating listings works.
- XOXNO transactions remain unimplemented pending vendor verification. Never send an OOX purchase for an unsupported marketplace listing.

Sources: https://github.com/advisories/GHSA-4mjr-xmp4-gh2g ; https://github.com/advisories/GHSA-vfj7-8cjw-p6xm ; https://github.com/advisories/GHSA-w5hq-g745-h8pq ; https://docs.netlify.com/manage/routing/headers/
