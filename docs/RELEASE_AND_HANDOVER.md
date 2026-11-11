# Nature's Grace — release readiness and developer handover

**Review date:** 10 November 2026  
**Repository:** `ipsitalimi/natures-grace-clean`  
**Reviewed branch:** `feature/ng-master-changes`  
**Default branch:** `main`  
**Scope:** documentation and release preparation only. No production deployment, Play Store upload, App Store upload, merge, or database migration is authorized by this document.

## 1. Executive release assessment

**Release status: NOT VERIFIED / NOT APPROVED FOR RELEASE.**

The repository contains an Expo mobile application, an Express API, Supabase integration, Razorpay payment flows, SQL migration history, focused regression tests, and a GitHub Actions quality workflow. The source configuration is not sufficient evidence that release artifacts build successfully or that the app has passed device-level and end-to-end testing.

| Area | Finding | Release status |
|---|---|---|
| Android source configuration | Expo SDK 54, package ID `com.naturesgrace.app`, EAS production profile | Present; final artifact not verified |
| Android build | No successful EAS build artifact or reproducible local build result was available during this review | **Unverified** |
| API build | `server:build` script exists | **Unverified** |
| CI | Quality workflow exists; no successful status/check result was visible for the reviewed branch head | **Unverified** |
| Play Store | Project owner previously reported an Android Play Store release; Play Console listing, track, version, policy status and current artifact were not accessible for independent verification | Reported live; verify in Play Console |
| iOS/App Store | Expo iOS bundle ID is configured, but no iOS build, TestFlight upload, App Store Connect record, or review result was verified | **Not release-ready / unverified** |
| Database | 87 committed SQL migrations; staging readiness guide exists | Migration state of any live environment not verified |
| Payments | Razorpay order creation, client confirmation, signed webhook fulfillment and wallet/payout paths exist | Test-mode E2E and settlement not verified |
| Deployment | No deployment workflow or provider-specific deployment manifest was verified in the reviewed files | Operator runbook needed |

### Release blockers and gates

1. **Build evidence missing:** run the Android EAS production build and retain its build ID, artifact, and build logs. Run the API build and all CI quality commands against this exact commit.
2. **CI evidence missing:** obtain green test, typecheck, lint, API bundle, and Expo export checks for the release candidate. The presence of a workflow file is not a passing CI result.
3. **Android target API not pinned in app config:** no explicit `targetSdkVersion` or native Android Gradle project is committed. Confirm the generated AAB targets API 36 or higher for a submission on or after 31 August 2026.
4. **Play Console verification missing:** confirm current published version, signing/upload key ownership, version-code progression, policy declarations, app access instructions, and release-track status.
5. **Payments and money movement unverified:** run Razorpay test-mode checkout, webhook replay, refund, inventory, wallet, and payout lifecycle tests against staging. Do not test with live credentials during release validation.
6. **Payouts are manually operated:** seller and practitioner dispatch routes explicitly mark payouts for manual admin transfer. Confirm the client understands this operational requirement; automated bank payout execution is not evidenced by these routes.
7. **Backend deployment and ownership are not documented by repository configuration:** confirm hosting provider, deployment target, environment ownership, backups, monitoring, and rollback procedure with the current operator.
8. **iOS has not been built or tested:** Apple Developer account access, App Store Connect app record, signing, TestFlight, privacy metadata, and review readiness remain unverified.

No confirmed runtime crash or reproducible end-user defect was established from static repository inspection alone. The blockers above are missing release evidence, required configuration confirmation, and unverified operational workflows—not a claim that each is a software defect.

## 2. Repository and branch

- GitHub repository: https://github.com/ipsitalimi/natures-grace-clean
- Default branch: `main`
- Reviewed working branch: `feature/ng-master-changes`
- Branch was reported as 206 commits ahead of `main` at review time. Do not merge as part of this handover.
- Current release candidate source must be identified by its exact commit SHA before building. Do not rely on a moving branch name alone.
- Keep secrets and populated environment files out of Git.

## 3. Application architecture

### Mobile client

- Expo SDK 54 / React Native 0.81 / React 19.
- TypeScript client under `client/`.
- Navigation and screens under `client/navigation/` and `client/screens/`.
- Shared contexts under `client/context/`.
- Client services under `client/services/`.
- Supabase client integration is used for authentication and app data.
- Razorpay React Native SDK is used for payment checkout.
- Expo Notifications is included for push-notification integration.
- Firebase is an optional integration used by journal/gratitude sync paths.

### API server

