# Supabase setup (Phase 1)

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Open **Project Settings → API** and copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in the two `EXPO_PUBLIC_*` values, then restart Expo:

```bash
npx expo start -c
```

Without these variables the app keeps using **mock login** (legacy demo emails).

## 3. Run the database migration

In the Supabase dashboard, open **SQL Editor** and run the full script:

`supabase/migrations/001_phase1_schema.sql`

This creates:

- `profiles` (roles, status, linked to `auth.users`)
- `platform_settings` (persisted admin config)
- `practitioners`, `sellers`, `products`, `events`, `resources`, `prompts`, `notifications`
- RLS policies and signup trigger

## 4. Create your first admin

1. Sign up in the app with your admin email (or create a user in **Authentication → Users**).
2. In SQL Editor:

```sql
UPDATE public.profiles
SET role = 'Admin'
WHERE email = 'your-admin@email.com';
```

3. Log out and log in again — you should land on **Admin Dashboard**.

## 5. Optional: disable email confirmation (dev only)

**Authentication → Providers → Email** → turn off “Confirm email” for faster local testing.

## What Phase 1 wires to Supabase

| Feature | Backend |
|--------|---------|
| Login / signup / password reset | Supabase Auth |
| Role-based routing | `profiles.role` |
| Suspend user | `profiles.status` |
| Maintenance & platform settings | `platform_settings` |
| Admin user list & role changes | `profiles` |
| Homepage / approvals / meta (admin edits) | `platform_settings` JSON columns |

## Phase 2: Content tables

Run the second migration in **SQL Editor**:

`supabase/migrations/002_phase2_reviews_rls.sql`

This adds the `reviews` table and relaxes read policies for public catalog content.

`supabase/migrations/003_schema_metadata_columns.sql`

Adds `metadata` JSONB on `products` and `practitioners` (required by app seed/services).

`supabase/migrations/004_seller_orders.sql`

Adds `orders` and `order_items` for seller order management (Phase A).

`supabase/migrations/005_seller_wallet.sql`

Adds `seller_wallets`, `wallet_transactions`, and `seller_payouts` for seller earnings and payout tracking (RazorpayX fields reserved).

`supabase/migrations/006_payout_completion.sql`

Adds `failure_reason`, `last_webhook_event`, and a unique index on `razorpay_payout_id` for webhook idempotency.

### Phase B: Seller payout completion (RazorpayX)

1. Run migration `006_payout_completion.sql` in the SQL Editor.
2. Add server env vars (see `.env.example`): `SUPABASE_SERVICE_ROLE_KEY`, optional `RAZORPAYX_*`, `PAYOUT_DEV_AUTO_COMPLETE=true` for local testing.
3. Start the API: `npm run server:dev` (default `http://localhost:5000`).
4. Set `EXPO_PUBLIC_API_URL` in `.env` so the app can call `POST /api/payouts/:id/dispatch` after withdraw.
5. Register RazorpayX webhook URL: `https://<your-api-host>/api/webhooks/razorpayx` with events `payout.processed`, `payout.failed`, `payout.initiated`.

**Lifecycle:** Withdraw → `seller_payouts` Pending + ledger debit → dispatch → RazorpayX (or dev auto-complete) → webhook updates Completed/Failed → wallet `pending_payout` and balances reconcile on reload.

`supabase/migrations/007_practitioner_bookings.sql`

Adds practitioner offerings, availability, bookings, session history, wallets, ledger transactions, and payouts (service-based lifecycle; mirrors seller wallet pattern).

**Practitioner flow:** Book session → Paid booking → held earnings → mark session Completed → available balance → withdraw → RazorpayX dispatch/webhook.

Run migration `007` in SQL Editor, then use the app as a signed-in Practitioner or User. API routes: `POST /api/practitioner-payouts/:id/dispatch` (same env as seller payouts).

`supabase/migrations/008_practitioner_dashboard.sql`

Adds availability `metadata` / `timing_mode`, `reviews.practitioner_id` for dashboard review matching.

