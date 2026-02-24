# KHARCHA — Personal Expense Tracker

## PROJECT OVERVIEW
Premium PWA expense tracker for single user (Indian, college student).
Tracks monthly allowance, emergency vault, subscriptions, AI-categorized expenses.
"Quiet Luxury Stationery" design — warm parchment tones, ink-like text, paper metaphor.
Animation-rich: physics-based springs, ink spread, odometer, vault door, paper crumple.

## TECH STACK
- Next.js 16 (App Router, Server Components, Server Actions) + TypeScript 5.7+ strict
- Tailwind CSS v4.0 + Framer Motion 12 + GSAP 3.12
- Supabase (PostgreSQL + RLS) + Clerk (auth + 2FA)
- Claude API Sonnet 4.5 (AI categorization)
- Recharts, Lucide React, date-fns v4, Zustand 5, TanStack Query v5
- Serwist (PWA), Zod (validation), React Hook Form
- pnpm package manager

## DESIGN SYSTEM — "Slate & Parchment"
Colors (ALWAYS use CSS variables, never raw hex):
  --bg-global: #E5E2DD (Warm Stone)
  --bg-surface: #F2F0ED (Parchment cards)
  --bg-navigation: #D8D4CE (Nav)
  --text-primary: #2A2D34 (Charcoal Steel)
  --text-secondary: #6B707C (Muted Blue-Grey)
  --color-income: #6B7D71 (Sage Moss — credits)
  --color-expense: #A37B6F (Terracotta — debits)
  --color-accent: #8B7355 (Aged Bronze — interactive)
  --color-vault: #5C6B5E (Deep Forest — vault)

Fonts: DM Serif Display (headings/amounts) + Inter (body/UI) + IBM Plex Mono (numbers)
Light theme ONLY. Paper texture overlay on background. No harsh shadows.

## ARCHITECTURE RULES
1. ALL amounts encrypted with AES-256-GCM before storing in DB (see src/lib/crypto.ts)
2. PIN serves dual purpose: app unlock (bcrypt) + encryption key derivation (PBKDF2)
3. Server Actions for mutations, Route Handlers for reads
4. Supabase RLS on ALL tables — user only accesses own data
5. Zod validation on ALL inputs — no unvalidated data ever
6. Framer Motion for animations (GSAP only for vault door + odometer)
7. Mobile-first design — bottom nav, touch-friendly, 44px min tap targets
8. Amounts display: font-mono, sage for income, terracotta for expense

## KEY BUSINESS LOGIC
- Emergency vault is SEPARATE from allowance (funded by dad independently)
- Pass-through payments (fees dad sends for) create linked pairs, net ₹0 in budget
- AI categorization: check ai_learning cache → keyword rules → Claude API (3-tier)
- Subscriptions: auto-match by keywords + amount ± 5% + date ± 3 days
- Daily limit: available / daysRemaining, weekends get 1.3x
- Burn rate: actualSpent / idealSpentByNow → safe/caution/danger

## FILE CONVENTIONS
- Components: PascalCase (TransactionItem.tsx)
- Hooks: camelCase with "use" prefix (useEncryption.ts)
- Server Actions: camelCase (createTransaction)
- CSS: Tailwind utility classes, CSS variables for colors
- Types: src/types/index.ts (centralized)
- All files in src/ directory

## REFERENCE DOCUMENT
For detailed specs (DB schema, animations, algorithms, page layouts):
READ: ./MASTER_PROJECT_DOCUMENT.md

## CURRENT STATUS
Phase: Complete (all phases shipped + post-launch fixes)
Last completed: Post-launch bug fixes & UX improvements (2026-02-24)

## PROGRESS LOG
(Update this after completing each major task)
- [x] Phase 0: Foundation ✅ (2026-02-22)
- [x] Phase 1: UI Shell & Design System ✅ (2026-02-22)
- [x] Phase 2: Database & Auth & Encryption ✅ (2026-02-22)
- [x] Phase 3: Transaction System ✅ (2026-02-22)
- [x] Phase 4: Dashboard ✅ (2026-02-23)
- [x] Phase 5: Emergency Vault ✅ (2026-02-23)
- [x] Phase 6: Subscription Manager ✅ (2026-02-23)
- [x] Phase 7: AI Intelligence ✅ (2026-02-23)
- [x] Phase 8: Analytics & Charts ✅ (2026-02-23)
- [x] Phase 9: Polish & Security Hardening ✅ (2026-02-24)
- [x] Phase 10: PWA Setup (Serwist + Offline Queue) ✅ (2026-02-24)
- [x] Settings Page + NotificationBell ✅ (2026-02-24)
- [x] Final Polish Pass ✅ (2026-02-24)
- [x] Post-launch fixes ✅ (2026-02-24)
  - Web Push: fixed VAPID set at module level (moved inside handler)
  - PWA: fixed sw.js not generated (next build --webpack); added ServiceWorkerRegistrar
  - PushNotificationToggle: replaced navigator.serviceWorker.ready with getRegistration()
  - BOB SMS regex: patterns 12/13 for Dr./Cr. format (confidence 0.95, no Claude API)
  - SmartPasteInput: wired Phase 7 AI stub to real POST /api/ai/parse-sms
  - FABMenu: FAB hides (scale 0) when any modal is active — no more overlap
  - AddSubscriptionModal: added 20px padding to fullHeight content wrapper

## KEY BUSINESS LOGIC
- SMS parsing: 3-tier — regex (confidence ≥ 0.5) → Claude API → error
  - BOB bank: "Rs.X Dr./Cr. from/to A/C XXXXXX1234" matches Pattern 12/13 at 0.95
  - Phone-number UPI IDs (8511613428@axl) preserved as-is (cleanMerchant skip)
  - BOB date format (YYYY:MM:DD HH:MM:SS) normalised to YYYY-MM-DD
- SmartPasteInput flow: regex local → if confidence < 0.5 call /api/ai/parse-sms once
  - Button disabled during parsing → no double-fire; server rate-limits at 20 req/min

## KNOWN GOTCHAS
- Clerk + Supabase integration: Need JWT template named "supabase" in Clerk dashboard
- Tailwind v4: Uses CSS-first config, different from v3
- Framer Motion 12: Some API changes from v11 — check docs
- GSAP: Free for personal use, import from 'gsap'
- Supabase RLS: MUST test policies after creating tables
- PWA: manifest.json must be in /public, theme_color: #8B7355
- Encryption: Key NEVER stored persistently — derived from PIN each session
- pnpm: Use pnpm, NOT npm. If you see npm commands, convert to pnpm
- Build: MUST use `next build --webpack` (not default Turbopack) — Serwist needs webpack plugin
- Push notifications: webpush.setVapidDetails() must be INSIDE the route handler, not module top-level
- fullHeight modals: padding:0 on shell — children must add their own horizontal padding (20px)
- FABMenu: activeModal state drives FAB visibility — always set activeModal when opening modals via FAB