- Express 5 API, entry point `server/index.ts`.
- Route registration in `server/routes.ts`.
- API routes are grouped under `server/routes/`, with business logic under `server/services/`.
- Server-side Supabase privileged access is isolated in `server/lib/supabaseAdmin.ts`.
- Production startup checks required server variables through `server/lib/productionEnv.ts`.
- API build output is configured for `server_dist/`.

### Data and external services

- Supabase: authentication, Postgres database, row-level security, storage and database RPCs.
- Razorpay: INR payment order creation, client payment confirmation, HMAC verification and payment webhook fulfillment.
- Resend: optional transactional email integration.
- Expo Push: optional push notification delivery.
- Firebase: optional journal/gratitude sync.
- Drizzle is present for schema tooling, but `npm run db:push` invokes `drizzle-kit push`; it is not the Supabase SQL migration runner.

### Payment flow overview

- Booking checkout routes: `POST /api/bookings/checkout/create-order` and `POST /api/bookings/checkout/confirm`.
- Store checkout routes: `POST /api/store/checkout/create-order`, `POST /api/store/checkout/create-payment`, and `POST /api/store/checkout/confirm-payment`.
- Razorpay webhook: `POST /api/webhooks/razorpay`; the server validates the signature against the raw request body and handles captured/paid events.
- Database RPC/migration work supports booking fulfillment, seller earnings, inventory changes, promo usage, refunds, and payout lifecycle accounting.
- Never put `RAZORPAY_KEY_SECRET`, webhook secrets, or Supabase service-role credentials in the mobile app. Only the public Razorpay Key ID belongs in the client configuration.
- Seller and practitioner payout dispatch currently describes a **manual admin transfer** process. This is not proof of automated bank payout execution.

## 4. Frontend setup

Prerequisites:
- Node.js 22 is the version used by the committed GitHub Actions workflow.
- npm (use the committed `package-lock.json`).
- Expo CLI through `npx`; EAS CLI for cloud builds.
- Android Studio/emulator for Android device testing.
- Xcode on a compatible Mac for iOS native builds.

Steps:

```bash
git clone https://github.com/ipsitalimi/natures-grace-clean.git
cd natures-grace-clean
git checkout feature/ng-master-changes
npm ci
cp .env.example .env
# Populate only approved development/staging values.
npx expo start
```

Useful scripts:

| Command | Purpose |
|---|---|
| `npm run expo:dev` | Replit-specific Expo development startup |
| `npx expo start` | Standard local Expo development server |
| `npm test` | Node test runner using tsx |
| `npm run check:types` | TypeScript typecheck |
| `npm run lint` | Expo lint |
| `npx expo export --platform web --output-dir web-build` | Web export used by CI |
| `eas build --profile staging --platform android` | Internal staging Android build; only after verifying EAS preview values are staging-only |
| `eas build --profile production --platform android` | Android production build; requires explicit release authorization |

Do not run a production build or submit an artifact without the project owner's explicit approval.

## 5. Backend setup

The API is part of the same repository and uses the same npm dependency installation.

```bash
npm ci
cp .env.example .env
# Populate server-only values from the approved development/staging secret store.
npm run server:dev
```

API build and production start commands:

```bash
npm run server:build
npm run server:prod
```

Production startup requires valid `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. The production environment guard fails startup when required values are absent.

The exact API hosting provider, deployment target, domain, secret manager, process manager, scaling configuration, and rollback procedure were not identifiable from the reviewed repository files. Obtain these from the current operator before assuming operational ownership.

## 6. Database and migration history

- Supabase SQL migration directory: `supabase/migrations/`.
- 87 migrations are present in the reviewed branch: legacy numbered migrations `001`–`071`, followed by timestamped migrations through `20261110000200`.
- The history covers core app schema, role onboarding/approval, RLS and admin controls, booking cancellation/rescheduling, refunds, atomic booking and store payment fulfillment, stock/promo ledgers, payout accounting/webhooks, practitioner intro chat, event/course registration integrity, community moderation, and journal mood storage.
- Read `docs/STAGING_READINESS.md` before applying migrations. It documents migration ordering, dependencies, rerun cautions, and the special one-time cleanup migration `043`.
- Apply migrations only to the intended environment using Supabase migration history/ledger. Never manually replay migration 043.
- `npm run db:push` is Drizzle schema push and must not be used as a substitute for the committed Supabase migration history.
- No production or staging database state was inspected or modified during this release review.

## 7. Environment variable names (no values)

Use `.env.example` and `.env.staging.example` as the source templates. Values must come from the project owner's secret manager or provider dashboard.

| Variable | Consumer | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | App | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | App | Publishable/anon key; not a service key |
| `EXPO_PUBLIC_API_URL` | App | API base URL; production must not point to localhost |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | App | Public Razorpay Key ID |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | App | Auth deep-link callback |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged secret; never bundle or commit |
| `RAZORPAY_KEY_ID` | Server | Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Server only | Payment API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Server only | Webhook signature secret |
| `PORT`, `NODE_ENV` | Server | Runtime configuration |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | Server | Transactional email |
| `EXPO_ACCESS_TOKEN` | Server, optional | Expo push delivery |
| `CORS_ALLOWED_ORIGINS` | Server, optional | Allowed web origins |
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID` | App, optional | Firebase journal/gratitude integration |
| `DATABASE_URL` | Drizzle tooling, optional | Direct Postgres connection for Drizzle |