**Phase B practitioner cleanup:** Offering availability persists from Add/Edit Offering; home dashboard (weekly sessions, monthly growth, reviews, rating) reads from Supabase; booking checkout uses `POST /api/bookings/checkout/create-order` and `confirm` (dev auto-confirm without Razorpay keys).

`supabase/migrations/009_discussions.sql`

Adds `discussion_threads` and `discussion_replies` with visibility/moderation fields and RLS (authenticated read; insert for signed-in users; update by author or admin).

**Phase A community:** Threads and replies load via `DataContext` on all Community tabs (User, Seller, Practitioner) and Admin Community moderation. Replies persist through `AddReplyScreen`; reload keeps data when migration `009` is applied. Admin Community **Active Members** is a live count from `profiles` (`status = 'Active'`, `role` in User / Practitioner / Seller) via `fetchActiveCommunityMemberCount()` in `profileService`; it is not mock data and survives reload when Supabase is configured.

`supabase/migrations/010_journal_gratitude.sql`

Adds `journal_entries` (body, mood, prompt, entry_date) and `gratitude_entries` (body, `is_public`, author display name). RLS: journal is owner-only; gratitude is owner CRUD plus authenticated read of public rows for the community feed.

**Phase A journal/gratitude:** `JournalContext` and `GratitudeContext` load per-user data after sign-in. Journal editor, gratitude log, community feed, and monthly overview read from the same Supabase source.

Run migration `010` in the SQL Editor before testing journal or gratitude features.

`supabase/migrations/011_cart.sql`

Adds `cart_sessions` (delivery option, order note, checkout status, subtotal/delivery/total) and `cart_items` (product reference, quantity, price/name snapshots). RLS: owner-only per authenticated user.

**Phase A cart/checkout:** `CartContext` persists add/update/remove and checkout prefs; `CartScreen` and store screens share the same cart; checkout creates orders via existing `OrdersContext` / `orders` tables. After migrations **`021`** + **`022`**, cart sessions store applied seller/global promo refs (`seller_promo_id`, `platform_promo_id`, shared `promo_code`, `promo_discount`) and checkout validates both promo systems in `cartService.applyPromoCode`.

Run migration `011` before testing cart persistence.

`supabase/migrations/012_order_payments.sql`

Adds `razorpay_order_id` and `razorpay_payment_id` on `orders`.

**Phase A payments:** Store checkout creates a **Pending** order, opens Razorpay (or dev auto-confirm without keys), verifies signature on the API server, then marks the order **Paid**. Cart clears only after successful payment.

