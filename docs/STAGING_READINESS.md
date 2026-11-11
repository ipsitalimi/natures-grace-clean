# Nature's Grace — staging readiness and E2E validation

**Scope:** staging only. This document does not authorize a production deployment, production migration, production credential use, or merge to `main`.

## Current repository findings

- Branch: `feature/ng-master-changes`.
- SQL history: legacy numbered migrations `001`–`071`, followed by timestamped migrations from `20261104000100` through `20261110000200`.
- Existing test command: `npm test` (Node test runner through the already-installed `tsx` package). The current committed suite contains focused critical-path validation/regression tests, not a full E2E suite.
- CI workflow: `.github/workflows/quality.yml` runs tests, typecheck, lint, server build, and Expo web export on pushes and pull requests. A workflow definition is not proof that a run has completed successfully.
- `eas.json` now has a `staging` build profile extending `preview`; it uses EAS environment `preview`. Verify that this EAS environment contains only staging endpoints and credentials before building.
- `.env.staging.example` lists the staging variables. It contains placeholders only.
- The repository currently has no committed `supabase/config.toml`, no `supabase/seed.sql`, and no checked-in staging project reference/connection. No staging database, EAS environment values, API host, Razorpay test account, or webhook endpoint can be verified from repository contents.

## Required staging infrastructure (not verified)

Before testing, provision or identify all of the following. Do not substitute production infrastructure.

1. A separate Supabase staging project, with Auth enabled and email redirect URL `natures-grace://auth/callback` configured. Record its project ref in the team's secret manager, not this repository.
2. A staging API deployment or isolated local API process connected only to that staging Supabase project.
3. A Razorpay **test-mode** account/key pair and a webhook configured to call the staging API's `/api/webhooks/razorpay` endpoint. Use a separate webhook signing secret.
4. EAS `preview` environment values for the staging Supabase URL/anon key, staging API URL, and Razorpay test Key ID. Confirm none point to production before running `eas build --profile staging`.
5. Server-side staging values: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. For mail tests, set `EMAIL_PROVIDER=resend`, a staging-safe `RESEND_API_KEY`, and a verified staging sender in `EMAIL_FROM`. `PORT` is needed for local API execution; `EXPO_ACCESS_TOKEN` is optional for Expo push.
6. Staging app origins in `CORS_ALLOWED_ORIGINS` where applicable. Optional Firebase values must refer to a separate staging Firebase project; otherwise leave them unset.
7. Dedicated test inboxes and test identities for Customer, Practitioner, Seller, and Admin. Bootstrap the staging Admin using the approved secure admin process; do not promote an arbitrary test account through client-side profile editing.
8. A staging-only storage bucket/configuration if the app's practitioner, seller, resource, or chat flows upload files.

### Environment variable matrix

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | App | Staging Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App | Staging Supabase publishable/anon key |
| `EXPO_PUBLIC_API_URL` | App | Staging API base URL |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | App | Razorpay test Key ID |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | App | Auth callback URL |
| `SUPABASE_URL` | Server | Same staging Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Staging-only privileged database access |
| `RAZORPAY_KEY_ID` | Server | Razorpay test Key ID |
| `RAZORPAY_KEY_SECRET` | Server only | Razorpay test API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Server only | Staging webhook signature secret |
| `PORT`, `NODE_ENV` | Server | API listener/runtime mode |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Server | Staging transactional email |
| `EXPO_ACCESS_TOKEN` | Server, optional | Expo push delivery |
| `CORS_ALLOWED_ORIGINS` | Server, optional | Staging app origin allowlist |
| `EXPO_PUBLIC_FIREBASE_*` | App, optional | Separate Firebase staging project only |

Never commit `.env.staging`, real values, service-role keys, Razorpay secrets, webhook secrets, or personal customer data. `EXPO_PUBLIC_*` values are embedded in the client and must never contain secrets.

## Migration order, dependencies, and repeat-run safety

### Required order

Use the complete committed migration history in lexical order, not a hand-picked subset. The legacy schema is the foundation; the timestamped migrations extend it. For a fresh staging database, apply all committed migrations from `001_phase1_schema.sql` through `20261110000200_allow_multiple_journal_moods.sql` in order, using the Supabase migration ledger to apply each version once.

Key dependency groups:

| Migration group | Depends on / establishes |
|---|---|
| `001`–`020` | Core profiles, practitioners, sellers, products, bookings, wallets, orders, cart, events, support, reviews, discussions, journal, notifications, and activity tables |
| `021`–`023` | Seller and platform promo tables/columns; promo campaign start dates and types |
| `024`–`030` | FAQ/support copy, storefront, profile preferences, app copy |
| `031`–`033` | Resource enrollments and role applications |
| `034`–`042` | RLS hardening, admin bootstrap guard, notification/role/legal changes |
| `043` | One-time removal of specifically identified legacy demo/seed catalogue rows and reset of related featured metadata |
| `044`–`064` | Role-approval RPCs, seller/practitioner onboarding, storage, wallet/profile RLS, specialties, delivery settings, and admin-controlled pricing |
| `065`–`069` | Refund audit fields, practitioner refund-wallet linkage/atomic refund, user booking cancellation and 36-hour reschedule RPC |
| `070`–`071` | Practitioner application workflow and seller approval/wallet bootstrap |
| `20261104000100`–`20261104000200` | Booking fee snapshot and fee-aware refund reversal; require the base booking/refund/wallet schema |
| `20261107000100` | Atomic paid-booking fulfilment; requires pending booking checkout, practitioner booking, wallet, and wallet transaction tables |
| `20261107000200` | Atomic seller order earning; requires orders, seller wallets, and wallet transaction tables |
| `20261107000300` | Idempotent stock decrement/restore; requires orders, order items, products |
| `20261107000400`–`20261107000500` | Promo usage ledger and idempotent restore; requires seller/platform promo tables and store orders |
| `20261107000600` | Atomic admin payout status; requires both payout and wallet tables and adds payout audit/status fields |
| `20261107000700`–`20261107000800` | Atomic wallet payout request and earning release/reversal; requires seller/practitioner wallets and transaction tables |
| `20261109000100` | Atomic seller/practitioner payout webhook lifecycle; requires payout audit fields, wallet balances, and payout transaction rows |
| `20261109000200` | Practitioner earning credit and guarded promo-usage RPC; depends on practitioner wallet schema and promo usage ledger |
| `20261109000300` | Practitioner booking intro-chat columns, message table, participant RLS, start-chat RPC |
| `20261109000400` | Event/course registration integrity; depends on events and registrations |
| `20261110000100` | Community moderation/access policies; depends on discussion tables and admin identity policy |
| `20261110000200` | Multiple/custom journal mood constraint; depends on journal entries table |

### Re-run safety assessment

Do **not** assume every SQL file is idempotent. Many newer migrations use `CREATE OR REPLACE FUNCTION`, `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS`, or unique ledgers with `ON CONFLICT`; these are useful safeguards, but do not make the entire migration transaction universally safe to replay. Some migrations create policies/constraints without dropping them first, and `IF NOT EXISTS` does not verify that an existing object has the expected definition.

**Special caution — migration 043:** it contains a `DO` block that deletes rows matching known demo product/practitioner/event/resource/discussion markers, removes related rows, clears seeded prompts, and resets featured metadata. It is a one-time cleanup migration, not a repeatable staging reset script. A later legitimate record reusing one of those names/markers could be affected if the SQL is manually replayed. Never manually rerun it.

Other cautions:
- `068` drops a legacy function signature before creating the replacement signature; this is a deliberate function replacement, not a general rollback.
- `069` uses `CREATE OR REPLACE FUNCTION` but depends on the booking schema and grants service-role execution.
- Several RPC migrations revoke public/client execution and grant `service_role`; preserve those grants exactly.
- Never use `drizzle-kit push` as a substitute for this Supabase SQL migration history. The package script `db:push` is Drizzle schema push, not a replay of `supabase/migrations`.
- Before applying anything, compare local migration versions against the staging project's `supabase_migrations.schema_migrations` ledger. Resolve drift explicitly; do not delete ledger rows to force a replay.
- There is no committed `supabase/config.toml` in this repository at present. Do not run `supabase db push` until a staging-specific Supabase CLI project configuration/link is established and verified.

No migration has been applied as part of this task.

## Staging-only E2E checklist

Use unique test accounts and test data with a `STG-` prefix where a free-text reference is available. Capture request IDs, record IDs, timestamps, and sanitized errors only. Never capture bearer tokens, full payment credentials, service keys, or full bank account numbers.

### A. Customer signup and login
- [ ] Sign up with a staging test inbox; verify the email and callback returns to the staging app.
- [ ] Log out, log in, restart the app, and confirm the session persists.
- [ ] Exercise invalid password, unverified email, expired token, and password reset.
- [ ] Confirm a suspended/deletion-requested/deleted account is denied protected API access.
- [ ] Confirm customer cannot read or modify another user's profile, booking, order, wallet, or notification.

### B. Practitioner onboarding and permissions
- [ ] Submit practitioner application with required profile/specialty fields.
- [ ] Verify application is pending and does not grant practitioner-only access prematurely.
- [ ] Admin approves using the intended approval workflow; verify practitioner/profile/wallet bootstrap happens once.
- [ ] Practitioner can edit only their own profile, offerings, availability, schedule, and intro-chat participation.
- [ ] Practitioner cannot access another practitioner's bookings, payout, wallet, customer private details, or admin APIs.
- [ ] Verify suspended/deletion-requested practitioner is denied protected operations.

### C. Seller onboarding and permissions
- [ ] Submit seller application and verify pending state.
- [ ] Admin approval creates/links seller and wallet once; retry approval and check for duplicates.
- [ ] Seller can manage only their own catalogue, stock, orders, fulfilment, promos, and payout requests.
- [ ] Seller cannot change payment status, another seller's products/orders/wallet, platform promos, or admin settings.
- [ ] Verify suspended/deletion-requested seller is denied protected operations.