Never commit populated `.env` files, access tokens, private keys, service-role keys, payment secrets, or webhook secrets. `EXPO_PUBLIC_*` variables are embedded in the app bundle and are not secret storage.

## 8. Android build and Play Console release checklist

### Current repository build settings

- App name: `Nature's Grace`.
- Expo slug: `natures-grace`.
- App version in `app.json`: `1.0.0`.
- Android application ID: `com.naturesgrace.app`.
- Auth deep-link scheme: `natures-grace://`.
- EAS CLI minimum in `eas.json`: `>=18.0.1`.
- EAS app version source: `remote`.
- Production EAS profile enables `autoIncrement: true`.
- No committed native `android/` Gradle project or explicit Android `targetSdkVersion` was found in the reviewed paths; Expo/EAS generated native configuration must be inspected in the actual build.
- No local Android signing key should be committed. Confirm EAS-managed signing credentials and account ownership in EAS.

### Google Play current target API requirement

As of 10 November 2026, Google Play requires new apps and app updates to target Android 16 / API level 36 or higher for standard Android apps from 31 August 2026. Confirm the generated release AAB manifest reports target API 36 or higher before upload. The source config does not explicitly pin the target API, so this is an unresolved release gate until verified from the generated artifact/build logs.

Official policy: https://support.google.com/googleplay/android-developer/answer/11926878

### Before generating a release candidate

- [ ] Freeze the exact release commit SHA and confirm it is the approved branch.
- [ ] Confirm the production EAS environment uses production Supabase/API endpoints and live Razorpay public Key ID; never use preview/staging variables for a production binary.
- [ ] Verify all server secrets are configured only on the API host.
- [ ] Verify the production API URL is HTTPS and not localhost.
- [ ] Confirm Supabase auth redirect URL and Android deep-link callback.
- [ ] Confirm EAS project ID and EAS account ownership/access.
- [ ] Confirm Android package ID remains `com.naturesgrace.app` and matches the existing Play Console app.
- [ ] Confirm EAS remote versioning state and the next Android version code. Never reuse a version code already uploaded.
- [ ] Confirm the app's generated target SDK is API 36 or higher.
- [ ] Run tests, typecheck, lint, API build, and Expo Android production build.
- [ ] Install the exact AAB-derived test build on physical Android devices and test upgrade from the currently published version.
- [ ] Test signup/login, callback/deep links, role onboarding, booking, payment, refunds, store checkout, inventory, promos, chat, notifications, and payout status.
- [ ] Verify payment and refund behavior with controlled test accounts before any live transaction.
- [ ] Check crash/ANR logs and accessibility/layout on supported screen sizes.

### Play Console release checklist

- [ ] Confirm developer account access and app ownership.
- [ ] Confirm current production version, track, rollout status, policy status, and current target API in Play Console.
- [ ] Upload the signed Android App Bundle (`.aab`) to Internal testing first.
- [ ] Review Play App Signing status and retain the upload key securely with the client.
- [ ] Complete tester list, release notes, and internal testing feedback.
- [ ] Complete Data safety form based on actual data collection and all third-party SDKs.
- [ ] Complete app access instructions for reviewer accounts and role-specific areas.
- [ ] Complete content rating questionnaire and target audience declarations.
- [ ] Verify privacy policy URL, account deletion flow/URL, and user data deletion disclosures as applicable.
- [ ] Verify store listing title, short/full descriptions, icon, feature graphic, screenshots, and contact details.
- [ ] Complete ads declaration, app category, countries/regions, pricing, and app availability.
- [ ] Review permissions and ensure every sensitive permission is necessary and accurately declared.
- [ ] Review Play Console pre-launch report, device compatibility, crashes, ANRs, and warnings.
- [ ] Promote the tested artifact through the approved track only after explicit release approval.
- [ ] Use a staged rollout and monitor crash/ANR and payment/support signals after approval.

