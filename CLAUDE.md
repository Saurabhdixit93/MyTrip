# CLAUDE.md — TripSplit (rename to final brand)

## Project

Group-trip expense manager (PWA). A **Coach** (admin) creates a trip, invites dynamic members, everyone adds expenses, the app computes who owes whom, and members pay the Coach via UPI (deep link + QR). **The app never holds or processes money.** It only generates UPI links/QR and tracks payment status.

## Stack

- Next.js (latest stable, App Router, RSC, Server Actions), TypeScript **strict**
- Tailwind CSS + shadcn/ui + Framer Motion + lucide-react
- PostgreSQL + Prisma (migrations, indexes, soft deletes)
- Auth.js (Google + email magic link / phone OTP)
- TanStack Query, Zustand (only when needed), Zod (shared client/server)
- Serwist for PWA, Upstash Redis for rate limiting
- Vitest (unit), Playwright (e2e), GitHub Actions CI
- Deploy target: Vercel

## Non-negotiable rules

1. **Money = integers in paise.** Never use floats for amounts. Format only at the UI layer.
2. **Split + settlement logic lives in `lib/domain/` as pure functions** with unit tests. No DB or React imports there.
3. **Authorize on the server** for every action (Coach / Co-Coach / Member / Guest). Never trust client role checks.
4. **Validate every input with Zod** (server side always).
5. **Audit log** every mutation on trips, expenses, payments, members (who, what, when, old → new).
6. **Idempotency keys** on payment-related mutations.
7. Rounding: distribute remainder paise deterministically so splits always sum exactly to the total.
8. No `any`, no unchecked casts, no `// @ts-ignore`.
9. Env vars validated at startup (zod / t3-env). Never commit secrets. Keep `.env.example` updated.
10. Do not add a dependency without a one-line reason in the PR/commit message.

## Folder structure

```
app/            routes, layouts, metadata, manifest.ts, sitemap.ts, robots.ts
components/     shared UI (ui/ = shadcn)
features/       trips/ expenses/ payments/ members/ analytics/ ...
lib/            utils, domain/ (pure logic), i18n, upi
server/         actions, services, auth, rbac
db/             prisma schema, migrations, seed
tests/          unit/ e2e/
public/         icons, og, screenshots
```

## UPI rules

- Validate VPA with regex: `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`
- Deep link format: `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>` (URL-encode all params, amount with 2 decimals)
- Mobile: "Pay Now" opens UPI intent. Desktop: show dynamic QR.
- Payment status flow: `PENDING → PAID_AWAITING_APPROVAL → VERIFIED | REJECTED`
- Never claim payment is confirmed without Coach verification.

## UI / UX

- Mobile-first, bottom nav, skeleton loaders, dark/light/system theme
- WCAG AA contrast, keyboard navigable, aria labels
- All user-facing strings go through i18n (English + Hindi)
- Currency shown as ₹ with Indian grouping (₹1,23,456.00)

## PWA / SEO checklist (keep passing)

- Valid `manifest.ts` (id, shortcuts, screenshots, maskable icons, share_target)
- Offline fallback page, update-available toast, custom install prompt + iOS instructions
- Metadata API on every page, canonical, OG + Twitter, JSON-LD, sitemap, robots
- Dynamic OG images via `next/og`
- Lighthouse target: 95+ in all categories

## Workflow

- Work in small phases; **commit after each phase** with conventional commits (`feat:`, `fix:`, `chore:`, `test:`).
- Before finishing any task run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- Write tests first for split/settlement/UPI helpers.
- If requirements are ambiguous but not blocking, state the assumption and proceed.
- Keep files small and focused; extract when a file passes ~250 lines.

## Commands

```
pnpm dev        # local dev
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest
pnpm e2e        # playwright
pnpm build      # production build
pnpm db:migrate # prisma migrate dev
pnpm db:seed    # demo trip seed
```
