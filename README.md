# MyTrip

**Split trips, not friendships.** MyTrip is a mobile-first, installable PWA for group-trip expenses in India.
A **Coach** creates a trip, friends join with a link, code or QR, everyone adds expenses, and MyTrip works
out who owes whom. Members settle with the Coach (or peer-to-peer) through a one-tap **UPI** deep link or QR.

> MyTrip never holds or processes money. It only builds UPI links/QRs and tracks payment status, which the receiver verifies.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Next.js setup, design system, logo + icon set, PWA shell, SEO base, landing | ✅ |
| 2 | Auth (Google, email magic link, guest join), trips, invites (link/code/QR), roles, audit log | ✅ |
| 3 | Expenses, split types (equal/exact/%/shares/exclude), settlement engine + tests | ✅ |
| 4 | UPI payments: Coach payout, deep link + QR, "I have paid" + UTR/proof, approve/reject, partial payments | ✅ |
| Next | Realtime, offline sync, push, exports, analytics, AI receipt scan, Hindi | ⏳ |

## Tech

Next.js 16 (App Router, Server Actions, Turbopack) · TypeScript strict · Tailwind v4 + shadcn/ui ·
PostgreSQL + Prisma 7 (pg driver adapter) · Auth.js v5 · Zod · Serwist (service worker) · Vitest.

## Getting started

Requirements: Node 20.9+, pnpm 10.

```bash
pnpm install
cp .env.example .env          # then fill AUTH_SECRET (openssl rand -base64 32)

# Local Postgres without Docker: Prisma's dev server (prints a TCP URL, put it in DATABASE_URL)
pnpm db:dev

pnpm db:migrate               # apply migrations
pnpm db:seed                  # demo trip "Goa Getaway" (code GOAFUN)
pnpm dev
```

Set `AUTH_DEV_LOGIN="true"` locally to get a one-click **Demo login** on `/login`. Seeded accounts:
`coach@mytrip.dev` (Coach), `rahul@mytrip.dev`, `priya@mytrip.dev`. Without `AUTH_RESEND_KEY`, magic links
are printed to the server console.

## Scripts

```bash
pnpm dev          # dev server
pnpm lint         # eslint
pnpm typecheck    # next typegen + tsc
pnpm test         # vitest (split, settlement, money, UPI, RBAC)
pnpm build        # production build (also bundles the service worker)
pnpm db:migrate   # prisma migrate dev
pnpm db:deploy    # prisma migrate deploy (production)
pnpm db:seed      # demo data
pnpm icons        # regenerate icons/splash/screenshots from public/brand/*.svg
```

## Project structure

```
app/            routes: (marketing) public pages, (public) login/join, (app) signed-in app,
                manifest.ts, sitemap.ts, robots.ts, sw.ts (service worker), OG images
components/     shared UI (ui/ = shadcn), layout, forms, PWA widgets
features/       trips/ expenses/ settle/ payments/ members/ invites/ auth/ (feature UI)
lib/domain/     pure money, split, balance and settlement logic (no DB/React)
lib/upi/        VPA validation + upi://pay link builder
lib/validation/ Zod schemas shared by client and server
server/         auth, RBAC, audit log, services (mutations), queries, actions, storage, rate limit
db/             Prisma schema, migrations, seed
tests/unit/     Vitest suites
```

## How the money works

- Every amount is **integer paise**. Rupee input is parsed with string math, never floats.
- Splits use **largest-remainder allocation** in a canonical member order, so shares always add up to the
  total exactly and leftover paise land deterministically.
- **Balances**: `net = paid − share + sent − received` (only VERIFIED payments count).
- **Pay the Coach** mode: debtors pay the Coach, and the Coach pays creditors. **Minimized P2P** mode: exact
  matches first, then greedy largest-debtor ↔ largest-creditor (≤ n−1 transfers).
- Payments: `PENDING` (tapped Pay Now) → `PAID_AWAITING_APPROVAL` (I have paid + UTR/screenshot) →
  `VERIFIED` / `REJECTED` by the receiver or Coach. Each pay sheet carries an **idempotency key**.

## Security

Server-side RBAC on every action (Coach / Co-Coach / Member / Viewer), Zod validation everywhere, an
append-only audit log, private file storage with magic-byte checks served only to trip members, rate limits
(Upstash, or an in-memory fallback), CSP and security headers, and env validation at startup.

## Deploy (Vercel)

1. Create a Postgres database (Neon / Supabase) and set `DATABASE_URL`.
2. Set `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, Google OAuth and/or `AUTH_RESEND_KEY`, and S3-compatible storage
   (`STORAGE_DRIVER=s3`, `S3_*`). Keep `AUTH_DEV_LOGIN` off.
3. Build command: `pnpm db:deploy && pnpm build`.