**Publication status:** owner previously reported the Android app is already on Google Play. This review did not access Play Console and cannot verify the current listing, live version, policy state, target API, or whether this branch matches the published artifact.

## 9. iOS / App Store readiness

### What is present

- `app.json` declares bundle identifier `com.naturesgrace.app` and tablet support.
- The project uses Expo managed configuration and EAS profiles.
- An EAS production submit profile exists but contains no explicit App Store Connect configuration.

### What is not verified / missing

- [ ] Apple Developer Program membership and team access.
- [ ] App Store Connect app record with bundle ID `com.naturesgrace.app`.
- [ ] Apple signing certificates, provisioning profiles, and EAS iOS credentials.
- [ ] Successful iOS EAS production build.
- [ ] Xcode build using Xcode 26 or later with iOS 26 SDK or later (current App Store Connect upload requirement since 28 April 2026).
- [ ] Generated iOS deployment target and compatibility check. Apple currently requires uploaded iOS apps to target iOS 13 or later.
- [ ] Physical iPhone/iPad testing, including login redirect, purchase/payment SDK behavior, push notifications, file/image uploads, and layout.
- [ ] App Store privacy details / Privacy Nutrition Label, including third-party SDK data collection.
- [ ] Required privacy manifests and approved-reason API declarations for applicable third-party SDKs.
- [ ] Updated age-rating questionnaire, app category, copyright, pricing, availability, and review contact.
- [ ] App Store screenshots, description, keywords, support URL, privacy policy URL, and reviewer notes.
- [ ] App Review demo account and complete instructions for customer/practitioner/seller/admin functionality.
- [ ] TestFlight internal/external testing and processing validation.
- [ ] Export compliance, encryption, content rights, and account deletion disclosures as applicable.
- [ ] App Review submission and approval.

Apple's current upload requirement: Xcode 26 or later with an iOS 26 SDK or later. Apple also currently lists iOS 13 or later as the minimum deployment target for uploads. Sources:
- https://developer.apple.com/news/upcoming-requirements/
- https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- https://developer.apple.com/support/third-party-SDK-requirements/

**iOS status: NOT VERIFIED AND NOT READY TO CLAIM.** A bundle identifier in `app.json` is not evidence of a successful iOS build or App Store submission.

## 10. Actual changes represented by this feature branch

This is a source-level summary of changes present in the branch relative to `main`, not a claim that all features passed acceptance testing.

- Practitioner schedule and admin booking schedule visibility improvements; practitioner availability/time-slot handling.
- Booking cancellation, 36-hour rescheduling, and practitioner/customer intro-chat experience.
- Practitioner and seller onboarding/approval, admin application management, practitioner profile/pricing controls, and seller management improvements.
- Store checkout, order fulfillment, stock accounting, promotions, wallet and payout lifecycle changes.
- Refund handling and fee-aware wallet reversal.
- Event/course registration integrity and community moderation/access controls.
- Journal multi-mood/custom mood persistence support.
- Payment and checkout input validation, Razorpay webhook signature validation, duplicate cart-line consolidation, payout and bank-detail validation, and reduced sensitive request logging.
- Focused critical-payment regression tests and GitHub Actions quality workflow.
- Staging environment template and staging migration/E2E readiness documentation.

Do not publish these as customer-facing release notes until the owner confirms the included feature set, UX completion, and acceptance results for the exact release candidate.

## 11. Draft release notes (conditional; verify against tested build)

**Nature's Grace — release candidate notes**

- Improved practitioner availability and booking schedule management.
- Added booking cancellation, rescheduling, and pre-session customer/practitioner chat workflows.
- Improved practitioner and seller onboarding and administrative management.
- Strengthened store checkout, inventory, promotion, refund, and wallet accounting workflows.
- Improved event/course registration and community moderation controls.
- Improved journal mood selection and persistence.
- Added validation and regression coverage for critical payment and checkout inputs.

These notes describe code changes found in the branch. They do not imply that every workflow has passed staging or production acceptance testing.

## 12. Known limitations, unfinished work, and verification gaps

### Confirmed from source/configuration

- Seller and practitioner payout dispatch routes explicitly queue payouts for manual admin transfer. A fully automated payout-provider integration is not established by these routes.
- The EAS submit production profile is empty; App Store Connect submission settings/credentials are not documented there.
- No explicit Android target SDK is pinned in `app.json`; verify the generated AAB target API.
- The committed automated tests are focused validation tests, not a complete mobile/API integration or end-to-end suite.
- The quality workflow does not build a native Android or iOS binary; it runs tests, typecheck, lint, API bundle, and Expo web export.