Server routes: `POST /api/store/checkout/create-payment`, `POST /api/store/checkout/confirm-payment`. Requires `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `EXPO_PUBLIC_RAZORPAY_KEY_ID`, and `react-native-razorpay` in a dev build.

`supabase/migrations/013_event_registrations.sql`

Adds `event_registrations` (attendee contact fields, `Registered` / `Cancelled` / `Waitlist`, optional payment columns for future paid events). RLS: users read/insert/update own rows; admins read/update all.

**Phase A event registrations:** `EventRegistrationsContext` loads after sign-in (all active registrations for Admin, own rows for Users). `EventRegistrationScreen` persists register/cancel; `EventDetailScreen` shows registered state; Admin Community lists attendee counts and names per event.

Run migration `013` before testing event registration persistence.

`supabase/migrations/014_support_tickets.sql`

Adds `support_tickets` (subject, body, status, priority, assignee, contact fields, serial `ticket_number`) and `ticket_messages` (staff/user replies). RLS: users read/create own tickets; admins read/update all tickets and post staff replies.

**Phase A support:** `SupportTicketsContext` loads after sign-in (all tickets for Admin, own for Users). `ContactScreen` creates tickets and lists the user’s tickets; Admin Support manages status and replies.

Run migration `014` before testing support ticket persistence.

`supabase/migrations/015_favorite_items.sql`

Adds `favorite_items` (user, `item_type`, `item_id`, display snapshot fields, optional `item_db_id`). RLS: users read/insert/delete own rows; admins can read all.

**Phase A favorites:** `FavoritesContext` loads after sign-in. `FavoritesScreen` lists saved items from Supabase; practitioner profiles toggle favorite via the heart control.

Run migration `015` before testing favorites persistence.

`supabase/migrations/016_payment_methods.sql`

Adds `payment_methods` (provider, token reference id, brand, last4, expiry metadata, `is_default`). No PAN/CVV stored. RLS: users CRUD own rows; admins can read.

**Phase A payment methods:** `PaymentMethodsContext` loads after sign-in. Payment Methods screen lists saved cards, add/remove/set-default persist to Supabase (masked metadata only).

Run migration `016` before testing payment method persistence.

`supabase/migrations/017_reviews_ownership.sql`

Extends `reviews` with `user_id`, `target_type`, `product_id`, `service_label`, `booking_id`, and user insert/update/delete policies. Practitioner aggregates sync on moderation approval.

**Phase A reviews:** `ReviewsContext` powers My Reviews, session review submission, and live practitioner ratings. Admin moderation uses `PlatformConfig` + `reviewsService` (same `reviews` table).

Run migration `017` before testing review submission and My Reviews.

`supabase/migrations/018_reviews_seller_product.sql`

Adds `seller_reply`, `order_id`, unique `(user_id, order_id)` for product reviews, and seller RLS to read/update reviews on their catalog products.

**Phase A seller product reviews:** `ReviewsContext` loads seller review lists and store stats for Seller role; `SellerReviewsScreen` lists product reviews and persists replies; `StoreProductDetailScreen` shows approved reviews and accepts product review submission; seller home/drawer/analytics show live store rating from approved product reviews.

Run migration `018` before testing seller reviews and product review submission.

**Phase A seller analytics:** `SellerAnalyticsContext` aggregates revenue, sales, orders-this-week, weekly/monthly chart points, and category breakdown from `orders` / `order_items`, plus wallet summary from `seller_wallets`. Seller Home, Drawer, and Analytics read the same context; wallet balance also syncs via `WalletContext`.

Uses existing migrations `004` (orders), `005` (seller wallet). No new migration required for analytics aggregates.

`supabase/migrations/019_content_reports.sql`

Adds `content_reports` for the admin moderation queue (reporter, target type/id, reason, status, moderator resolution). RLS: users insert own reports; admins read/update all.

**Phase A moderation:** `ModerationContext` powers the Admin Community flagged queue; dismiss/remove/ban persist to `content_reports` and apply actions on `discussion_threads`, `discussion_replies`, and `reviews`. Admin Reviews “Flag” also enqueues a report.

Run migration `019` before testing moderation queue persistence.

`supabase/migrations/020_activity_log.sql`

Adds `activity_log` for admin audit entries (actor, action type, description, target references, optional before/after JSON, metadata). RLS: admins read/insert/delete only.

**Phase A activity log:** `PlatformConfig.logActivity` persists admin actions to Supabase; Admin Dashboard **Recent Activity** reads the same `activity_log` table (replaces mock `adminActivities`).

Run migration `020` before testing activity log persistence.

**Phase A admin upcoming sessions:** `AdminSessionsContext` loads the Admin Dashboard **Upcoming Sessions** list from `practitioner_bookings` (status `Pending` or `Confirmed`), with practitioner names from `practitioners`. Same source as practitioner booking flows (`PractitionerProvider` / `BookingContext`).

Uses existing migration `007` (`practitioner_bookings`). No new migration required.

`supabase/migrations/021_seller_promos.sql`

Adds **`seller_promos`** (per-seller code, `percentage` / `fixed` discount, `min_order`, usage limit, optional `expires_at`, status `Active` | `Paused` | `Expired`). Extends **`cart_sessions`** with applied promo fields and **`orders`** with `seller_promo_id` + `promo_discount` so paid checks match stored totals. RLS: sellers/admins manage rows; signed-in users may read promos that are redeemable (active window + usage headroom) or rows currently attached to their cart; service role bumps **`usage_count`** after successful store payment confirm.

**Phase A seller promos:** `SellerPromotionsScreen` CRUD + pause/delete via `sellerPromosService`; `CartScreen` applies codes against the same table (single-seller cart); `ordersService.createOrder` persists discount + promo reference; `confirmStoreOrderPayment` increments usage when `SUPABASE_SERVICE_ROLE_KEY` is configured.

Run migration `021` before testing seller promo persistence or cart promo application.

`supabase/migrations/022_platform_promo_codes.sql`

Adds **`platform_promo_codes`** for admin/global promotions (code/title, discount type/value, `min_order`, `usage_limit`, optional `starts_at`/`expires_at`, status `Active` | `Paused` | `Expired`). Extends `cart_sessions` / `orders` with `platform_promo_id`. RLS: admins manage all rows; signed-in users can read currently redeemable rows (or one currently attached to their own cart for revalidation).

**Phase A admin promo codes:** `AdminPromoCodesScreen` reads/writes `platform_promo_codes` via `platformPromosService` (create + activate/deactivate + delete). `CartScreen` promo apply can resolve either seller-owned codes (`seller_promos`) or global admin codes (`platform_promo_codes`) from the same promo input. On successful store payment confirmation, server increments `usage_count` for whichever promo reference is attached to the order.

Run migration `022` before testing admin promo persistence.

`supabase/migrations/023_seller_promo_campaigns.sql`

Extends **`seller_promos`** with **`promo_kind`** (`standard` | `flash_sale` | `bundle`), optional **`starts_at`**, and **`metadata`** JSON (bundle label). Updates redeemable SELECT policy to honor start windows.

**Phase A seller flash / bundle cards:** `SellerPromotionsScreen` flash-sale and bundle cards create and manage rows in the same `seller_promos` table; checkout promo apply reuses existing cart validation (codes from flash/bundle campaigns work like standard seller codes).

Run migration `023` before testing flash sale or bundle persistence.

`supabase/migrations/024_help_faq_support.sql`

Adds **`faq_categories`**, **`faq_items`** (question/answer, `sort_order`, `is_active`), and **`support_copy`** (key/value body for editable strings). RLS: public read for active FAQs and all support_copy rows (**anon + authenticated**); admins full CRUD on categories/items and inserts/updates/deletes on `support_copy`.

**Phase A help / FAQ:** User **Help**, **Support** hub titles, **Contact** info strip, ticket submit confirmation, and **About** load from **`support_copy`** via `helpSupportService` (no bundled marketing fallback strings). **Settings** → About row uses the same key as the Support hub About card (`support_hub_about_title`). **AdminSupportScreen** exposes FAQ CRUD unchanged, plus sectioned editors for **`support_copy`** (hub cards, contact fields, About body, confirmation message). The **Avg Response** stat chip is computed from **`support_tickets`** + **`ticket_messages`** (first staff reply) via RPC **`admin_first_response_stats`** (migration **`026`**); optional fallback text uses DB key **`avg_response_label`** when there is no sample or the RPC fails (not edited in-app).

Seed data includes a General category plus merged FAQ entries and default `support_copy` rows (`support_email`, `ticket_submit_confirmation`, `about_intro`, hub card texts, etc.) once migrations `024` + `025` are applied.

Run migration `024` before testing persistent help center FAQ + copy.

`supabase/migrations/025_ticket_submit_confirmation_copy.sql`

Inserts **`ticket_submit_confirmation`** into **`support_copy`** if missing so the Contact success message has a seeded default editable from Admin Support.

Run migration `025` after `024` for the ticket confirmation key.

`supabase/migrations/026_admin_first_response_stats.sql`

Adds **`admin_first_response_stats()`** (SECURITY DEFINER, `authenticated` EXECUTE): returns JSON `{ avg_hours, sample_count }` for the average hours from each ticket’s **`created_at`** to the first **`ticket_messages`** row with **`author_role = 'Staff'`**; non-admins receive a forbidden-shaped payload. **`AdminSupportScreen`** reads this for the **Avg Response** chip (`fetchAdminFirstResponseStats`).

Run migration **`026`** after **`025`** before expecting a live average on Admin Support.

`supabase/migrations/027_about_contact_copy_keys.sql`

Seeds **`support_copy`** keys for **About** app name / version line / mission heading and **Contact** info-row labels, section headings, form labels, placeholders, and send button text. **`AboutScreen`** and **`ContactScreen`** read these keys; **Admin Support** edits them in the existing copy editor sections (“About page”, “Contact page (info strip)”, “Contact page (form & sections)”).

Run migration **`027`** after **`024`** (or anytime after `support_copy` exists) so new installs get defaults; existing projects get rows via `ON CONFLICT DO NOTHING`.

`supabase/migrations/028_seller_storefront.sql`

Adds **`sellers.philosophy`** and **`sellers.storefront_settings`** (JSON: accent color, banner theme index, featured product UUIDs). **`SellerHomeScreen`** and **`SellerStoreCustomizationScreen`** read/write via `sellerStorefrontService`. App brand name/version display (Home, About, Settings About row, Admin Settings read-only) uses **`support_copy`** keys `about_app_name` / `about_app_version` (editable in Admin Support → About page).

Run migration **`028`** after **`027`** for seller storefront persistence.

### What Phase 2 wires to Supabase

| Content | Table | App layer |
|--------|-------|-----------|
| Events | `events` | `DataContext` → Community, Admin Community |
| Active member count (admin) | `profiles` | `profileService.fetchActiveCommunityMemberCount()` → Admin Community stat |
| Products | `products` | `DataContext` → Store, Seller catalog, Admin Store |
| Resources | `resources` | `DataContext` → Resources, Admin Resources |
| Practitioners | `practitioners` | `DataContext` → Practitioner screens, Admin Practitioners |
| Prompts | `prompts` | `GratitudeContext` → Guided Reflection, Admin Prompts |
| Notifications | `notifications` | `PlatformConfig` → Admin broadcast |
| Reviews | `reviews` | `PlatformConfig` → Admin Reviews |
| Discussion threads | `discussion_threads` | `DataContext` → Community, Admin Community |
| Discussion replies | `discussion_replies` | `DataContext` → Thread, Add Reply |
| Journal entries | `journal_entries` | `JournalContext` → Journal, Mood, Monthly Overview |
| Gratitude entries | `gratitude_entries` | `GratitudeContext` → Gratitude log, community feed |
| Orders | `orders`, `order_items` | `OrdersContext` → seller orders, store checkout (promo ref columns after `021` + `022`) |
| Seller promos | `seller_promos` | `sellerPromosService` → Seller Promotions; `cartService`/`CartContext` → cart apply; `ordersService` + server confirm → usage count |
| Global promo codes (admin) | `platform_promo_codes` | `platformPromosService` → Admin Promo Codes; `cartService`/`CartContext` apply flow; server confirm usage |
| Cart sessions | `cart_sessions` | `CartContext` → Store, Cart, Checkout (`promo_*` fields after `021` + `022`) |
| Cart items | `cart_items` | `CartContext` → line items with price snapshots |
| Event registrations | `event_registrations` | `EventRegistrationsContext` → Event detail/register, Admin Community attendees |
| Support tickets | `support_tickets` | `SupportTicketsContext` → Contact, Admin Support |
| Help / FAQs & copy | `faq_categories`, `faq_items`, `support_copy` | `helpSupportService` → Help, Support hub, Contact, About, Home header, Settings support rows; Admin Support FAQ + copy editors |
| Seller storefront | `sellers` (`store_name`, `description`, `philosophy`, `storefront_settings`) | `sellerStorefrontService` → Seller Home title, Store Customization |
| Admin first response avg | `support_tickets`, `ticket_messages` | RPC `admin_first_response_stats` → Admin Support **Avg Response** chip (fallback key `avg_response_label` in `support_copy`) |
| Ticket messages | `ticket_messages` | `SupportTicketsContext` → replies on tickets |
| Favorite items | `favorite_items` | `FavoritesContext` → Favorites screen, practitioner profiles |
| Payment methods | `payment_methods` | `PaymentMethodsContext` → Payment Methods screen |
| Reviews | `reviews` | `ReviewsContext` + `PlatformConfig` → My Reviews, Session detail, Admin Reviews, practitioner ratings, seller reviews, product detail reviews |
| Seller analytics | `orders`, `order_items`, `seller_wallets` | `SellerAnalyticsContext` → Seller Home, Analytics, Drawer metrics |
| Content reports | `content_reports` | `ModerationContext` → Admin Community flagged queue |
| Activity log | `activity_log` | `PlatformConfig` → Admin Dashboard recent activity, all `logActivity` calls |
| Admin upcoming sessions | `practitioner_bookings`, `practitioners` | `AdminSessionsContext` → Admin Dashboard upcoming sessions |

Run migrations `009`–`028` in the SQL Editor before testing those features (FAQs + support copy through `024`/`025`/`027`, live Avg Response after `026`, seller storefront after `028`).

### Production fixes (`046_production_fixes.sql`)

Run after `042`–`045`. Adds:

- `pending_booking_checkouts` — survives app crash between Razorpay pay and confirm
- `account_deletion_requests` + `request_account_deletion()` RPC
- `admin_provision_user_role()` — full Seller/Practitioner provisioning when admin changes roles

**Payment webhook:** Register `https://<your-api-host>/api/webhooks/razorpay` with event `payment.captured`. Set `RAZORPAY_WEBHOOK_SECRET` (or reuse `RAZORPAYX_WEBHOOK_SECRET`) on the API server.

