# ChanloPay 2.0 — Implementation Roadmap & Architecture Plan

This document plans the backend-heavy and infrastructure features from the ChanloPay 2.0 brief. The UI foundation (premium rebrand, redesigned payment flow, premium dashboard, analytics) has already been implemented in this codebase. What follows is a phased, realistic plan for everything that needs servers, paid APIs, or new data models.

**Current stack:** Next.js 15 (App Router) · React 19 · Firebase (Auth + Firestore) · Firebase App Hosting · Genkit + Google Gemini · Tailwind + shadcn/ui.

**Legend — effort:** S (≤1 day) · M (2–4 days) · L (1–2 weeks) · XL (multi-week). **Cost** flags anything needing a paid third party.

---

## Guiding principles

1. **Data model first.** Most 2.0 features are unlocked by extending the Firestore schema; ship schema + security rules before UI.
2. **Keep the guest flow zero-login.** Guests should never have to authenticate. Only hosts and team members log in.
3. **Server-only secrets.** Payment verification, WhatsApp, and email keys live in Firebase secrets / server code, never in the client bundle.
4. **Progressive enhancement.** Every premium feature degrades gracefully if a third-party service is unavailable.

---

## Proposed Firestore schema (target)

```
hosts/{hostId}                     # existing: name, mobile, upi[], role, plan, locale
  events/{eventId}                 # extend: coverImage, hostName, brideName, groomName,
                                   #   eventType, themeColor, status, paymentNote, upiId, slug
    transactions/{txnId}           # extend: mobile, relationship, blessing, verified, refId
    guestbook/{entryId}            # NEW: name, message, photoUrl, createdAt
  team/{memberUid}                 # NEW: role (owner|manager|helper|volunteer), invitedBy
  notifications/{noticeId}         # NEW: type, payload, read, createdAt
  activityLog/{logId}              # NEW: actorUid, action, target, ts
publicEvents/{slug}                # NEW: mirror of event public fields for /event/{slug}
adminConfig/*                      # NEW: banners, feature flags, app version
```

Security rules extend the current model: `team` membership grants scoped access via a `hasRole()` helper; `publicEvents` is world-readable but only writable by Cloud Functions.

---

## Phase 1 — In-repo, no paid services (do next)

These need only Firestore + client code and are the natural continuation of the UI work already shipped.

| Feature | Effort | Notes |
|---|---|---|
| **Rich event fields** (cover image, bride/groom/host names, event type, theme color, status, payment note) | M | Extend `Event` type + event create/edit forms. Cover image via Firebase Storage. Per-event `themeColor` overrides CSS variables at render. |
| **Multiple UPI IDs per host** | S | `upi: string[]`; picker in Settings; event chooses which UPI to use. |
| **Digital invitation page** | M | New `/i/{hostId}/{eventId}` route: banner, couple photos, date, Google Maps embed, RSVP button, and the existing pay QR. Shareable. |
| **QR Center** | M | One component that renders the event pay-URL at multiple sizes/templates (large, mini, table tent, wedding stand, social) and exports each as PNG/PDF using the existing print pipeline. |
| **Export Center** | S–M | Consolidate the existing PDF/Excel export into a dedicated page adding CSV, guest list, collection summary, and an analytics-report PDF. |
| **WhatsApp/Share links** | S | `wa.me?text=` deep links for receipts, invitations, thank-you notes (already prototyped on the success screen). No API cost — opens the user's WhatsApp. |
| **Digital guestbook** | M | `guestbook` subcollection; guests leave a message/photo on the success screen; host views a wall. |
| **Basic role field** | S | Add `role` to host/team docs and gate UI; full team invites are Phase 3. |

---

## Phase 2 — Real payment verification (the trust upgrade)

**Problem today:** the guest self-reports success by tapping "Confirm & Save", so records can be inflated. Real verification needs a Payment Service Provider (PSP).

| Option | Effort | Cost | Notes |
|---|---|---|---|
| **Razorpay / Cashfree / PhonePe PG payment links + webhooks** | L | Cost (MDR per txn, KYC) | Server creates an order; PSP handles UPI; a **Cloud Function webhook** marks the transaction `verified: true`. This is the only way to *guarantee* a payment happened. |
| **UPI Collect / Intent with PSP** | L | Cost | Same idea, smoother in-app UX. |
| **Interim: "pending → host verifies"** | S | Free | Keep direct-UPI, but new records start `status: 'Pending'`; host taps to confirm receipt in their UPI app. No PSP, but removes blind trust. Recommended stopgap. |

**Architecture:** `POST /api/pay/create` (server) → PSP order → client opens UPI → PSP → `POST /api/pay/webhook` (verify signature) → update Firestore. Signature secret in Firebase secrets.

---

## Phase 3 — Team access & roles (RBAC)