### Not established during this review

- Whether any current production or staging user-facing bug remains.
- Whether all Supabase migrations have been applied to the intended live database.
- Whether booking, payment, refund, store, promo, payout, notifications, chat, and role access workflows pass end-to-end.
- Whether email and push providers are configured and delivering.
- Whether production API hosting is healthy and has rollback/monitoring configured.
- Whether the currently published Android artifact is built from this branch.
- Whether any iOS build has ever been created or uploaded.

Treat these as validation tasks, not confirmed defects.

## 13. CI and build verification record

Repository workflow: `.github/workflows/quality.yml`.

It is configured to run:
1. `npm ci`
2. `npm test`
3. `npm run check:types`
4. `npm run lint`
5. `npm run server:build`
6. `npx expo export --platform web --output-dir web-build`

**Review result:** no successful check/status was visible for the reviewed branch head in the connected repository status response. No local checkout was available to execute the commands in this review. Therefore:
- Android native build: not run / not verified.
- API build: not run / not verified.
- Test suite: not run / not verified.
- Typecheck: not run / not verified.
- Lint: not run / not verified.
- Expo web export: not run / not verified.
- CI pass: not established.

A later green CI run must be attached to the exact release commit, not merely another commit on the branch.

## 14. Deployment and release operations

No automatic deployment workflow or hosting-provider manifest was verified in the reviewed files. The following process is therefore a handover outline, not an executable provider-specific runbook:

1. Identify and document the API hosting provider, project, runtime, build command, start command, domain, environment configuration, logs, health checks, and rollback method.
2. Confirm the production Supabase project and migration ledger with the database owner.
3. Confirm Razorpay live account ownership, webhook URL, and secret rotation process with the client; do not put secrets in this repository.
4. Confirm EAS project/account ownership and signing credentials.
5. Build from a frozen release commit and retain artifact/build logs.
6. Run the approved staging/UAT checklist and obtain written client acceptance.
7. Obtain explicit approval for each production action separately: database migration, API deployment, Android Play Console rollout, and iOS App Store submission.
8. After an approved release, monitor API errors, payment/webhook failures, crashes/ANRs, refunds, payouts, and customer support.
9. Keep rollback instructions and previous known-good artifacts available.

No production deployment, app-store upload, merge, or database operation was performed in this task.

## 15. Client handover checklist

- [ ] Client has GitHub access to `ipsitalimi/natures-grace-clean`.
- [ ] Client has access to the correct branch and knows `feature/ng-master-changes` is not merged into `main`.
- [ ] Client confirms exact release commit SHA and whether to continue from feature branch or a new release branch.
- [ ] Client has EAS account/project access and Android signing/upload key ownership.
- [ ] Client has Play Console account access and confirms current listing/release state.
- [ ] Client has Supabase organization/project access, database backups, Auth settings, storage settings, and migration history.
- [ ] Client has API hosting account access, environment secret ownership, logs/monitoring, and rollback instructions.
- [ ] Client has Razorpay account access and knows the webhook/payment reconciliation process.
- [ ] Client has Resend/Firebase/Expo access if those services are enabled.
- [ ] Client has Apple Developer and App Store Connect access if iOS release is intended.
- [ ] Client has test identities and role-based acceptance test scripts.
- [ ] Client has privacy policy, terms, support contact, data deletion process, and store listing assets.
- [ ] All access is transferred through the providers' official invitation/ownership-transfer mechanisms. Do not send passwords or secrets in email or this document.

## 16. Useful repository files

- `package.json` — scripts and dependencies.
- `app.json`, `app.config.js` — Expo app identity and dynamic configuration.
- `eas.json` — EAS build/submit profiles.
- `.env.example`, `.env.staging.example` — environment variable names and placeholders.
- `.github/workflows/quality.yml` — CI quality workflow.
- `server/index.ts`, `server/routes.ts`, `server/routes/` — API startup and routes.
- `server/services/` — payment, fulfillment, wallet, notification and domain services.
- `supabase/migrations/` — database migration history.
- `docs/STAGING_READINESS.md` — staging setup, migration order, and E2E test plan.
- `tests/critical-payments-validation.test.ts` — focused payment/checkout validation tests.

---

**Handover caveat:** this document is based on repository inspection and available project history. It does not transfer account ownership, credentials, legal rights, production access, or operational responsibility. The client should validate access with each service provider and have a new developer independently review the release candidate before production actions.
