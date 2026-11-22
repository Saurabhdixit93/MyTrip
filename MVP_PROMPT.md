# MVP Prompt — paste into Claude Code (after placing CLAUDE.md in the repo root)

```
Read CLAUDE.md first and follow it strictly.

Build the MVP of "TripSplit" (pick a catchy final brand name and use it everywhere): a mobile-first, installable PWA in Next.js where a Coach creates a group trip, members add expenses, and dues are paid to the Coach via UPI.

Before coding: show me a short plan, a text ERD of the DB schema, and your assumptions. Then build.

## MVP SCOPE (only this)

### 1. Foundation
- Next.js App Router + TypeScript strict + Tailwind + shadcn/ui + Prisma + PostgreSQL
- Design system: color tokens, typography, light/dark theme, bottom nav, skeleton loaders
- SVG logo (route pin + split coin), generated icon set (72–512, maskable, apple-touch 180, favicon) via a sharp script
- PWA: app/manifest.ts (shortcuts, maskable icons), Serwist service worker, offline page, update toast, custom install banner + iOS instructions
- SEO base: metadata API, sitemap.ts, robots.ts, default OG image via next/og, JSON-LD on landing page
- Simple public landing page

### 2. Auth & Trips
- Google login + email magic link
- Create trip (name, dates, destination, currency, budget, cover image)
- Invite via link, short code, and QR. Joining needs only name (+ phone optional)
- Coach can add placeholder members (no account) that can be claimed later
- Roles: Coach, Member (server-side enforcement) + audit log

### 3. Expenses
- Add/edit/delete expense: title, amount, category, date, paid-by, notes, receipt photo
- Split types: equal, exact, percentage, shares, exclude members
- Money stored in paise (integers), remainder distributed deterministically
- Pure domain functions in lib/domain/ with thorough Vitest tests (splits always sum to total)

### 4. Settlement
- Net balance per member
- Two modes per trip: "Pay the Coach" and "Minimized peer-to-peer" (debt simplification)
- Dashboard: "You owe ₹X / You get ₹X"

### 5. UPI Payments
- Coach saves UPI ID (validated) and uploads QR image
- Dynamic UPI deep link + dynamic QR with exact amount prefilled
- Mobile: "Pay Now" opens UPI app. Desktop: QR
- Member taps "I have paid" (optional UTR + screenshot)
- Coach Approves / Rejects. Status: Pending → Paid (awaiting approval) → Verified / Rejected
- Partial payments and payment history

### 6. Share & Export
- "Share dues on WhatsApp" with a pre-written message
- CSV export of trip summary
- Per-trip dynamic OG image

### 7. Quality
- Seed script with a demo trip
- Vitest unit tests for split, settlement, UPI link builder
- 2 Playwright e2e flows: (a) create trip → add expense → see balances, (b) pay via UPI → Coach verifies
- GitHub Actions CI (lint, typecheck, test, build)
- .env.example and README with setup steps

## OUT OF SCOPE FOR NOW
AI receipt scan, voice entry, polls, chat, itinerary, gamification, multi-currency, realtime, push notifications. Design the schema and folders so these can be added later without rewrites.

## DELIVERY
Phase A: setup, design system, logo, PWA, SEO base, landing
Phase B: auth, trips, invites, roles
Phase C: expenses, splits, settlement engine + tests
Phase D: UPI payments flow
Phase E: share/export, OG, seed, e2e, CI, README
Commit after each phase and run lint, typecheck, test, build before moving on.
```

## Baad ke prompts (MVP ke baad ek ek karke)

1. **Realtime + Offline sync + Push notifications**
2. **Analytics dashboard + PDF/Excel export + Co-Coach role**
3. **Itinerary, polls, chat, expense comments**
4. **AI receipt scanner + natural-language expense entry (feature flags)**
5. **Multi-currency, Hindi i18n, Wrapped summary card, Pro plan flags**