### Storage & session links (`047_storage_meeting_links.sql`)

Run after `046`. Adds:

- Supabase Storage buckets `product-images` (public) and `application-documents` (private) with RLS
- `practitioners.meeting_link` and `practitioner_bookings.meeting_link` (copied at booking time)

Sellers upload product images from **Add Product**; applicants upload documents on seller/practitioner application screens.

**Account deletion API:** `POST /api/account/request-deletion` (bearer auth). Admins finalize with `POST /api/admin/users/:id/complete-deletion`.

### Still mock (Phase 3+)

- Product engagement metrics on Analytics (views/saves/cart adds from product metadata, not order-derived)
- Storefront “customers explored today” visit counter (no tracking table yet; hero line removed)
- Practitioner weekly/monthly chart mock series on home (sessions list and wallet are real)
- Real RazorpayX fund accounts per seller/practitioner (uses env `RAZORPAYX_FUND_ACCOUNT_ID` until KYC is wired)
- Live Razorpay checkout SDK (bookings use mock `rzp_mock_*` payment id when confirming)
- End-user “Report” buttons on discussions/replies in the community UI (admins can flag via Reviews; `submitReport` API exists)
- Real user ban/suspend from moderation queue (ban action resolves the report only)
- New thread creation from the app (seed + admin moderation only; no create-thread UI)
- Journal entry edit UI (update/delete service exists; list view is read-only)
- Standalone mood check-ins without a journal entry (mood is stored on entries only)
- Guest/anonymous cart (requires sign-in when Supabase is configured)
- Pending store orders left in DB if user abandons after order create (no auto-cancel job)
- Event paid checkout (registration stores `payment_status` / Razorpay ids; UI does not charge yet)
- Support FAQ content on Admin Support (static copy, not in DB)
- Priority / assignee editing in Admin UI (columns exist; UI shows priority only)
- Product / resource / event favorites (schema supports types; only practitioner toggle is wired in UI)
- Razorpay saved-card tokenization at add time (app stores client-generated token refs + masked fields until gateway vault is wired)
- Checkout charging a saved Razorpay token directly (cart shows default saved card; payment still opens Razorpay checkout)
- Post-order product review entry from Order Confirmation (product detail supports review without `order_id`; unique per order when `order_id` is set)
- Edit review UI on My Reviews (service supports update/delete for Pending rows)
- Automatic booking/session activity entries (only explicit admin `logActivity` calls persist today)
- Payments expansion