| Piece | Effort | Notes |
|---|---|---|
| Team invites | M | Host invites by email; invitee signs in; a Cloud Function writes `team/{uid}` with a role. |
| Role permissions | M | `owner` (all), `manager` (events + records), `helper` (record entries), `volunteer` (view + manual entry only). Enforced in **both** security rules and UI. |
| Activity log | S | Write to `activityLog` on sensitive actions; show in an audit view. |

---

## Phase 4 — Notifications (needs background compute + paid channels)

Firebase App Hosting runs the Next.js server, but scheduled/event-driven work belongs in **Cloud Functions for Firebase** (add to the project).

| Channel | Effort | Cost | Mechanism |
|---|---|---|---|
| **Push (web)** | M | Free | Firebase Cloud Messaging + service worker; requires user permission. |
| **Email receipts / daily summary** | M | Cost (low) | Resend / SendGrid via a Cloud Function; triggered on new transaction (receipt) and on a schedule (daily digest). |
| **WhatsApp *automated* receipts** | L | Cost + approval | WhatsApp Business Platform (Meta) via Twilio/Gupshup/360dialog. Requires a verified business, message templates, and per-message fees. (Distinct from the free `wa.me` share links in Phase 1.) |
| **Milestone / event reminders** | S | Free–low | Scheduled Cloud Function checks thresholds and fans out via the channels above. |

---

## Phase 5 — AI Assistant (extends existing Genkit setup)

The app already uses Genkit + Gemini (fraud analysis, event ideas). Extend it:

| Capability | Effort | Notes |
|---|---|---|
| Thank-you & invitation text generation | S | New Genkit flows; wire into the invitation and success screens. |
| Suggested payment amounts | S | Flow using event context + past contributions. |
| Collection insights / anomaly summaries | M | Feed aggregated analytics into a flow that returns plain-language insights. |
| Chat FAQ assistant | M | Genkit flow + small RAG over a static FAQ doc. |

All are server actions (`'use server'`) so the API key stays server-side. Cost = Gemini token usage.

---

## Phase 6 — Public event websites & custom domains

| Piece | Effort | Cost | Notes |
|---|---|---|---|
| `chanlopay.com/event/{slug}` landing pages | M | Free | Public SSR route reading `publicEvents/{slug}`; slug generated on event create. |
| Custom event domains | L | Cost (domains, TLS) | Requires wildcard domain handling + a mapping table + automated TLS (Firebase Hosting custom domains or a proxy). Enterprise/premium tier. |

---

## Phase 7 — Admin & Business dashboards

A separate, role-gated area (`/admin`) for platform operators.

| Piece | Effort | Notes |
|---|---|---|
| Platform metrics (users, events, revenue, success rate, top cities, growth, retention) | L | Requires cross-host aggregation → maintain rollup counters via Cloud Functions (don't scan all docs on read). |
| User/event verification, support tickets, feedback | M | New collections + moderation UI. |
| Banner management, feature flags, version control, system logs | M | `adminConfig` collection read by the client at boot. |

**Key architectural note:** admin analytics must be powered by **aggregation counters** updated on write (Cloud Functions), not by reading every document — Firestore reads are billed and unbounded scans won't scale.

---

## Phase 8 — Internationalization (multi-language)

| Piece | Effort | Notes |
|---|---|---|
| English / Hindi / Gujarati | M | `next-intl` or `next-i18next`; extract all strings to message catalogs; auto-detect via `Accept-Language`, with a manual switcher stored on the host profile (`locale`). |

This touches every screen, so do it once the UI has stabilized to avoid re-extracting strings repeatedly.

---

## Phase 9 — Future / R&D (roadmap, not scheduled)

NFC tap-to-pay · voice-assisted payment · event photo gallery · vendor payment tracking · donation/fundraising mode · wedding budget planner · calendar integration · live TV/projector display · advanced downloadable reports. Each is a self-contained epic; revisit after Phases 1–5 prove traction.

---

## Recommended sequence

1. **Phase 1** (rich events, invitation page, QR center, export center, guestbook) — highest value per effort, no external cost.
2. **Phase 2 interim** (pending → host-verify) immediately; full PSP verification when a provider/KYC is ready.
3. **Phase 5 AI** flows (cheap wins on the existing Gemini integration).
4. **Phase 3 roles**, then **Phase 4 notifications**, then **Phase 6/7/8** as the product scales.

## New dependencies this roadmap introduces

- **Cloud Functions for Firebase** (notifications, webhooks, aggregation, public-event mirroring)
- **Firebase Storage** (cover images, couple photos, guestbook media)
- A **payment provider** (Razorpay / Cashfree / PhonePe PG) — Phase 2
- An **email provider** (Resend / SendGrid) — Phase 4
- A **WhatsApp BSP** (Twilio / Gupshup / 360dialog) — Phase 4 (automated messaging only)
- **next-intl** (or next-i18next) — Phase 8

---

*Prepared as the planning half of the ChanloPay 2.0 upgrade. The UI half (rebrand, payment flow, dashboard, analytics) is already live in the codebase.*