### D. Booking, payment, confirmation, cancellation, refund
- [ ] Customer selects an available practitioner slot; create one booking checkout using Razorpay test mode.
- [ ] Confirm invalid duration/amount, unavailable slot, duplicate slot, and altered amount are rejected.
- [ ] Complete payment and verify one booking, one payment association, and one practitioner earning/held-balance entry.
- [ ] Send the same `payment.captured` webhook twice; verify no duplicate booking or earning.
- [ ] Send malformed signature, wrong secret signature, and altered raw-body signature; expect rejection.
- [ ] Confirm customer and practitioner receive expected in-app notifications; email/push outcomes are separately visible.
- [ ] Cancel an unpaid booking and verify no refund request is created.
- [ ] Cancel a paid booking and verify a single refund request with policy/fee snapshot; repeat cancellation and verify no duplicate request.
- [ ] Exercise reschedule inside and outside the 36-hour cutoff; verify ownership and valid date/time.
- [ ] Admin processes refund; verify wallet reversal, fee treatment, audit record, and terminal-state retry safety.
- [ ] Confirm no partial booking/refund/earning state remains after injected RPC/API failure.

### E. Store order, payment, inventory, promo
- [ ] Seller product has known stock; customer adds multiple lines including duplicate product lines.
- [ ] Verify duplicate cart lines consolidate and fractional/zero/negative quantities reject.
- [ ] Attempt quantity above stock; verify checkout rejects and stock remains unchanged.
- [ ] Create order, pay with Razorpay test mode, and verify order paid, stock decremented exactly once, seller earning recorded exactly once.
- [ ] Replay payment webhook; verify stock and promo usage do not decrement/increment again.
- [ ] Test seller and platform promo: active, paused, not-yet-started, expired, usage limit reached, minimum order, fixed discount, percentage discount, >100% invalid discount, and subtotal cap.
- [ ] Refund/cancel eligible order and verify stock/promo restoration occurs exactly once.
- [ ] Verify a failed payment leaves order pending and does not consume stock, promo usage, or seller earnings.
- [ ] Seller fulfillment status transitions are limited to the owning seller and allowed states.

### F. Wallet and payout lifecycle
- [ ] Customer cannot call seller/practitioner payout APIs.
- [ ] Seller and practitioner each request payout within available balance; verify balance reservation and one payout transaction.
- [ ] Retry payout request with same client action; ensure the app does not create duplicate reservations unintentionally.
- [ ] Non-owner cannot dispatch or inspect payout; admin-only status endpoint rejects seller/practitioner/customer.
- [ ] Admin approves/marks processing/completes payout; verify pending balance reconciles and transaction description updates.
- [ ] Fail payout; verify reserved amount returns to available balance exactly once.
- [ ] Replay success/failure webhook and send out-of-order terminal event; verify no double debit/credit or terminal-state reversal.
- [ ] Confirm seller and practitioner wallet ledgers reconcile with payout rows after every transition.

### G. Notifications and intro chat
- [ ] Booking/order/payout lifecycle creates the expected in-app notification.
- [ ] Email and Expo push are tested independently; delivery failure must not reverse a committed payment/order/payout.
- [ ] Admin-only notification endpoint rejects non-admin roles; self-notify can only notify the authenticated user.
- [ ] Customer and assigned practitioner can start/read/send intro chat only for the same eligible booking.
- [ ] Unrelated customer/practitioner cannot read or insert chat messages.
- [ ] Confirm chat opens only in the configured pre-session window and ends at its configured deadline.
- [ ] Verify duplicate send/retry does not duplicate a message where the client/server supports idempotency; document if it does.

## Execution sequence

1. Confirm the staging Supabase project ref, API host, Razorpay test credentials, EAS preview environment, sender domain, and test accounts with the project owner.
2. Confirm the Supabase migration ledger and schema drift on staging. Back up staging data if it is not disposable.
3. Apply only missing migrations to staging, in order, using the approved Supabase migration workflow. Do not apply any migration to production.
4. Set staging environment values from `.env.staging.example` (local isolated environment) or EAS `preview` (internal build). Do not store populated files in Git.
5. Run `npm ci`, `npm test`, `npm run check:types`, `npm run lint`, `npm run server:build`, and `npx expo export --platform web --output-dir web-build`.
6. Build an internal app with `eas build --profile staging --platform android` only after verifying the EAS `preview` environment is staging-only.
7. Run the E2E checklist from A to G. Use Razorpay test mode and a staging webhook URL only.
8. Record failures with environment, app/API build, migration version, test identity role, sanitized request/record IDs, expected/actual result, and reproduction steps. Do not attach secrets or personal data.
9. Fix only reproducible failures in the tested workflows; rerun affected checks and all quality commands.
10. Keep the branch unmerged and staging data isolated until explicit release approval.

## What is not yet validated

At documentation time, no staging credentials or infrastructure were supplied to this task. Therefore signup/login against a live staging Auth project, real role approvals, Razorpay payment/webhook delivery, refund settlement, stock mutation, payout provider callbacks, email/push delivery, and live chat RLS have not been executed. This checklist prepares those tests; it is not a statement that they passed.
