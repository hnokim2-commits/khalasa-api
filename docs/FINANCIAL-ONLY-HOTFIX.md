# Conservative financial hotfix — NOT deployed

Base: production commit17abde0e81a3133b4a98beec1ea2b8f4258a36bc. Separate branch production-financial-hotfix-20261020; broader staging branch retained unchanged.

Included only: atomic key/business/response financial transactions for withdrawal, merchant settlement and rider remittance; parent-lock reservation and approval-limit checks for cash advances; additive migration0071; tests adapted to module extraction and three release-scope checks. Financial helper modules and0071 copied from the tested933206a implementation.

Excluded:0068/0069/0070, customer-password onboarding, merchant activation middleware, messaging/voice additions, storage provider diagnostics, backup scheduler/tooling changes, hosting/env changes. Old OTP flow, currently approved merchants and existing automated backups retain their current behavior; no new legal acceptance or document approval is fabricated.

## Verification and existing failures

Targeted financial/auth/scope suite:19 passed,0 failed.

Running the unmodified production baseline canonical suite reproduced5 failures: two merchant-activation-policy assertions and three partner-access-code-policy assertions. Baseline total110,105 passed,5 failed. Initial hotfix suite (before adding3 scope tests)116,111 passed, same5 failures. Tests were not skipped or weakened to manufacture a green full suite. The stricter activation assertions conflict with this intentionally deferred rollout; partner credential-policy failures are an existing security work item, not solved here. Production approval requires explicit review of those gaps, not a blanket claim that all tests passed.

The broader131-test suite is for a DIFFERENT release candidate and must not be attributed to this conservative branch.

## Local production-data drill

Prepared TEST-PRODUCTION-FINANCIAL-HOTFIX-LOCAL.ps1: new network-none PostgreSQL17 container, verified production backup file, trusted baseline migrations, full typed row/FK checks, then ONLY0071 and old-data comparison. Requires old backup passphrase locally. Not yet run for this branch. Expected result PRODUCTION_FINANCIAL_HOTFIX_LOCAL_RESTORE_PASS. No document bytes/Supabase systems restored; no source connection; retained stopped plaintext test database.

No commit to main, remote push, production migration/deployment, credential rotation, data deletion or financial transaction has been performed. Fresh DB+document backup and coordination of the active order remain prerequisites; never roll back to an old financial writer without a compatible plan for operation-result records.

## User-confirmed production-file drill

PRODUCTION_FINANCIAL_HOTFIX_LOCAL_RESTORE_PASS supplied by user:81 tables,1491 rows,179 FK validations, ONLY0071 applied, old columns/rows unchanged. Container khalasa-production-financial-test-a47ec7f8b25d stopped. No document bytes or Supabase system restore/source connection; sequence values reconstructed from maxima.

## Next prepared test (not yet executed)

TEST-FINANCIAL-HOTFIX-HTTP-LOCAL.ps1 builds a fresh synthetic full-schema PostgreSQL17 database and a generated copy of this branch's API source using the existing dependency runtime. No source `.env` copied/read, no real user records or credentials requested. API test preload forces loopback binding and blocks fetch; BACKUP_ENABLED=false. Tests actual admin/merchant/rider login, role denials,20 concurrent identical financial POSTs, payload mismatch, replay and overspend race. API and DB stop afterwards; synthetic test container retained. Syntax and isolated preload-guard tests passed; full HTTP run requires user's Docker access.

Latest full branch suite119 tests:114 pass, same5 baseline failures. Targeted19/19 pass; these results are distinct, not an all-green full-suite claim.

User supplied **FINANCIAL_HOTFIX_LOCAL_HTTP_PASS,12 checks**, synthetic full-schema PostgreSQL, real API admin/merchant/rider login and role checks,20 identical financial POSTs, payload mismatch, replay and overspend race. API and container `khalasa-hotfix-http-cfee18c3d933` stopped. No source connection or real payment. Preload Windows import path was corrected to a file:// URL before the successful run. No production deployment approval is implied.

## Subsequent partner-code policy work (not deployed)

User approved addressing the three existing partner-policy gaps separately without changing current passwords/login or merchant activation. Local changes validate NEW application/creation/reset codes using the existing shared policy plus a72-byte bcrypt limit; protected routes authenticate first. Recovery compares the replacement against the stored account phone inside the transaction, before updating credentials. Existing partner login is not intercepted; no existing hash/session is modified by applying code changes. No SQL migration added.

Added4 executable middleware/recovery tests. Current full suite:123 tests,121 pass,2 fail. The3 partner-policy assertions now pass; the remaining2 still require the intentionally deferred merchant activation rules. No skip or false all-green claim. Source syntax check passed.

Prepared TEST-HOTFIX-PARTNER-POLICY-LOCAL.ps1:25 combined synthetic full-HTTP financial/policy/rollback checks expected; NOT yet run. Existing local merchant fixture deliberately has a legacy phone-derived password to prove login remains possible, while NEW weak/phone-derived/over72-byte codes and weak recovery replacements are refused without changing its hash/session. No production credentials, data or consent records are used.

## Final combined evidence — 2026-10-20

The preceding "not yet run" entries describe preparation history, not current status. User supplied FINANCIAL_HOTFIX_POLICY_AND_ROLLBACK_PASS:25 checks, partnerPolicyTested=true, existingLegacyLoginPreserved=true, rollbackTested=true. Container khalasa-hotfix-http-b8215bb1747e and API stopped. Synthetic full-schema PostgreSQL and real local API only; sourceConnected=false, realPayment=false, externalFetchDisabledInApi=true, loopbackOnly=true. Old baseline reads the additive schema and rejects reused keys rather than replaying success; no schema downgrade tested or proposed. This is not production/UI/OTP/document/provider certification.

Agent reran source syntax and the canonical suite before committing:123 tests,121 pass,2 fail. The remaining failures are precisely the deferred merchant-activation requirements; no tests skipped. Remote publication and exact-candidate staging deployment remain pending. Do not replace the broader staging frontend/API pairing or deploy production implicitly.
