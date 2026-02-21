# KHARCHA — Personal Expense Tracker
## Master Project Document v1.0
### "Where every rupee tells a story"

---

> **IMPORTANT**: This document is the single source of truth for building the entire application.
> Any developer (or AI agent like Claude Code) should be able to build the complete app using ONLY this document.
> Every schema, every route, every component, every animation, every security measure is documented here.

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Design System — "Slate & Parchment"](#3-design-system)
4. [Animation System — "Physics of Paper"](#4-animation-system)
5. [Database Schema (Supabase/PostgreSQL)](#5-database-schema)
6. [Authentication & Security Architecture](#6-authentication--security-architecture)
7. [Custom Algorithms](#7-custom-algorithms)
8. [API Routes & Server Actions](#8-api-routes--server-actions)
9. [Component Architecture](#9-component-architecture)
10. [Page-by-Page Specification](#10-page-by-page-specification)
11. [AI Intelligence Layer](#11-ai-intelligence-layer)
12. [SMS Parsing System](#12-sms-parsing-system)
13. [Tasker Auto-Detection Setup](#13-tasker-auto-detection-setup)
14. [PWA Configuration](#14-pwa-configuration)
15. [External Services & Free Tiers](#15-external-services--free-tiers)
16. [Environment Variables](#16-environment-variables)
17. [Deployment Guide](#17-deployment-guide)
18. [Phased Build Plan (Claude Code Instructions)](#18-phased-build-plan)
19. [Testing Strategy](#19-testing-strategy)
20. [Future Enhancements](#20-future-enhancements)

---

## 1. PROJECT OVERVIEW

### 1.1 What is Kharcha?

Kharcha (Hindi: खर्चा, meaning "expense") is a premium personal expense tracker PWA designed for a single user who receives a variable monthly allowance. It tracks spending, manages an emergency vault, handles recurring subscriptions, and provides AI-powered insights — all wrapped in a beautiful, animation-rich interface that feels like writing in a premium leather-bound notebook.

### 1.2 Core Problems Solved

| Problem | Solution |
|---------|----------|
| Uncontrolled spending of monthly allowance | Daily spending limit calculator with burn rate alerts |
| No emergency fund discipline | Isolated Emergency Vault with its own ledger |
| Can't distinguish own expenses from pass-through payments (fees, etc.) | Pass-through linking system — income + expense cancel out |
| Subscription costs are invisible | Subscription Manager with renewal alerts and total burn rate |
| No spending awareness | AI categorization, monthly summaries, anomaly detection |
| Allowance comes on variable dates | Flexible income detection, not tied to calendar dates |
| Festival/bonus money mixed with allowance | Separate income tagging system |

### 1.3 User Profile

- Single user (personal use only)
- Indian bank accounts (₹ INR primary currency)
- Some USD subscriptions (GitHub Copilot, etc.)
- Android phone (primary device)
- Receives allowance from parent at variable dates (early month)
- Receives emergency fund as separate deposit
- Sometimes receives pass-through money for specific bills (college fees, etc.)

### 1.4 App Name & Branding

- **Name**: Kharcha (खर्चा)
- **Tagline**: "Where every rupee tells a story"
- **Icon concept**: A minimal fountain pen nib forming a ₹ symbol
- **Feel**: Premium stationery, aged paper, ink on parchment

---

## 2. TECHNOLOGY STACK

### 2.1 Core Framework

```
Framework:      Next.js 16 (App Router, Server Components, Server Actions)
Language:       TypeScript 5.7+ (strict mode enabled)
Runtime:        Node.js 22 LTS
Package Mgr:    pnpm (faster, disk-efficient)
```

### 2.2 Frontend

```
Styling:        Tailwind CSS v4.0 (CSS-first configuration)
Animations:     Framer Motion 12 (primary) + GSAP 3.12 (complex timelines)
Charts:         Recharts 2.x (React-native charts, beautiful defaults)
Icons:          Lucide React (clean, consistent, tree-shakeable)
Date Handling:  date-fns v4 (lightweight, immutable)
State:          Zustand 5 (global state) + TanStack Query v5 (server state/cache)
Forms:          React Hook Form + Zod (validation)
Lottie:         lottie-react (for pre-made success/loading animations)
```

### 2.3 Backend & Data

```
Database:       Supabase (PostgreSQL 15 + Row Level Security + Realtime)
Auth:           Clerk (authentication, 2FA, session management)
AI:             Anthropic Claude API (Sonnet 4.5 for categorization)
Exchange Rate:  ExchangeRate-API (free tier: 1,500 req/mo)
Hosting:        Vercel (free tier, edge functions)
```

### 2.4 Security

```
Encryption:     Web Crypto API (AES-256-GCM for sensitive fields)
Hashing:        SHA-256 (for integrity checks)
Auth:           Clerk middleware + custom app-level PIN
Sessions:       JWT with 15-min expiry, refresh tokens
Rate Limiting:  Custom middleware (token bucket algorithm)
CSP:            Strict Content Security Policy headers
```

### 2.5 PWA

```
Service Worker: Serwist (next-gen PWA toolkit, successor to next-pwa)
Caching:        Stale-While-Revalidate for API, Cache-First for assets
Offline:        IndexedDB for offline transaction queue
Push:           Web Push API (for subscription reminders)
```

### 2.6 Dev Tools

```
Linting:        ESLint 9 (flat config) + Prettier
Testing:        Vitest + React Testing Library + Playwright (e2e)
Git Hooks:      Husky + lint-staged
CI/CD:          Vercel (auto-deploy on push)
```

### 2.7 Package Installation Command

```bash
# Initialize project
pnpm create next-app@latest kharcha --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
pnpm add @clerk/nextjs @supabase/supabase-js @supabase/ssr
pnpm add framer-motion gsap lottie-react
pnpm add recharts lucide-react date-fns
pnpm add zustand @tanstack/react-query
pnpm add react-hook-form @hookform/resolvers zod
pnpm add @anthropic-ai/sdk
pnpm add serwist @serwist/next

# Dev dependencies
pnpm add -D vitest @testing-library/react playwright
pnpm add -D husky lint-staged prettier
```

---

## 3. DESIGN SYSTEM — "Slate & Parchment"

### 3.1 Philosophy

The design language is **"Quiet Luxury Stationery"** — the app should feel like opening a premium leather-bound notebook. Warm paper tones, ink-like text, subtle textures, and sophisticated earthy accents. No harsh whites, no neon, no typical "fintech blue." This is a personal journal for money, not a banking app.

### 3.2 Color Tokens

Define these as CSS custom properties in `globals.css` AND as Tailwind tokens:

```css
/* globals.css — Slate & Parchment Color System */
:root {
  /* === BACKGROUNDS === */
  --bg-global:          #E5E2DD;  /* Warm Stone — main app background */
  --bg-surface:         #F2F0ED;  /* Parchment — cards, containers */
  --bg-surface-hover:   #EBE8E3;  /* Slightly darker parchment on hover */
  --bg-navigation:      #D8D4CE;  /* Weathered Clay — nav, sidebar */
  --bg-navigation-active: #CFC9C1; /* Active nav item */
  --bg-overlay:         rgba(42, 45, 52, 0.4); /* Modal backdrop */
  --bg-input:           #F7F5F2;  /* Slightly lighter for input fields */
  --bg-skeleton:        #DDD9D3;  /* Skeleton loading base */

  /* === TEXT === */
  --text-primary:       #2A2D34;  /* Charcoal Steel — headings, balances */
  --text-secondary:     #6B707C;  /* Muted Blue-Grey — dates, labels */
  --text-tertiary:      #9599A3;  /* Faded ink — placeholders, disabled */
  --text-on-accent:     #F2F0ED;  /* Text on accent backgrounds */
  --text-on-sage:       #F2F0ED;  /* Text on sage/income elements */
  --text-on-terracotta: #F2F0ED;  /* Text on terracotta/expense elements */

  /* === SEMANTIC COLORS === */
  --color-income:       #6B7D71;  /* Sage Moss — credits, deposits */
  --color-income-light: #8FA397;  /* Lighter sage for backgrounds */
  --color-income-bg:    rgba(107, 125, 113, 0.1); /* Sage tinted background */
  --color-expense:      #A37B6F;  /* Terracotta Clay — debits, expenses */
  --color-expense-light:#BF9D93;  /* Lighter terracotta for backgrounds */
  --color-expense-bg:   rgba(163, 123, 111, 0.1); /* Terracotta tinted bg */
  --color-accent:       #8B7355;  /* Aged Bronze — interactive elements */
  --color-accent-hover: #7A6549;  /* Darker bronze on hover */
  --color-accent-light: #D4C5A9;  /* Warm Sand — subtle highlights */

  /* === VAULT SPECIFIC === */
  --color-vault:        #5C6B5E;  /* Deep Forest — vault identity */
  --color-vault-light:  #7A8B7C;  /* Lighter forest for vault accents */
  --color-vault-bg:     rgba(92, 107, 94, 0.08); /* Vault tinted bg */

  /* === STATUS === */
  --color-warning:      #C4935A;  /* Warm Amber — caution */
  --color-warning-bg:   rgba(196, 147, 90, 0.1);
  --color-danger:       #B85C5C;  /* Muted Brick — critical */
  --color-danger-bg:    rgba(184, 92, 92, 0.1);
  --color-success:      #6B7D71;  /* Same as income (sage) */

  /* === BURN RATE INDICATORS === */
  --burn-safe:          #6B7D71;  /* Green/Sage — on track */
  --burn-caution:       #C4935A;  /* Amber — spending fast */
  --burn-danger:        #B85C5C;  /* Brick — will run out */

  /* === BORDERS & DIVIDERS === */
  --border-default:     #CDC9C2;  /* Soft Linen — subtle lines */
  --border-strong:      #B8B3AB;  /* Stronger border for emphasis */
  --border-input:       #C5C0B8;  /* Input field borders */
  --border-input-focus: #8B7355;  /* Input focus — aged bronze */

  /* === SHADOWS === */
  --shadow-sm:          0 1px 3px rgba(42, 45, 52, 0.06);
  --shadow-md:          0 4px 12px rgba(42, 45, 52, 0.08);
  --shadow-lg:          0 8px 24px rgba(42, 45, 52, 0.10);
  --shadow-card:        0 2px 8px rgba(42, 45, 52, 0.05);
  --shadow-card-hover:  0 6px 20px rgba(42, 45, 52, 0.10);
  --shadow-float:       0 8px 32px rgba(42, 45, 52, 0.12);

  /* === GRADIENTS === */
  --gradient-vault:     linear-gradient(135deg, #5C6B5E 0%, #4A5A4D 100%);
  --gradient-accent:    linear-gradient(135deg, #8B7355 0%, #A38B6D 100%);
  --gradient-paper:     linear-gradient(180deg, #F2F0ED 0%, #E8E5E0 100%);
  --gradient-shimmer:   linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.08) 50%, transparent 100%);

  /* === SPACING SCALE (8px base) === */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* === BORDER RADIUS === */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* === TRANSITIONS === */
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth:    cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-bounce:    cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --duration-fast:  150ms;
  --duration-normal:250ms;
  --duration-slow:  400ms;
  --duration-reveal:600ms;
}
```

### 3.3 Tailwind v4 Configuration

In `tailwind.config.ts` (or using CSS-first config in v4):

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          global: 'var(--bg-global)',
          surface: 'var(--bg-surface)',
          nav: 'var(--bg-navigation)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        sage: {
          DEFAULT: 'var(--color-income)',
          light: 'var(--color-income-light)',
          bg: 'var(--color-income-bg)',
        },
        terracotta: {
          DEFAULT: 'var(--color-expense)',
          light: 'var(--color-expense-light)',
          bg: 'var(--color-expense-bg)',
        },
        bronze: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
        },
        vault: {
          DEFAULT: 'var(--color-vault)',
          light: 'var(--color-vault-light)',
          bg: 'var(--color-vault-bg)',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        float: 'var(--shadow-float)',
      },
      borderRadius: {
        card: 'var(--radius-md)',
        button: 'var(--radius-lg)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'ink-spread': 'ink-spread 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'stamp': 'stamp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'rise': 'rise 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
        'pencil-draw': 'pencil-draw 0.8s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        stamp: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.3)' },
          '60%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        rise: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

### 3.4 Typography System

```
FONT LOADING (Google Fonts — via next/font):
=============================================

Display Font:   DM Serif Display (400 weight only)
                Usage: Page titles, balance amounts, vault display, section headings
                Feel: Elegant, serif, like printed on fine paper

Body Font:      Inter (400, 500, 600 weights)
                Usage: UI labels, body text, buttons, navigation
                Feel: Clean, readable, modern contrast to the serif display

Mono Font:      IBM Plex Mono (400, 500 weights)
                Usage: Transaction amounts, dates, IDs, code-like info
                Feel: Precise, financial, classier than JetBrains for warm theme

SIZE SCALE (Mobile-first):
==========================
--text-xs:    11px / 0.6875rem  (line-height: 1.4)  — Tiny labels
--text-sm:    13px / 0.8125rem  (line-height: 1.5)  — Secondary text, captions
--text-base:  15px / 0.9375rem  (line-height: 1.6)  — Body text
--text-lg:    17px / 1.0625rem  (line-height: 1.5)  — Emphasized body
--text-xl:    21px / 1.3125rem  (line-height: 1.4)  — Section titles
--text-2xl:   28px / 1.75rem    (line-height: 1.3)  — Page titles
--text-3xl:   36px / 2.25rem    (line-height: 1.2)  — Hero balance amount
--text-4xl:   48px / 3rem       (line-height: 1.1)  — Dashboard main balance

FONT USAGE MAP:
===============
Dashboard balance:     font-display text-4xl text-ink-primary
Card title:            font-display text-xl text-ink-primary
Transaction amount:    font-mono text-lg (sage for income, terracotta for expense)
Transaction label:     font-body text-base text-ink-primary
Date/time:             font-body text-sm text-ink-secondary
Button text:           font-body text-base font-medium
Navigation label:      font-body text-xs font-medium
Input text:            font-body text-base text-ink-primary
Placeholder:           font-body text-base text-ink-tertiary
```

### 3.5 Paper Texture Overlay

Add a subtle paper texture to the global background for premium feel:

```css
/* Paper texture using CSS noise — no image needed */
body {
  background-color: var(--bg-global);
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
}
```

### 3.6 Component Design Tokens

```
CARD:
  background: var(--bg-surface)
  border: 1px solid var(--border-default)
  border-radius: var(--radius-md)  → 12px
  padding: var(--space-5) → 20px
  shadow: var(--shadow-card)
  hover-shadow: var(--shadow-card-hover)
  transition: shadow var(--duration-normal) var(--ease-smooth)

BUTTON (Primary):
  background: var(--color-accent) → #8B7355
  color: var(--text-on-accent)
  border-radius: var(--radius-lg) → 16px
  padding: var(--space-3) var(--space-6) → 12px 24px
  font: font-body font-medium
  hover: var(--color-accent-hover)
  active: scale(0.97)
  transition: all var(--duration-fast) var(--ease-smooth)

BUTTON (Secondary / Ghost):
  background: transparent
  color: var(--color-accent)
  border: 1px solid var(--border-default)
  hover-background: var(--bg-surface-hover)

INPUT:
  background: var(--bg-input)
  border: 1px solid var(--border-input)
  border-radius: var(--radius-sm) → 6px
  padding: var(--space-3) var(--space-4) → 12px 16px
  focus-border: var(--border-input-focus) → #8B7355
  focus-ring: 0 0 0 3px rgba(139, 115, 85, 0.15)
  font: font-body text-base

BADGE:
  Income:  bg: var(--color-income-bg)  text: var(--color-income)
  Expense: bg: var(--color-expense-bg) text: var(--color-expense)
  Vault:   bg: var(--color-vault-bg)   text: var(--color-vault)
  Warning: bg: var(--color-warning-bg)  text: var(--color-warning)

BOTTOM NAV:
  background: var(--bg-navigation)
  border-top: 1px solid var(--border-default)
  active-icon: var(--color-accent)
  inactive-icon: var(--text-secondary)
  height: 64px
  safe-area-bottom: env(safe-area-inset-bottom)

MODAL:
  overlay: var(--bg-overlay)
  background: var(--bg-surface)
  border-radius: var(--radius-xl) var(--radius-xl) 0 0  (bottom sheet style)
  max-height: 85vh
  padding: var(--space-6)
```

### 3.7 Iconography

Use **Lucide React** with these specific icons mapped to features:

```typescript
// Icon mapping
const ICONS = {
  // Navigation
  home: 'LayoutDashboard',
  transactions: 'ArrowLeftRight',
  analytics: 'BarChart3',
  vault: 'Shield',
  settings: 'Settings',

  // Transaction types
  income: 'ArrowDownLeft',
  expense: 'ArrowUpRight',
  passThrough: 'ArrowRightLeft',

  // Categories
  food: 'UtensilsCrossed',
  transport: 'Car',
  entertainment: 'Gamepad2',
  shopping: 'ShoppingBag',
  subscriptions: 'RefreshCw',
  education: 'GraduationCap',
  health: 'Heart',
  utilities: 'Zap',
  personal: 'User',
  other: 'MoreHorizontal',

  // Actions
  add: 'Plus',
  edit: 'Pencil',
  delete: 'Trash2',
  search: 'Search',
  filter: 'SlidersHorizontal',
  close: 'X',
  back: 'ArrowLeft',
  more: 'MoreVertical',

  // Status
  warning: 'AlertTriangle',
  success: 'CheckCircle',
  info: 'Info',
  lock: 'Lock',
  unlock: 'Unlock',

  // Features
  smartPaste: 'ClipboardPaste',
  ai: 'Sparkles',
  calendar: 'Calendar',
  export: 'Download',
  notification: 'Bell',
}
```

---

## 4. ANIMATION SYSTEM — "Physics of Paper"

### 4.1 Philosophy

Every interaction should feel **physical** — like manipulating objects on a desk. Paper slides, ink spreads, stamps press, pages turn. We use physics-based spring animations (not linear easing) for everything. The app is "heavily rich" in animation because it's personal — performance budget is generous since there's only one user.

### 4.2 Animation Library Setup

```typescript
// src/lib/animations.ts — Central animation configuration

import { type Variants, type Transition } from 'framer-motion'

// === SPRING PRESETS ===
export const springs = {
  // Snappy — buttons, toggles, small interactions
  snappy: { type: 'spring', stiffness: 500, damping: 30 } as Transition,
  // Gentle — cards, page transitions
  gentle: { type: 'spring', stiffness: 200, damping: 25 } as Transition,
  // Bouncy — stamps, category selection, success states
  bouncy: { type: 'spring', stiffness: 400, damping: 15 } as Transition,
  // Elastic — list items, scroll overshot
  elastic: { type: 'spring', stiffness: 300, damping: 15, mass: 0.8 } as Transition,
  // Slow — page-level transitions, vault door
  slow: { type: 'spring', stiffness: 100, damping: 20 } as Transition,
}

// === PAGE TRANSITION — "Page Turn" ===
export const pageTurn: Variants = {
  initial: {
    opacity: 0,
    x: 60,
    rotateY: 3,  // Slight 3D rotation like turning a page
  },
  animate: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    x: -60,
    rotateY: -3,
    transition: { duration: 0.25 },
  },
}

// === CARD ENTRANCE — "Rise from Paper" ===
export const cardRise: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    boxShadow: '0 0px 0px rgba(42, 45, 52, 0)',
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    boxShadow: '0 2px 8px rgba(42, 45, 52, 0.05)',
    transition: {
      ...springs.gentle,
      delay: index * 0.1,  // Stagger: 100ms between cards
    },
  }),
}

// === LIST ITEM — "Slide & Settle" ===
export const listItem: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      ...springs.snappy,
      delay: index * 0.05,
    },
  }),
  exit: {
    opacity: 0,
    x: 20,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.3 },
  },
}

// === STAMP PRESS — Category Selection ===
export const stampPress: Variants = {
  idle: { scale: 1 },
  pressed: {
    scale: [1, 1.3, 0.9, 1.0],
    transition: { duration: 0.4, times: [0, 0.3, 0.6, 1] },
  },
}

// === FLOATING ACTION BUTTON ===
export const floatingButton = {
  animate: {
    y: [0, -2, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  tap: { scale: 0.92 },
  hover: {
    scale: 1.05,
    boxShadow: '0 12px 40px rgba(42, 45, 52, 0.15)',
  },
}

// === VALUE ROLL / ODOMETER ===
// This is implemented as a React component (see Section 9)
// Each digit gets its own column that scrolls vertically
// Key properties:
//   - Duration: 800ms per digit change
//   - Easing: spring with overshoot
//   - Digits animate independently
//   - Comma separators slide in/out

// === INK SPREAD — "Add Expense" ===
// Implementation: CSS clip-path circle expanding from button center
// Step 1: Record button center coordinates
// Step 2: Animate clip-path: circle(0% at X Y) → circle(150% at X Y)
// Step 3: Form content fades in after circle reaches ~60%
// Step 4: Reverse on close
export const inkSpread = {
  initial: (origin: { x: number; y: number }) => ({
    clipPath: `circle(0% at ${origin.x}px ${origin.y}px)`,
  }),
  animate: (origin: { x: number; y: number }) => ({
    clipPath: `circle(150% at ${origin.x}px ${origin.y}px)`,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  }),
  exit: (origin: { x: number; y: number }) => ({
    clipPath: `circle(0% at ${origin.x}px ${origin.y}px)`,
    transition: { duration: 0.35, ease: 'easeIn' },
  }),
}

// === VAULT DOOR ===
export const vaultDoor: Variants = {
  locked: { rotate: 0 },
  unlocking: {
    rotate: [0, -10, 90],
    transition: { duration: 1.2, times: [0, 0.3, 1], ease: 'easeInOut' },
  },
}

// === CHART ANIMATIONS ===
export const chartAnimations = {
  // Pie chart: segments grow from center
  pieSegment: (delay: number) => ({
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.8, delay, ease: 'easeOut' },
    },
  }),

  // Line chart: draws itself
  lineDraw: {
    initial: { pathLength: 0 },
    animate: {
      pathLength: 1,
      transition: { duration: 1.5, ease: 'easeInOut' },
    },
  },

  // Bar chart: grows upward
  barGrow: (delay: number) => ({
    initial: { scaleY: 0, originY: 1 },
    animate: {
      scaleY: 1,
      transition: { ...springs.bouncy, delay },
    },
  }),
}

// === DELETE ANIMATION — "Paper Crumple" ===
export const paperCrumple: Variants = {
  idle: {
    scale: 1,
    opacity: 1,
    rotateZ: 0,
    height: 'auto',
  },
  crumpling: {
    scale: [1, 0.95, 0.8],
    opacity: [1, 0.8, 0],
    rotateZ: [0, -2, 5],
    height: [null, null, 0],
    marginBottom: [null, null, 0],
    transition: { duration: 0.5, times: [0, 0.4, 1] },
  },
}

// === SKELETON "PENCIL SKETCH" ===
export const skeletonPencil = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}
// CSS for skeleton:
// background: linear-gradient(90deg, var(--bg-skeleton) 25%, var(--bg-surface) 50%, var(--bg-skeleton) 75%);
// background-size: 200% 100%;

// === PULL TO REFRESH — "Pen Nib Pull" ===
// Custom implementation using touch events
// Visual: A pen nib icon that stretches down as user pulls
// At threshold: nib releases and page refreshes with ink-drop effect

// === STAGGER CONTAINER ===
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

// === TOGGLE SWITCH — "Liquid Fill" ===
export const toggleSwitch = {
  off: {
    backgroundColor: 'var(--bg-navigation)',
    x: 0,
  },
  on: {
    backgroundColor: 'var(--color-accent)',
    x: 20,
    transition: springs.snappy,
  },
}

// === SUCCESS CHECKMARK — "Draw Itself" ===
export const checkmarkDraw = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.2 },
  },
}

// === GOLDEN SHIMMER — Success state ===
export const goldenShimmer = {
  animate: {
    backgroundPosition: ['-200% 0', '200% 0'],
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
}
// CSS: background: var(--gradient-shimmer); background-size: 200% 100%;
```

### 4.3 Animation Performance Rules

```
RULES:
1. ONLY animate: transform, opacity, clip-path, filter
   NEVER animate: width, height, top, left, margin, padding (causes layout thrash)

2. Use will-change sparingly — only on elements currently animating
   Remove will-change after animation completes

3. For lists > 20 items: virtualize with tanstack-virtual, animate only visible items

4. GSAP is used ONLY for:
   - Vault door rotation (complex timeline)
   - Odometer digit roll (coordinated multi-element)
   - Ink spread with texture overlay (multi-property timeline)

5. Framer Motion is used for EVERYTHING ELSE

6. CSS @keyframes for:
   - Floating button (infinite, simple)
   - Shimmer/skeleton (infinite, simple)
   - Pulse effects (infinite, simple)

7. Lottie for:
   - Success checkmark (pre-made, optimized)
   - Loading spinner (custom pen-drawing animation)
   - Empty state illustrations
```

---

## 5. DATABASE SCHEMA (Supabase/PostgreSQL)

### 5.1 Overview

All tables use UUID primary keys, timestamps, and Row Level Security (RLS).
Sensitive financial amounts are stored encrypted (see Section 6 for encryption).

### 5.2 Tables

```sql
-- ============================================================
-- ENABLE UUID EXTENSION
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: profiles
-- Purpose: User profile and preferences (linked to Clerk user)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE NOT NULL,       -- Clerk's user ID
  display_name    TEXT NOT NULL DEFAULT 'User',
  currency        TEXT NOT NULL DEFAULT 'INR', -- Primary currency
  pin_hash        TEXT,                        -- App-level PIN (bcrypt hash)
  pin_enabled     BOOLEAN DEFAULT FALSE,
  biometric_enabled BOOLEAN DEFAULT FALSE,
  monthly_budget_alert_pct INTEGER DEFAULT 80, -- Alert when X% budget used
  daily_limit_enabled BOOLEAN DEFAULT TRUE,
  notification_enabled BOOLEAN DEFAULT TRUE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: income_entries
-- Purpose: All incoming money (allowance, vault deposits, bonus, pass-through)
-- ============================================================
CREATE TABLE income_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_encrypted TEXT NOT NULL,               -- AES-256-GCM encrypted amount
  amount_hash     TEXT NOT NULL,                -- SHA-256 hash for integrity
  currency        TEXT NOT NULL DEFAULT 'INR',
  type            TEXT NOT NULL CHECK (type IN (
                    'allowance',           -- Monthly allowance from dad
                    'emergency_fund',      -- Emergency fund deposit from dad
                    'festival_bonus',      -- Extra money during festivals
                    'pass_through',        -- Money for specific bills (fees, etc.)
                    'vault_replenish',     -- Dad replenishing vault after withdrawal
                    'other'                -- Any other income
                  )),
  description     TEXT,                         -- "January allowance", "Diwali bonus", etc.
  pass_through_for TEXT,                        -- If type='pass_through': what it's for
  linked_expense_id UUID,                       -- Links to the expense it's meant to cover
  source          TEXT DEFAULT 'manual',        -- 'manual', 'sms_parsed', 'tasker'
  raw_sms         TEXT,                         -- Original SMS text (if parsed)
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year      TEXT GENERATED ALWAYS AS (TO_CHAR(date, 'YYYY-MM')) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: transactions (expenses)
-- Purpose: All outgoing money
-- ============================================================
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_encrypted TEXT NOT NULL,               -- AES-256-GCM encrypted
  amount_hash     TEXT NOT NULL,                -- SHA-256 integrity hash
  currency        TEXT NOT NULL DEFAULT 'INR',
  category_id     UUID REFERENCES categories(id),
  category_name   TEXT,                         -- Denormalized for fast reads
  subcategory     TEXT,                         -- "Delivery" under "Food", etc.
  description     TEXT NOT NULL,                -- "Zomato", "Uber to college", etc.
  merchant        TEXT,                         -- Extracted merchant name
  is_pass_through BOOLEAN DEFAULT FALSE,        -- True if covered by pass-through income
  linked_income_id UUID REFERENCES income_entries(id), -- Links to pass-through income
  is_subscription BOOLEAN DEFAULT FALSE,        -- True if matched to a subscription
  subscription_id UUID REFERENCES subscriptions(id),
  is_need         BOOLEAN DEFAULT TRUE,         -- Need vs Want classification
  source          TEXT DEFAULT 'manual',        -- 'manual', 'sms_parsed', 'tasker'
  raw_sms         TEXT,                         -- Original SMS if parsed
  ai_categorized  BOOLEAN DEFAULT FALSE,        -- Was this categorized by AI?
  ai_confidence   REAL,                         -- AI confidence score 0.0-1.0
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  time            TIME,                         -- Time of transaction
  month_year      TEXT GENERATED ALWAYS AS (TO_CHAR(date, 'YYYY-MM')) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- Purpose: Expense categories (seeded + custom)
-- ============================================================
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                -- "Food", "Transport", etc.
  icon            TEXT NOT NULL,                -- Lucide icon name
  color           TEXT NOT NULL,                -- Hex color for charts
  is_default      BOOLEAN DEFAULT FALSE,        -- Pre-seeded categories
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: emergency_vault
-- Purpose: Emergency fund tracking (separate from spending budget)
-- ============================================================
CREATE TABLE emergency_vault (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_balance_encrypted TEXT NOT NULL DEFAULT '0', -- Encrypted balance
  target_amount_encrypted TEXT,                 -- Target amount (if set)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: vault_transactions
-- Purpose: Vault deposit/withdrawal ledger
-- ============================================================
CREATE TABLE vault_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vault_id        UUID NOT NULL REFERENCES emergency_vault(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount_encrypted TEXT NOT NULL,
  amount_hash     TEXT NOT NULL,
  reason          TEXT,                         -- "Initial deposit", "Medical emergency", etc.
  balance_after_encrypted TEXT NOT NULL,        -- Vault balance after this transaction
  linked_income_id UUID REFERENCES income_entries(id), -- Link to income entry if deposit
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: subscriptions
-- Purpose: Recurring subscription tracking
-- ============================================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                -- "YouTube Premium", "GitHub Copilot"
  amount_encrypted TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',  -- 'INR' or 'USD'
  amount_inr_encrypted TEXT,                    -- Converted amount in INR (for USD subs)
  billing_day     INTEGER CHECK (billing_day BETWEEN 1 AND 31), -- Day of month
  billing_cycle   TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  category_id     UUID REFERENCES categories(id),
  is_active       BOOLEAN DEFAULT TRUE,
  next_billing_date DATE,
  last_paid_date  DATE,
  auto_match_keywords TEXT[],                   -- Keywords to match in transactions
  remind_days_before INTEGER DEFAULT 3,         -- Remind X days before billing
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: monthly_summaries
-- Purpose: Pre-computed monthly aggregates (for fast analytics)
-- ============================================================
CREATE TABLE monthly_summaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_year      TEXT NOT NULL,                -- "2026-01", "2026-02"
  total_allowance_encrypted TEXT,
  total_bonus_encrypted TEXT,
  total_expenses_encrypted TEXT,
  total_subscriptions_encrypted TEXT,
  total_pass_through_encrypted TEXT,
  vault_deposits_encrypted TEXT,
  vault_withdrawals_encrypted TEXT,
  daily_average_encrypted TEXT,
  category_breakdown JSONB,                    -- { "Food": encrypted_amount, ... }
  needs_vs_wants  JSONB,                       -- { "needs": encrypted, "wants": encrypted }
  burn_rate_data  JSONB,                       -- Daily spending array for charts
  ai_summary      TEXT,                        -- AI-generated monthly summary
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, month_year)
);

-- ============================================================
-- TABLE: ai_learning
-- Purpose: Store user corrections to AI categorization for learning
-- ============================================================
CREATE TABLE ai_learning (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_keyword TEXT NOT NULL,               -- "zomato", "uber", "starbucks"
  ai_suggested_category TEXT,                   -- What AI guessed
  user_corrected_category TEXT NOT NULL,         -- What user chose
  user_corrected_subcategory TEXT,
  is_need         BOOLEAN,                      -- User's need/want classification
  occurrence_count INTEGER DEFAULT 1,           -- How many times this pattern seen
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, merchant_keyword)
);

-- ============================================================
-- TABLE: sms_templates
-- Purpose: Known bank SMS patterns for parsing
-- ============================================================
CREATE TABLE sms_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name       TEXT NOT NULL,                -- "HDFC", "SBI", "ICICI"
  sms_pattern     TEXT NOT NULL,                -- Regex pattern
  amount_group    INTEGER DEFAULT 1,            -- Regex group for amount
  merchant_group  INTEGER,                      -- Regex group for merchant
  type_indicator  TEXT,                         -- "debited"/"credited" keyword
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- Purpose: In-app notification queue
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'subscription_reminder',
                    'budget_warning',
                    'vault_low',
                    'anomaly_detected',
                    'monthly_summary_ready',
                    'vault_replenish_reminder',
                    'general'
                  )),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT FALSE,
  action_url      TEXT,                         -- Deep link within app
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: app_settings
-- Purpose: Global app configuration
-- ============================================================
CREATE TABLE app_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exchange_rate_usd_inr REAL DEFAULT 84.0,      -- Cached exchange rate
  exchange_rate_updated_at TIMESTAMPTZ,
  theme           TEXT DEFAULT 'parchment',     -- For future theme options
  tasker_webhook_secret TEXT,                    -- Secret for Tasker webhook auth
  ai_categorization_enabled BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_transactions_profile_date ON transactions(profile_id, date DESC);
CREATE INDEX idx_transactions_month ON transactions(profile_id, month_year);
CREATE INDEX idx_transactions_category ON transactions(profile_id, category_id);
CREATE INDEX idx_income_profile_date ON income_entries(profile_id, date DESC);
CREATE INDEX idx_income_month ON income_entries(profile_id, month_year);
CREATE INDEX idx_vault_txn_vault ON vault_transactions(vault_id, date DESC);
CREATE INDEX idx_subscriptions_profile ON subscriptions(profile_id, is_active);
CREATE INDEX idx_notifications_profile ON notifications(profile_id, is_read, created_at DESC);
CREATE INDEX idx_ai_learning_merchant ON ai_learning(profile_id, merchant_keyword);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: User can only access their own data
-- Apply this pattern to ALL tables:
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own data" ON profiles
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- For tables with profile_id:
-- (Repeat for each table: income_entries, transactions, categories, etc.)
CREATE POLICY "Users access own transactions" ON transactions
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- Apply same pattern for: income_entries, categories, emergency_vault,
-- vault_transactions, subscriptions, monthly_summaries, ai_learning,
-- sms_templates, notifications, app_settings


-- ============================================================
-- SEED DATA: Default Categories
-- ============================================================
-- (Run after user profile is created — in the onboarding flow)
-- These are inserted with the user's profile_id

/*
Default categories to seed:
  { name: 'Food & Dining',    icon: 'UtensilsCrossed', color: '#A37B6F' }
  { name: 'Transport',        icon: 'Car',             color: '#8B7355' }
  { name: 'Entertainment',    icon: 'Gamepad2',        color: '#7B6B8A' }
  { name: 'Shopping',         icon: 'ShoppingBag',     color: '#6B8A7B' }
  { name: 'Subscriptions',    icon: 'RefreshCw',       color: '#8A7B6B' }
  { name: 'Education',        icon: 'GraduationCap',   color: '#6B707C' }
  { name: 'Health',           icon: 'Heart',           color: '#B85C5C' }
  { name: 'Utilities',        icon: 'Zap',             color: '#C4935A' }
  { name: 'Personal',         icon: 'User',            color: '#6B7D71' }
  { name: 'Other',            icon: 'MoreHorizontal',  color: '#9599A3' }
*/
```

### 5.3 Database Functions (Supabase Edge Functions / SQL Functions)

```sql
-- ============================================================
-- FUNCTION: Calculate current month's available budget
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_monthly_budget(p_profile_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_month TEXT := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  v_result JSONB;
BEGIN
  -- This returns encrypted values; decryption happens client-side
  SELECT jsonb_build_object(
    'month', v_month,
    'total_income', COALESCE(
      (SELECT json_agg(json_build_object('amount', amount_encrypted, 'type', type))
       FROM income_entries
       WHERE profile_id = p_profile_id
         AND month_year = v_month
         AND type IN ('allowance', 'festival_bonus')),
      '[]'::json
    ),
    'total_expenses', COALESCE(
      (SELECT json_agg(json_build_object('amount', amount_encrypted, 'category', category_name))
       FROM transactions
       WHERE profile_id = p_profile_id
         AND month_year = v_month
         AND is_pass_through = FALSE),
      '[]'::json
    ),
    'days_remaining', (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - CURRENT_DATE)::INTEGER,
    'days_elapsed', (CURRENT_DATE - DATE_TRUNC('month', CURRENT_DATE)::DATE)::INTEGER + 1
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Get subscription reminders (due within X days)
-- ============================================================
CREATE OR REPLACE FUNCTION get_upcoming_subscriptions(p_profile_id UUID, p_days INTEGER DEFAULT 3)
RETURNS SETOF subscriptions AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM subscriptions
    WHERE profile_id = p_profile_id
      AND is_active = TRUE
      AND next_billing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: Auto-update monthly_summaries when transaction added
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_update_monthly_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the monthly summary as stale (to be recomputed by the app)
  UPDATE monthly_summaries
  SET updated_at = NOW()
  WHERE profile_id = NEW.profile_id
    AND month_year = NEW.month_year;

  -- If no summary exists, create a placeholder
  INSERT INTO monthly_summaries (profile_id, month_year)
  VALUES (NEW.profile_id, NEW.month_year)
  ON CONFLICT (profile_id, month_year) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_insert
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_monthly_summary();

CREATE TRIGGER on_income_insert
  AFTER INSERT OR UPDATE ON income_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_monthly_summary();
```

---

## 6. AUTHENTICATION & SECURITY ARCHITECTURE

### 6.1 Multi-Layer Security Model

```
LAYER 1: Network Security (Vercel + Supabase)
├── HTTPS everywhere (Vercel auto-TLS)
├── Supabase connection via SSL
├── Rate limiting on API routes
└── CORS: only allow your domain

LAYER 2: Authentication (Clerk)
├── Email/password OR social login
├── Two-Factor Authentication (TOTP — Google Authenticator)
├── Session management (JWT, 15-min access token, 7-day refresh)
├── Device tracking
└── Clerk middleware on ALL protected routes

LAYER 3: App-Level Lock (Custom PIN/Biometric)
├── 4-6 digit PIN stored as bcrypt hash in DB
├── Biometric via Web Authentication API (fingerprint/face)
├── Required on app open (even if Clerk session active)
├── Auto-lock after 5 minutes of inactivity
├── 5 wrong PIN attempts → 30 second lockout, then 60s, then 5min (exponential)
└── PIN is SEPARATE from Clerk — even if session stolen, need PIN

LAYER 4: Data Encryption (Custom — AES-256-GCM)
├── All financial amounts encrypted BEFORE sending to database
├── Encryption key derived from user's master password
├── Key NEVER stored in database — derived each session
├── Even if DB is fully compromised, amounts are gibberish
└── Integrity verification via SHA-256 hashes

LAYER 5: Row Level Security (Supabase RLS)
├── Every table has RLS enabled
├── User can ONLY read/write their own rows
├── Even with a stolen Supabase key, can't access other data
└── (Only 1 user, but defense-in-depth)

LAYER 6: API Security
├── CSRF protection (Clerk handles this)
├── Input validation on ALL routes (Zod schemas)
├── SQL injection prevention (parameterized queries via Supabase SDK)
├── XSS prevention (React auto-escapes, CSP headers)
├── Rate limiting: 60 req/min per endpoint (custom token bucket)
└── Request size limits: 1MB max
```

### 6.2 Custom Encryption Algorithm (AES-256-GCM)

```typescript
// src/lib/crypto.ts — Custom Encryption Module

/**
 * KHARCHA ENCRYPTION SYSTEM
 *
 * Architecture:
 *   Master Password → PBKDF2 (600,000 iterations) → AES-256-GCM Key
 *   Each value encrypted with unique IV (Initialization Vector)
 *   Format: base64(IV + ciphertext + authTag)
 *
 * Flow:
 *   1. User sets master password during onboarding
 *   2. Password → PBKDF2 → encryption key (derived in browser)
 *   3. Key stored ONLY in memory (sessionStorage is forbidden for security)
 *   4. Key stored in a Zustand store that clears on tab close
 *   5. On app reopen: user enters PIN → app re-derives key from PIN + salt
 *
 * IMPORTANT: The master password IS the app PIN (same value, dual purpose)
 *   - PIN unlocks the app (bcrypt hash check)
 *   - PIN also derives the encryption key (PBKDF2)
 *   - This means: forget PIN = lose access to encrypted data
 *   - Recovery: re-encrypt all data with new PIN (requires old PIN)
 */

// --- KEY DERIVATION ---

interface DerivedKeyBundle {
  key: CryptoKey;           // The AES-256-GCM key
  salt: Uint8Array;         // Random salt (stored in DB, not secret)
}

async function deriveKey(pin: string, existingSalt?: Uint8Array): Promise<DerivedKeyBundle> {
  const encoder = new TextEncoder();
  const salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));

  // Import PIN as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-256-GCM key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,  // OWASP 2024 recommendation
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,  // Not extractable
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

// --- ENCRYPTION ---

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine: IV (12 bytes) + Ciphertext (variable) + AuthTag (last 16 bytes of ciphertext)
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

// --- DECRYPTION ---

async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

// --- INTEGRITY HASH ---

async function hashAmount(amount: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(amount));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- PUBLIC API ---
// export { deriveKey, encrypt, decrypt, hashAmount }
```

### 6.3 PIN System Implementation

```typescript
// src/lib/pin.ts — PIN Management

/**
 * PIN SYSTEM
 *
 * Setting PIN (Onboarding):
 *   1. User enters 4-6 digit PIN
 *   2. PIN → bcrypt hash (stored in DB for verification)
 *   3. PIN → PBKDF2 → encryption key (used for all amount encryption)
 *   4. Salt from PBKDF2 stored in DB (not secret)
 *   5. Encryption key held in Zustand memory store
 *
 * Verifying PIN (App Open):
 *   1. User enters PIN
 *   2. PIN → bcrypt hash → compare with DB hash
 *   3. If match: PIN → PBKDF2 (using stored salt) → encryption key
 *   4. Key loaded into Zustand memory store
 *   5. App unlocked
 *
 * Lockout Policy:
 *   Attempt 1-3: Immediate retry
 *   Attempt 4:   15 second lockout
 *   Attempt 5:   30 second lockout
 *   Attempt 6:   60 second lockout
 *   Attempt 7:   5 minute lockout
 *   Attempt 8+:  15 minute lockout
 *   After 15 failed attempts: Account locked, must re-authenticate via Clerk
 *
 * Auto-Lock:
 *   - App goes to background → start 5-minute timer
 *   - Timer expires → clear encryption key from memory → show PIN screen
 *   - User navigates back → must re-enter PIN
 */

const LOCKOUT_SCHEDULE = [0, 0, 0, 15, 30, 60, 300, 900]; // seconds

function getLockoutDuration(attemptCount: number): number {
  if (attemptCount < LOCKOUT_SCHEDULE.length) {
    return LOCKOUT_SCHEDULE[attemptCount];
  }
  return 900; // 15 min for all subsequent attempts
}
```

### 6.4 Rate Limiting (Custom Token Bucket Algorithm)

```typescript
// src/lib/rate-limiter.ts

/**
 * TOKEN BUCKET RATE LIMITER
 *
 * Algorithm:
 *   - Bucket starts with `maxTokens` tokens
 *   - Each request consumes 1 token
 *   - Tokens refill at `refillRate` per second
 *   - If bucket empty → request rejected (429)
 *
 * Config per endpoint:
 *   - General API: 60 tokens, 1/second refill
 *   - AI categorization: 10 tokens, 0.5/second refill
 *   - Auth/PIN: 5 tokens, 0.2/second refill (slow to prevent brute force)
 *   - Tasker webhook: 30 tokens, 1/second refill
 */

interface Bucket {
  tokens: number;
  lastRefill: number; // timestamp
}

const buckets = new Map<string, Bucket>();

function consumeToken(key: string, maxTokens: number, refillRate: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: maxTokens, lastRefill: now };

  // Refill tokens based on time elapsed
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return true; // Request allowed
  }

  buckets.set(key, bucket);
  return false; // Request rejected
}
```

### 6.5 Content Security Policy

```typescript
// next.config.ts — Security Headers

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",  // Clerk turnstile
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.clerk.com",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.clerk.com https://api.exchangerate-api.com",
      "frame-src 'self' https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];
```

### 6.6 Input Validation Schemas (Zod)

```typescript
// src/lib/validations.ts

import { z } from 'zod';

// Amount: must be positive, max 10 digits, max 2 decimal places
const amountSchema = z.string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Invalid amount format')
  .refine(val => parseFloat(val) > 0, 'Amount must be positive')
  .refine(val => parseFloat(val) <= 9999999.99, 'Amount too large');

// Transaction creation
const createTransactionSchema = z.object({
  amount: amountSchema,
  currency: z.enum(['INR', 'USD']).default('INR'),
  category_id: z.string().uuid().optional(),
  description: z.string().min(1).max(200).trim(),
  merchant: z.string().max(100).trim().optional(),
  is_pass_through: z.boolean().default(false),
  linked_income_id: z.string().uuid().optional(),
  is_need: z.boolean().default(true),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// Income creation
const createIncomeSchema = z.object({
  amount: amountSchema,
  currency: z.enum(['INR', 'USD']).default('INR'),
  type: z.enum(['allowance', 'emergency_fund', 'festival_bonus', 'pass_through', 'vault_replenish', 'other']),
  description: z.string().max(200).trim().optional(),
  pass_through_for: z.string().max(200).trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Subscription creation
const createSubscriptionSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  amount: amountSchema,
  currency: z.enum(['INR', 'USD']),
  billing_day: z.number().int().min(1).max(31),
  billing_cycle: z.enum(['monthly', 'yearly']).default('monthly'),
  category_id: z.string().uuid().optional(),
  auto_match_keywords: z.array(z.string().max(50)).max(10).optional(),
  remind_days_before: z.number().int().min(0).max(14).default(3),
});

// SMS paste for parsing
const smsPasteSchema = z.object({
  sms_text: z.string().min(10).max(500).trim(),
});

// PIN setup
const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

// Vault transaction
const vaultTransactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: amountSchema,
  reason: z.string().min(1).max(200).trim(),
});
```

---

## 7. CUSTOM ALGORITHMS

### 7.1 Daily Spending Limit Algorithm

```typescript
// src/lib/algorithms/daily-limit.ts

/**
 * DAILY SPENDING LIMIT CALCULATOR
 *
 * Formula:
 *   available = totalAllowance + totalBonus - totalExpenses - expectedSubscriptions
 *   daysRemaining = daysInMonth - dayOfMonth + 1 (including today)
 *   dailyLimit = available / daysRemaining
 *
 * But we make it SMARTER:
 *   - Weekend days get 1.3x multiplier (you spend more on weekends)
 *   - If today is subscription billing day, subtract that first
 *   - If vault needs replenishment, optionally factor that in
 *   - Minimum daily limit floor: ₹50 (can't go below for emergencies)
 *
 * Burn Rate:
 *   idealSpentByNow = totalBudget * (dayOfMonth / daysInMonth)
 *   actualSpent = totalExpenses
 *   burnRate = actualSpent / idealSpentByNow
 *     < 0.8 → SAFE (green/sage)
 *     0.8-1.0 → CAUTION (amber)
 *     > 1.0 → DANGER (brick)
 *
 * Month-End Prediction:
 *   avgDailySpend = totalExpenses / daysElapsed
 *   projectedTotal = avgDailySpend * daysInMonth
 *   projectedRemaining = totalBudget - projectedTotal
 *   daysUntilBroke = available / avgDailySpend
 */

interface BudgetState {
  totalAllowance: number;
  totalBonus: number;
  totalExpenses: number;      // Excludes pass-through
  expectedSubscriptions: number; // Remaining unpaid subscriptions this month
  dayOfMonth: number;
  daysInMonth: number;
  isWeekend: boolean;
}

interface BudgetResult {
  availableBudget: number;
  dailyLimit: number;
  burnRate: number;            // 0.0 - 2.0+
  burnStatus: 'safe' | 'caution' | 'danger';
  projectedMonthEnd: number;   // Projected remaining at month end
  daysUntilBroke: number | null; // null if won't run out
  weeklyBudget: number;
}

function calculateBudget(state: BudgetState): BudgetResult {
  const {
    totalAllowance, totalBonus, totalExpenses,
    expectedSubscriptions, dayOfMonth, daysInMonth, isWeekend
  } = state;

  const totalBudget = totalAllowance + totalBonus;
  const available = totalBudget - totalExpenses - expectedSubscriptions;
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  const daysElapsed = dayOfMonth;

  // Daily limit with weekend adjustment
  let dailyLimit = available / Math.max(daysRemaining, 1);
  if (isWeekend) {
    dailyLimit *= 1.3; // Weekend gets 30% more
  }
  dailyLimit = Math.max(dailyLimit, 50); // Floor: ₹50

  // Burn rate
  const idealSpentByNow = totalBudget * (daysElapsed / daysInMonth);
  const burnRate = idealSpentByNow > 0 ? totalExpenses / idealSpentByNow : 0;
  const burnStatus = burnRate < 0.8 ? 'safe' : burnRate <= 1.0 ? 'caution' : 'danger';

  // Month-end projection
  const avgDailySpend = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;
  const projectedTotal = avgDailySpend * daysInMonth;
  const projectedMonthEnd = totalBudget - projectedTotal;

  // Days until broke
  const daysUntilBroke = avgDailySpend > 0
    ? Math.floor(available / avgDailySpend)
    : null;

  return {
    availableBudget: Math.max(available, 0),
    dailyLimit: Math.round(dailyLimit),
    burnRate: Math.round(burnRate * 100) / 100,
    burnStatus,
    projectedMonthEnd: Math.round(projectedMonthEnd),
    daysUntilBroke: daysUntilBroke !== null && daysUntilBroke < daysRemaining
      ? daysUntilBroke : null,
    weeklyBudget: Math.round(dailyLimit * 7),
  };
}
```

### 7.2 Subscription Matching Algorithm

```typescript
// src/lib/algorithms/subscription-matcher.ts

/**
 * SUBSCRIPTION AUTO-MATCHING
 *
 * When a new transaction is added, check if it matches any active subscription.
 *
 * Matching Strategy:
 *   1. KEYWORD MATCH: Check transaction description against subscription's auto_match_keywords
 *      - Case-insensitive
 *      - Partial match (e.g., "youtube" matches "YouTube Premium via Google")
 *      - Score: 0.8
 *
 *   2. AMOUNT MATCH: Check if amount is within 5% of subscription amount
 *      - Handles currency conversion for USD subscriptions
 *      - Score: 0.6
 *
 *   3. DATE PROXIMITY: Check if transaction is within ±3 days of billing day
 *      - Score: 0.3
 *
 *   4. COMBINED SCORE: keyword + amount + date
 *      - If score >= 1.0 → AUTO-MATCH (mark as subscription expense)
 *      - If score >= 0.7 → SUGGEST (ask user to confirm)
 *      - If score < 0.7 → NO MATCH
 *
 * After matching:
 *   - Update subscription's last_paid_date
 *   - Calculate next_billing_date
 *   - Link transaction to subscription
 */

interface MatchResult {
  subscription_id: string;
  subscription_name: string;
  confidence: number;
  auto_match: boolean; // true if confidence >= 1.0
}

function matchTransaction(
  description: string,
  amount: number,
  date: Date,
  subscriptions: Subscription[],
  exchangeRate: number // USD to INR
): MatchResult | null {
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const sub of subscriptions) {
    let score = 0;

    // 1. Keyword match
    const keywords = sub.auto_match_keywords || [sub.name.toLowerCase()];
    const descLower = description.toLowerCase();
    if (keywords.some(kw => descLower.includes(kw.toLowerCase()))) {
      score += 0.8;
    }

    // 2. Amount match (within 5%)
    const subAmountINR = sub.currency === 'USD'
      ? sub.amount * exchangeRate
      : sub.amount;
    const amountDiff = Math.abs(amount - subAmountINR) / subAmountINR;
    if (amountDiff <= 0.05) {
      score += 0.6;
    } else if (amountDiff <= 0.15) {
      score += 0.3; // Partial credit for close amounts
    }

    // 3. Date proximity
    const txDay = date.getDate();
    const billingDay = sub.billing_day;
    const dayDiff = Math.abs(txDay - billingDay);
    if (dayDiff <= 3) {
      score += 0.3;
    } else if (dayDiff <= 7) {
      score += 0.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        subscription_id: sub.id,
        subscription_name: sub.name,
        confidence: Math.round(score * 100) / 100,
        auto_match: score >= 1.0,
      };
    }
  }

  return bestScore >= 0.7 ? bestMatch : null;
}
```

### 7.3 Anomaly Detection Algorithm

```typescript
// src/lib/algorithms/anomaly-detector.ts

/**
 * SPENDING ANOMALY DETECTOR
 *
 * Detects unusual spending patterns:
 *
 * 1. SINGLE TRANSACTION ANOMALY:
 *    - Calculate rolling 30-day average transaction amount per category
 *    - If new transaction > 2.5x category average → FLAG
 *    - If new transaction > 50% of daily limit → WARN
 *
 * 2. DAILY TOTAL ANOMALY:
 *    - Calculate average daily spend over last 30 days
 *    - If today's total > 2x average → FLAG
 *
 * 3. VELOCITY ANOMALY:
 *    - If 3+ transactions in 1 hour → "Spending spree detected"
 *
 * 4. CATEGORY SHIFT:
 *    - If a category's % of total spend jumps >15% from last month → NOTE
 *
 * Notifications:
 *    - FLAG → Push notification + in-app alert
 *    - WARN → In-app alert only
 *    - NOTE → Mentioned in monthly summary only
 */

interface AnomalyResult {
  type: 'single_transaction' | 'daily_total' | 'velocity' | 'category_shift';
  severity: 'flag' | 'warn' | 'note';
  message: string;
  details: Record<string, unknown>;
}

// Implementation runs on each transaction creation
// Uses the last 30 days of data from the monthly_summaries + transactions tables
// Computes averages, checks thresholds, returns anomalies
```

### 7.4 Pass-Through Linking Algorithm

```typescript
// src/lib/algorithms/pass-through.ts

/**
 * PASS-THROUGH LINKING
 *
 * When dad sends money specifically for a bill (e.g., college fees),
 * we create a linked pair that nets to ₹0 in the budget.
 *
 * Flow:
 *   1. User logs income as type='pass_through' with description "College fees"
 *   2. App creates income_entry with pass_through_for="College fees Q1"
 *   3. When the fee is actually paid:
 *      a. User logs expense as usual
 *      b. User toggles "This is a pass-through expense"
 *      c. App shows list of unlinked pass-through incomes
 *      d. User selects the matching income
 *      e. Transaction is marked: is_pass_through=true, linked_income_id=<income_id>
 *      f. Income entry updated: linked_expense_id=<transaction_id>
 *   4. In budget calculations: pass-through transactions are EXCLUDED
 *   5. In analytics: shown separately as "Pass-through" with net ₹0
 *
 * Edge cases:
 *   - Partial pass-through: Income ₹50,000 but fee is ₹48,000
 *     → Remaining ₹2,000 stays as unlinked pass-through income
 *     → User can manually re-tag remaining as allowance/bonus
 *   - Multiple expenses for one income: Allowed (one-to-many linking)
 */
```

---

## 8. API ROUTES & SERVER ACTIONS

### 8.1 Architecture Decision

We use **Next.js Server Actions** for mutations (create, update, delete) and **Route Handlers** for data fetching and external integrations.

### 8.2 Route Map

```
SERVER ACTIONS (src/app/actions/):
===================================
transactions.ts
  ├── createTransaction(data)     — Add new expense
  ├── updateTransaction(id, data) — Edit expense
  ├── deleteTransaction(id)       — Delete expense
  └── bulkCategorize(ids, cat)    — Bulk category update

income.ts
  ├── createIncome(data)          — Log income entry
  ├── updateIncome(id, data)      — Edit income
  └── deleteIncome(id)            — Delete income

vault.ts
  ├── depositToVault(data)        — Add to emergency fund
  ├── withdrawFromVault(data)     — Withdraw from vault
  └── updateVaultTarget(amount)   — Set vault target

subscriptions.ts
  ├── createSubscription(data)    — Register subscription
  ├── updateSubscription(id, data)— Edit subscription
  ├── deleteSubscription(id)      — Remove subscription
  └── markAsPaid(id, txnId)       — Link payment to subscription

categories.ts
  ├── createCategory(data)        — Add custom category
  ├── updateCategory(id, data)    — Edit category
  └── deleteCategory(id)          — Remove category

settings.ts
  ├── updateProfile(data)         — Update user profile
  ├── setupPin(pin)               — Set/change app PIN
  ├── verifyPin(pin)              — Verify PIN (returns encryption key derivation)
  └── updateSettings(data)        — Update app settings


ROUTE HANDLERS (src/app/api/):
===============================
/api/budget/monthly          GET    — Current month budget calculation
/api/budget/daily-limit      GET    — Today's daily limit + burn rate
/api/analytics/monthly/[ym]  GET    — Analytics for specific month
/api/analytics/trends        GET    — Multi-month trend data
/api/analytics/categories    GET    — Category breakdown
/api/subscriptions/upcoming  GET    — Upcoming renewals
/api/ai/categorize           POST   — AI categorize a transaction
/api/ai/parse-sms            POST   — Parse bank SMS text
/api/ai/monthly-summary      POST   — Generate AI monthly summary
/api/exchange-rate           GET    — Get current USD/INR rate
/api/export/csv              GET    — Export transactions as CSV
/api/export/pdf              GET    — Export monthly report as PDF
/api/webhook/tasker           POST   — Receive SMS from Tasker (webhook)
/api/notifications            GET    — Get unread notifications
/api/notifications/read       POST   — Mark notification as read
/api/health                   GET    — Health check (for monitoring)
```

### 8.3 Server Action Pattern

```typescript
// src/app/actions/transactions.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { createTransactionSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createTransaction(formData: unknown) {
  // 1. Authenticate
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // 2. Validate input
  const parsed = createTransactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 3. Get user profile
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) throw new Error('Profile not found')

  // 4. NOTE: Amount comes already encrypted from client
  //    Client encrypts before calling this action
  const { amount_encrypted, amount_hash, ...rest } = parsed.data

  // 5. Check subscription match (if AI is enabled)
  // ... subscription matching logic

  // 6. Insert transaction
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      profile_id: profile.id,
      amount_encrypted,
      amount_hash,
      ...rest,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 7. Check for anomalies
  // ... anomaly detection

  // 8. Revalidate cache
  revalidatePath('/dashboard')
  revalidatePath('/transactions')

  return { success: true, data }
}
```

---

## 9. COMPONENT ARCHITECTURE

### 9.1 Folder Structure

```
src/
├── app/
│   ├── layout.tsx                 -- Root layout (fonts, providers, bottom nav)
│   ├── page.tsx                   -- Dashboard (home)
│   ├── loading.tsx                -- Pencil sketch skeleton
│   ├── error.tsx                  -- Error boundary
│   ├── (auth)/
│   │   ├── sign-in/page.tsx       -- Clerk sign-in
│   │   ├── sign-up/page.tsx       -- Clerk sign-up
│   │   └── pin/page.tsx           -- App PIN entry screen
│   ├── onboarding/
│   │   └── page.tsx               -- First-time setup wizard
│   ├── transactions/
│   │   ├── page.tsx               -- Transaction list
│   │   └── [id]/page.tsx          -- Transaction detail
│   ├── analytics/
│   │   └── page.tsx               -- Charts & analytics
│   ├── vault/
│   │   └── page.tsx               -- Emergency vault
│   ├── subscriptions/
│   │   └── page.tsx               -- Subscription manager
│   ├── settings/
│   │   └── page.tsx               -- Settings & preferences
│   ├── actions/                   -- Server actions (see Section 8)
│   └── api/                       -- Route handlers (see Section 8)
│
├── components/
│   ├── ui/                        -- Base UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx              -- Bottom sheet modal
│   │   ├── Toggle.tsx
│   │   ├── Skeleton.tsx           -- Pencil sketch skeleton
│   │   ├── Toast.tsx
│   │   └── ProgressRing.tsx       -- Circular progress (vault health)
│   │
│   ├── layout/
│   │   ├── BottomNav.tsx          -- Bottom navigation bar
│   │   ├── Header.tsx             -- Page header with title
│   │   ├── PageTransition.tsx     -- Page turn animation wrapper
│   │   └── PinLockScreen.tsx      -- PIN/biometric lock overlay
│   │
│   ├── dashboard/
│   │   ├── BalanceCard.tsx        -- Main balance with odometer
│   │   ├── DailyLimitCard.tsx     -- Today's limit + burn rate
│   │   ├── VaultPreview.tsx       -- Vault health mini card
│   │   ├── RecentTransactions.tsx -- Last 5 transactions
│   │   ├── SubscriptionAlert.tsx  -- Upcoming renewal card
│   │   └── QuickStats.tsx         -- Week/month quick numbers
│   │
│   ├── transactions/
│   │   ├── TransactionList.tsx    -- Filterable transaction list
│   │   ├── TransactionItem.tsx    -- Single transaction row
│   │   ├── TransactionDetail.tsx  -- Detail view
│   │   ├── AddExpenseModal.tsx    -- Ink spread add form
│   │   ├── AddIncomeModal.tsx     -- Income entry form
│   │   ├── SmartPasteInput.tsx    -- SMS paste → AI parse
│   │   ├── CategoryPicker.tsx     -- Category selection with stamps
│   │   ├── FilterBar.tsx          -- Date, category, type filters
│   │   └── NeedWantToggle.tsx     -- Need vs Want toggle
│   │
│   ├── vault/
│   │   ├── VaultDoor.tsx          -- Animated vault door
│   │   ├── VaultBalance.tsx       -- Balance display
│   │   ├── VaultHistory.tsx       -- Deposit/withdrawal ledger
│   │   ├── DepositModal.tsx       -- Add to vault
│   │   └── WithdrawModal.tsx      -- Withdraw from vault
│   │
│   ├── subscriptions/
│   │   ├── SubscriptionList.tsx   -- All subscriptions
│   │   ├── SubscriptionCard.tsx   -- Single subscription
│   │   ├── AddSubscription.tsx    -- Add/edit subscription form
│   │   └── BurnRateCard.tsx       -- Total monthly subscription cost
│   │
│   ├── analytics/
│   │   ├── CategoryPieChart.tsx   -- Animated pie chart
│   │   ├── SpendingTrendLine.tsx  -- Monthly trend line
│   │   ├── CalendarHeatmap.tsx    -- Daily spending heatmap
│   │   ├── NeedsVsWants.tsx       -- Ratio visualization
│   │   ├── MonthComparison.tsx    -- Month-over-month bars
│   │   └── AISummary.tsx          -- AI-generated insights
│   │
│   ├── animations/
│   │   ├── InkSpread.tsx          -- Ink spread transition
│   │   ├── OdometerValue.tsx      -- Rolling digit display
│   │   ├── StaggerContainer.tsx   -- Staggered children animation
│   │   ├── PaperCrumple.tsx       -- Delete animation
│   │   ├── GoldenShimmer.tsx      -- Success shimmer effect
│   │   └── PencilSkeleton.tsx     -- Loading skeleton
│   │
│   └── shared/
│       ├── AmountDisplay.tsx      -- Formatted ₹ amount with font-mono
│       ├── DateDisplay.tsx        -- Relative date ("2 hours ago")
│       ├── EmptyState.tsx         -- Beautiful empty state with Lottie
│       ├── ErrorBoundary.tsx      -- Error handling
│       └── NotificationBell.tsx   -- Header notification icon
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              -- Browser Supabase client
│   │   ├── server.ts              -- Server Supabase client
│   │   └── middleware.ts          -- Supabase auth middleware
│   │
│   ├── crypto.ts                  -- Encryption module (Section 6.2)
│   ├── pin.ts                     -- PIN management (Section 6.3)
│   ├── rate-limiter.ts            -- Rate limiting (Section 6.4)
│   ├── validations.ts             -- Zod schemas (Section 6.6)
│   ├── animations.ts              -- Animation config (Section 4.2)
│   ├── constants.ts               -- App constants
│   ├── utils.ts                   -- Utility functions
│   ├── format.ts                  -- Number/date formatting
│   │
│   ├── algorithms/
│   │   ├── daily-limit.ts         -- Budget calculator (Section 7.1)
│   │   ├── subscription-matcher.ts-- Sub matching (Section 7.2)
│   │   ├── anomaly-detector.ts    -- Anomaly detection (Section 7.3)
│   │   ├── pass-through.ts        -- Pass-through linking (Section 7.4)
│   │   └── sms-parser.ts          -- SMS parsing (Section 12)
│   │
│   └── ai/
│       ├── categorize.ts          -- Claude API categorization
│       ├── parse-sms.ts           -- Claude SMS parsing
│       └── monthly-summary.ts     -- Claude monthly summary generation
│
├── stores/
│   ├── encryption-store.ts        -- Zustand: encryption key in memory
│   ├── budget-store.ts            -- Zustand: current budget state
│   └── ui-store.ts                -- Zustand: UI state (modals, active page)
│
├── hooks/
│   ├── useEncryption.ts           -- Encrypt/decrypt amounts
│   ├── useBudget.ts               -- Budget calculations
│   ├── useTransactions.ts         -- TanStack Query: transactions
│   ├── useIncome.ts               -- TanStack Query: income
│   ├── useVault.ts                -- TanStack Query: vault
│   ├── useSubscriptions.ts        -- TanStack Query: subscriptions
│   ├── useAnalytics.ts            -- TanStack Query: analytics
│   ├── usePinLock.ts              -- PIN lock/unlock logic
│   ├── useInactivityTimer.ts      -- Auto-lock timer
│   └── useOfflineQueue.ts         -- Offline transaction queue
│
├── types/
│   └── index.ts                   -- All TypeScript interfaces/types
│
└── public/
    ├── manifest.json              -- PWA manifest
    ├── sw.js                      -- Service worker (generated by Serwist)
    ├── icons/                     -- PWA icons (192x192, 512x512)
    ├── splash/                    -- PWA splash screens
    └── lottie/                    -- Lottie animation JSON files
        ├── success-check.json
        ├── loading-pen.json
        └── empty-notebook.json
```

### 9.2 Key Component Specifications

#### OdometerValue Component

```typescript
// components/animations/OdometerValue.tsx

/**
 * ODOMETER / VALUE ROLL COMPONENT
 *
 * Displays a number where each digit scrolls independently like a slot machine.
 *
 * Props:
 *   value: number          — The target number to display
 *   prefix?: string        — "₹" or "$"
 *   duration?: number      — Animation duration per digit (ms), default 800
 *   className?: string     — Additional classes
 *
 * Implementation:
 *   1. Split number into individual digit strings: "12,345" → ["1","2",",","3","4","5"]
 *   2. Each digit gets a column container with height = 1 digit
 *   3. Column contains strip of 0-9 (for digits) stacked vertically
 *   4. Animate translateY to show the correct digit
 *   5. When digit changes: strip scrolls smoothly to new position
 *   6. Spring animation with slight overshoot for "mechanical click" feel
 *   7. Comma separators slide in/out as number grows/shrinks
 *   8. Currency prefix stays static
 *
 * Visual:
 *   ₹ [1][2],[3][4][5]
 *       ↕   ↕   ↕ ↕ ↕  ← each column scrolls independently
 *
 * GSAP usage:
 *   Use GSAP for coordinating multiple digit animations
 *   Each digit column gets a slightly different delay (right-to-left cascade)
 */
```

#### InkSpread Component

```typescript
// components/animations/InkSpread.tsx

/**
 * INK SPREAD TRANSITION
 *
 * Used when opening the "Add Expense" modal.
 * The FAB button's position becomes the origin point for an expanding circle.
 *
 * Implementation:
 *   1. On FAB click: capture button center coordinates (x, y)
 *   2. Create overlay div with position: fixed, covering viewport
 *   3. Set background: var(--bg-surface) (parchment)
 *   4. Animate clip-path: circle(0% at Xpx Ypx) → circle(150% at Xpx Ypx)
 *   5. At ~40% expansion: begin fading in form content
 *   6. Add subtle CSS paper texture to the overlay
 *   7. On close: reverse animation (ink contracts back to origin)
 *
 * Framer Motion:
 *   <motion.div
 *     initial={{ clipPath: `circle(0% at ${origin.x}px ${origin.y}px)` }}
 *     animate={{ clipPath: `circle(150% at ${origin.x}px ${origin.y}px)` }}
 *     exit={{ clipPath: `circle(0% at ${origin.x}px ${origin.y}px)` }}
 *     transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
 *   />
 */
```

---

## 10. PAGE-BY-PAGE SPECIFICATION

### 10.1 Dashboard (Home — `/`)

```
LAYOUT:
┌─────────────────────────────┐
│  Header: "Kharcha" + 🔔     │  ← Notification bell with badge
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │  BALANCE CARD         │  │  ← Main balance (odometer animation)
│  │  ₹12,345              │  │     font-display text-4xl
│  │  Available this month  │  │     Subtitle: "Available this month"
│  │  ───────────────────  │  │     Progress bar: spent / total
│  │  ₹8,655 of ₹21,000   │  │
│  └───────────────────────┘  │
│                             │
│  ┌────────┐ ┌────────────┐  │  ← Two cards side by side
│  │ DAILY  │ │ VAULT      │  │
│  │ LIMIT  │ │ ₹5,000     │  │
│  │ ₹535   │ │ 🟢 Healthy │  │
│  │ 🟢Safe │ │            │  │
│  └────────┘ └────────────┘  │
│                             │
│  ⚠️ YouTube Premium renews  │  ← Subscription alert (if applicable)
│     in 2 days (₹149)       │
│                             │
│  Recent Transactions        │  ← Section title
│  ┌───────────────────────┐  │
│  │ Zomato    -₹350  Food │  │  ← Last 5 transactions
│  │ Uber      -₹120  Trns │  │     Amount in terracotta
│  │ Allowance +₹21K  Inc  │  │     Income in sage
│  │ Amazon    -₹899  Shop │  │
│  │ Chai      -₹30   Food │  │
│  └───────────────────────┘  │
│  View All →                 │
│                             │
│         [+ FAB]             │  ← Floating action button (animate: float)
├─────────────────────────────┤
│  🏠  📊  ➕  🛡️  ⚙️       │  ← Bottom nav (5 items)
│ Home Trans   Vault Settings │
└─────────────────────────────┘

ANIMATIONS ON THIS PAGE:
- Cards: Rise from paper (staggered 100ms)
- Balance: Odometer roll on load
- Progress bar: Width animates from 0 to actual
- FAB: Floating 2px oscillation
- Subscription alert: Slide in from right
- Page entry: Page turn animation
```

### 10.2 Transactions (`/transactions`)

```
LAYOUT:
┌─────────────────────────────┐
│  Header: "Transactions" + 🔍│
├─────────────────────────────┤
│  [Smart Paste 📋] [Filter ⚙] │  ← Paste SMS button + Filter toggle
│                              │
│  ┌──────────────────────────┐│
│  │ Filter Bar (collapsible) ││  ← Date range, Category, Type
│  │ [This Month ▾] [All ▾]  ││     (needs/wants/pass-through)
│  └──────────────────────────┘│
│                              │
│  Today, Feb 21               │  ← Date group header
│  ┌──────────────────────────┐│
│  │ 🍕 Zomato                ││  ← Category icon + merchant
│  │    Food > Delivery       ││     Category > subcategory
│  │    2:30 PM         -₹350 ││     Time + amount (terracotta)
│  ├──────────────────────────┤│
│  │ 🚗 Uber                  ││
│  │    Transport             ││
│  │    11:15 AM        -₹120 ││
│  └──────────────────────────┘│
│                              │
│  Yesterday, Feb 20           │
│  ┌──────────────────────────┐│
│  │ ↓ Monthly Allowance      ││  ← Income (sage color, down arrow)
│  │    Allowance             ││
│  │    10:00 AM      +₹21,000││
│  └──────────────────────────┘│
│                              │
│         [+ FAB]              │
├──────────────────────────────┤
│  Bottom Nav                  │
└──────────────────────────────┘

ANIMATIONS:
- List items: Slide & settle (staggered)
- Swipe left on item: Reveals delete (paper crumple) + edit
- Pull down: Pen nib pull-to-refresh
- New transaction added: Drops in from top with bounce
- Smart Paste: Modal slides up from bottom
```

### 10.3 Analytics (`/analytics`)

```
LAYOUT:
┌────────────────────────────────┐
│  Header: "Analytics"           │
│  [Jan] [Feb ●] [Mar] ← → │  ← Scrollable month picker
├────────────────────────────────┤
│  ┌────────────────────────────┐│
│  │  SPENDING OVERVIEW         ││
│  │  Total: ₹18,500           ││  ← Odometer
│  │  Daily Avg: ₹880          ││
│  │  vs Last Month: +12% ↑    ││  ← Red if up, green if down
│  └────────────────────────────┘│
│                                │
│  ┌────────────────────────────┐│
│  │  CATEGORY BREAKDOWN (Pie) ││  ← Animated pie chart
│  │      [🍕 40%]             ││     Segments grow from center
│  │    [🚗 20%] [🎮 15%]     ││     Tap segment = expand detail
│  │      [📦 25%]             ││
│  └────────────────────────────┘│
│                                │
│  ┌────────────────────────────┐│
│  │  NEEDS vs WANTS            ││  ← Horizontal stacked bar
│  │  [███████ 65%|░░░ 35%]    ││     Sage for needs, terracotta wants
│  └────────────────────────────┘│
│                                │
│  ┌────────────────────────────┐│
│  │  SPENDING TREND (Line)     ││  ← Line chart draws itself
│  │  ╱╲  ╱╲                    ││     6-month trend
│  │ ╱  ╲╱  ╲╱                  ││
│  └────────────────────────────┘│
│                                │
│  ┌────────────────────────────┐│
│  │  CALENDAR HEATMAP          ││  ← Days of month, color intensity
│  │  M T W T F S S            ││     = spending level
│  │  □ □ ■ □ □ ■ ■            ││     Darker = more spent
│  │  □ ■ □ □ ■ □ □            ││
│  └────────────────────────────┘│
│                                │
│  ┌────────────────────────────┐│
│  │ 🤖 AI INSIGHTS             ││  ← Claude-generated summary
│  │ "Your food spending rose   ││     Monthly AI analysis
│  │  15% this month, mainly    ││
│  │  from delivery orders..."  ││
│  └────────────────────────────┘│
│                                │
│  [Export PDF 📄] [Export CSV 📊]│
├────────────────────────────────┤
│  Bottom Nav                    │
└────────────────────────────────┘
```

### 10.4 Vault (`/vault`)

```
LAYOUT:
┌────────────────────────────────┐
│  Header: "Emergency Vault" 🛡️  │
├────────────────────────────────┤
│                                │
│     ┌──────────────────┐       │
│     │                  │       │  ← Vault door animation
│     │   🔒 VAULT       │       │     On page load: door "opens"
│     │                  │       │     Circular vault visual
│     │   ₹5,000         │       │     Balance in font-display
│     │   ━━━━━━━━━━━    │       │     Progress ring around it
│     │   Target: ₹10K   │       │     Shows % of target
│     │                  │       │
│     └──────────────────┘       │
│                                │
│  Status: 🟢 Healthy            │  ← Green if >50% target
│  Last deposit: Jan 3, 2026     │     Yellow if 25-50%
│  Last withdrawal: None         │     Red if <25%
│                                │
│  ┌────────────┐ ┌────────────┐ │
│  │  Deposit    │ │  Withdraw  │ │  ← Two action buttons
│  │  + Add      │ │  - Take    │ │     Deposit: sage bg
│  └────────────┘ └────────────┘ │     Withdraw: terracotta bg
│                                │
│  Vault History                 │
│  ┌────────────────────────────┐│
│  │ + ₹5,000  Initial deposit ││  ← Chronological ledger
│  │   Jan 3, 2026             ││     Deposits in sage
│  ├────────────────────────────┤│     Withdrawals in terracotta
│  │ - ₹1,000  Medical urgent  ││     With reason text
│  │   Feb 10, 2026            ││
│  ├────────────────────────────┤│
│  │ + ₹1,000  Dad replenished ││
│  │   Feb 15, 2026            ││
│  └────────────────────────────┘│
├────────────────────────────────┤
│  Bottom Nav                    │
└────────────────────────────────┘

ANIMATIONS:
- Vault door: GSAP timeline — handle turns, door swings open
- Balance: Odometer roll
- Progress ring: SVG stroke-dashoffset animates from 0
- History items: Staggered slide-in
- Deposit: Coins drop into vault (particle effect)
- Withdraw: Vault door creaks, amount floats out
```

### 10.5 Subscriptions (`/subscriptions`)

```
LAYOUT:
┌────────────────────────────────┐
│  Header: "Subscriptions"       │
├────────────────────────────────┤
│  ┌────────────────────────────┐│
│  │  MONTHLY BURN RATE         ││
│  │  ₹2,800 / month           ││  ← Total subscriptions cost
│  │  5 active subscriptions    ││
│  └────────────────────────────┘│
│                                │
│  ⚠️ Due Soon                   │  ← Section: upcoming 7 days
│  ┌────────────────────────────┐│
│  │ ▶️ YouTube Premium          ││  ← Logo/icon + name
│  │   ₹149 · Due in 2 days    ││     Amount + days until due
│  │   Renews: Feb 23           ││     Status: pending/paid
│  └────────────────────────────┘│
│                                │
│  Active Subscriptions          │  ← Section: all active
│  ┌────────────────────────────┐│
│  │ 🐙 GitHub Copilot          ││
│  │   $15/mo (≈₹1,250)        ││  ← Shows both currencies
│  │   Day 15 · ✅ Paid          ││
│  ├────────────────────────────┤│
│  │ 🎵 Spotify                 ││
│  │   ₹119/mo                  ││
│  │   Day 8 · ✅ Paid           ││
│  └────────────────────────────┘│
│                                │
│  [+ Add Subscription]          │  ← Button to add new
├────────────────────────────────┤
│  Bottom Nav                    │
└────────────────────────────────┘
```

### 10.6 Settings (`/settings`)

```
LAYOUT:
┌────────────────────────────────┐
│  Header: "Settings"            │
├────────────────────────────────┤
│  SECURITY                      │
│  ┌────────────────────────────┐│
│  │ App PIN         [Change →] ││
│  │ Biometric Lock  [Toggle]   ││
│  │ Auto-Lock Timer  [5 min ▾] ││
│  └────────────────────────────┘│
│                                │
│  BUDGET                        │
│  ┌────────────────────────────┐│
│  │ Budget Alert %   [80% ▾]  ││  ← Alert when X% spent
│  │ Daily Limit      [Toggle]  ││
│  │ Weekend Bonus    [Toggle]  ││
│  └────────────────────────────┘│
│                                │
│  AI & AUTOMATION               │
│  ┌────────────────────────────┐│
│  │ AI Categorization [Toggle] ││
│  │ Tasker Integration [Setup] ││
│  │ SMS Bank Patterns  [Edit]  ││
│  └────────────────────────────┘│
│                                │
│  NOTIFICATIONS                 │
│  ┌────────────────────────────┐│
│  │ Push Notifications [Toggle]││
│  │ Subscription Alerts[Toggle]││
│  │ Budget Warnings   [Toggle] ││
│  │ Anomaly Alerts    [Toggle] ││
│  └────────────────────────────┘│
│                                │
│  DATA                          │
│  ┌────────────────────────────┐│
│  │ Export All Data    [CSV →] ││
│  │ Manage Categories  [Edit →]││
│  │ About Kharcha      [→]    ││
│  └────────────────────────────┘│
├────────────────────────────────┤
│  Bottom Nav                    │
└────────────────────────────────┘
```

---

## 11. AI INTELLIGENCE LAYER

### 11.1 Claude API Integration

```typescript
// src/lib/ai/categorize.ts

/**
 * AI CATEGORIZATION
 *
 * Uses Claude Sonnet 4.5 for fast, cheap categorization.
 *
 * Flow:
 *   1. User adds transaction: "Zomato ₹350"
 *   2. First: Check ai_learning table for known merchant
 *      - If "zomato" found with user_corrected_category → use that (no API call)
 *   3. If not found: Check keyword rules (static mapping)
 *      - "zomato"|"swiggy"|"uber eats" → Food > Delivery
 *   4. If still not found: Call Claude API
 *   5. Claude returns: { category, subcategory, is_need, confidence }
 *   6. Store in ai_learning for future (so we don't call API again for "zomato")
 *
 * This means:
 *   - First time seeing a merchant: API call (~$0.001)
 *   - Second+ time: Free (cached in DB)
 *   - Common merchants: Free (keyword rules)
 *   - Expected API calls: ~10-20/month = $0.01-0.02/month
 */

const CATEGORIZE_PROMPT = `You are a transaction categorizer for a personal expense tracker in India.

Given a transaction description, categorize it.

CATEGORIES (use exact names):
- Food & Dining (subcategories: Restaurant, Delivery, Groceries, Cafe, Street Food)
- Transport (subcategories: Uber/Ola, Auto, Fuel, Metro, Bus, Parking)
- Entertainment (subcategories: Movies, Games, Streaming, Events, Outings)
- Shopping (subcategories: Clothes, Electronics, Amazon, Flipkart, General)
- Subscriptions (subcategories: Streaming, SaaS, Membership, Cloud)
- Education (subcategories: Books, Courses, Stationery, Fees)
- Health (subcategories: Medicine, Doctor, Gym, Supplements)
- Utilities (subcategories: Mobile Recharge, Internet, Electricity)
- Personal (subcategories: Grooming, Gifts, Charity)
- Other (subcategories: Miscellaneous)

Respond ONLY with JSON, no markdown, no explanation:
{
  "category": "exact category name",
  "subcategory": "subcategory or null",
  "is_need": true/false,
  "confidence": 0.0-1.0
}

Transaction: "{description}" Amount: {amount} {currency}`;


// --- KEYWORD RULES (Free, no API) ---
const KEYWORD_RULES: Record<string, { category: string; subcategory: string; is_need: boolean }> = {
  // Food
  'zomato': { category: 'Food & Dining', subcategory: 'Delivery', is_need: false },
  'swiggy': { category: 'Food & Dining', subcategory: 'Delivery', is_need: false },
  'uber eats': { category: 'Food & Dining', subcategory: 'Delivery', is_need: false },
  'mcdonalds': { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'dominos': { category: 'Food & Dining', subcategory: 'Restaurant', is_need: false },
  'starbucks': { category: 'Food & Dining', subcategory: 'Cafe', is_need: false },
  'bigbasket': { category: 'Food & Dining', subcategory: 'Groceries', is_need: true },
  'blinkit': { category: 'Food & Dining', subcategory: 'Groceries', is_need: true },
  'zepto': { category: 'Food & Dining', subcategory: 'Groceries', is_need: true },

  // Transport
  'uber': { category: 'Transport', subcategory: 'Uber/Ola', is_need: true },
  'ola': { category: 'Transport', subcategory: 'Uber/Ola', is_need: true },
  'rapido': { category: 'Transport', subcategory: 'Auto', is_need: true },
  'metro': { category: 'Transport', subcategory: 'Metro', is_need: true },

  // Shopping
  'amazon': { category: 'Shopping', subcategory: 'Amazon', is_need: false },
  'flipkart': { category: 'Shopping', subcategory: 'Flipkart', is_need: false },
  'myntra': { category: 'Shopping', subcategory: 'Clothes', is_need: false },
  'ajio': { category: 'Shopping', subcategory: 'Clothes', is_need: false },

  // Subscriptions
  'youtube': { category: 'Subscriptions', subcategory: 'Streaming', is_need: false },
  'netflix': { category: 'Subscriptions', subcategory: 'Streaming', is_need: false },
  'spotify': { category: 'Subscriptions', subcategory: 'Streaming', is_need: false },
  'github': { category: 'Subscriptions', subcategory: 'SaaS', is_need: true },
  'copilot': { category: 'Subscriptions', subcategory: 'SaaS', is_need: true },

  // Utilities
  'jio': { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'airtel': { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
  'vi': { category: 'Utilities', subcategory: 'Mobile Recharge', is_need: true },
};
```

### 11.2 Monthly AI Summary

```typescript
// src/lib/ai/monthly-summary.ts

/**
 * MONTHLY AI SUMMARY
 *
 * Generated at month end (or on-demand).
 * Sends aggregated (non-encrypted plain) data to Claude for analysis.
 *
 * IMPORTANT: Only decrypted data is sent — amounts are decrypted client-side,
 * then sent as plain numbers in the API call. The AI never sees encrypted data.
 *
 * Prompt includes:
 *   - Total income, expenses, savings
 *   - Category breakdown (% and amounts)
 *   - Needs vs Wants ratio
 *   - Top 5 largest expenses
 *   - Subscription total
 *   - Comparison with previous month
 *   - Any anomalies detected
 *
 * Claude generates:
 *   - 3-4 sentence summary of spending habits
 *   - 2 positive observations
 *   - 2 areas for improvement
 *   - 1 specific actionable tip
 */

const SUMMARY_PROMPT = `You are a friendly personal finance advisor for a college student in India.
Analyze their monthly spending data and give a brief, encouraging but honest summary.

Keep tone: warm, like a supportive older sibling. Use ₹ for amounts.
Be specific with numbers. Don't be preachy.

Format your response as:
SUMMARY: (3-4 sentences overview)
WINS: (2 bullet points of positive observations)
WATCH: (2 bullet points of areas to improve)
TIP: (1 specific actionable tip for next month)

Monthly Data:
{data}`;
```

---

## 12. SMS PARSING SYSTEM

### 12.1 Indian Bank SMS Patterns

```typescript
// src/lib/algorithms/sms-parser.ts

/**
 * BANK SMS PARSER
 *
 * Indian banks send SMS in predictable formats. We parse them using regex.
 *
 * Common Indian bank SMS patterns:
 *
 * HDFC: "Rs.350.00 debited from a/c **1234 on 21-02-26 to VPA merchant@upi. UPI Ref: 123456"
 * SBI:  "Your a/c X1234 debited by Rs.350.00 on 21Feb26 transfer to MERCHANT Ref No 123456"
 * ICICI: "Amt Debited:INR 350.00, Ac XX1234, 21-02-2026. Info: UPI/MERCHANT/123456"
 * Axis: "INR 350.00 has been debited from A/C no. XX1234 on 21-02-2026. UPI:MERCHANT"
 * Kotak: "Rs 350.00 debited from your A/c XX1234 on 21/02/2026 towards UPI-MERCHANT"
 * Paytm: "Paid Rs.350 to MERCHANT from Paytm wallet"
 *
 * Credit patterns:
 * "Rs.21,000.00 credited to a/c **1234 on 21-02-26. UPI Ref: 123456"
 * "Your a/c X1234 credited by Rs.21000.00 on 21Feb26"
 */

interface ParsedSMS {
  amount: number;
  type: 'debit' | 'credit';
  merchant: string | null;
  account_last4: string | null;
  date: string | null;
  reference: string | null;
  bank: string | null;
  raw: string;
  confidence: number; // 0-1
}

// Master regex patterns for Indian banks
const SMS_PATTERNS = [
  // Pattern 1: "Rs.XXX.XX debited/credited from/to a/c"
  {
    regex: /(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d{0,2})\s+(?:has been\s+)?(debited|credited)\s+(?:from|to)\s+(?:a\/c|A\/C|your\s+(?:a\/c|account))\s*\**(?:no\.?\s*)?[Xx]*(\d{4})/i,
    amountGroup: 1,
    typeGroup: 2,
    accountGroup: 3,
  },
  // Pattern 2: "Ac XXXX debited/credited by Rs.XXX"
  {
    regex: /(?:a\/c|Ac|A\/C)\s*[Xx]*(\d{4})\s+(?:has been\s+)?(debited|credited)\s+(?:by|for)\s+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d{0,2})/i,
    amountGroup: 3,
    typeGroup: 2,
    accountGroup: 1,
  },
  // Pattern 3: "Amt Debited:INR XXX, Ac XXXX"
  {
    regex: /Amt\s+(Debited|Credited):?\s*(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d{0,2}),?\s*(?:Ac|A\/C)\s*[Xx]*(\d{4})/i,
    amountGroup: 2,
    typeGroup: 1,
    accountGroup: 3,
  },
  // Pattern 4: Paytm/PhonePe "Paid Rs.XXX to MERCHANT"
  {
    regex: /Paid\s+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d{0,2})\s+to\s+(.+?)(?:\s+from|\s+via|\s*$)/i,
    amountGroup: 1,
    typeGroup: null,  // Always debit
    merchantGroup: 2,
    forceType: 'debit' as const,
  },
  // Pattern 5: "Received Rs.XXX from SENDER"
  {
    regex: /Received\s+(?:Rs\.?|INR\s?)(\d[\d,]*\.?\d{0,2})\s+from\s+(.+?)(?:\s+in|\s+to|\s*$)/i,
    amountGroup: 1,
    typeGroup: null,
    merchantGroup: 2,
    forceType: 'credit' as const,
  },
];

// Merchant extraction patterns
const MERCHANT_PATTERNS = [
  /(?:to\s+VPA\s+)(.+?)(?:@|\s+UPI|\s*\.?\s*$)/i,
  /(?:UPI[:\s\/]+)(.+?)(?:\/|\s+Ref|\s*$)/i,
  /(?:Info:\s*UPI\/)(.+?)(?:\/|\s*$)/i,
  /(?:towards?\s+(?:UPI[-\s]?)?)(.+?)(?:\s+Ref|\s*\.?\s*$)/i,
  /(?:transfer\s+to\s+)(.+?)(?:\s+Ref|\s*$)/i,
];

// Date extraction
const DATE_PATTERNS = [
  /(\d{2}[-\/]\d{2}[-\/]\d{2,4})/,           // DD-MM-YY or DD-MM-YYYY
  /(\d{2}[A-Za-z]{3}\d{2,4})/,               // DDMmmYY (21Feb26)
  /on\s+(\d{1,2}\s+\w+\s+\d{4})/i,          // on 21 February 2026
];

function parseSMS(smsText: string): ParsedSMS {
  const text = smsText.trim();
  let result: ParsedSMS = {
    amount: 0,
    type: 'debit',
    merchant: null,
    account_last4: null,
    date: null,
    reference: null,
    bank: null,
    raw: text,
    confidence: 0,
  };

  // Try each pattern
  for (const pattern of SMS_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      // Extract amount (remove commas)
      const amountStr = match[pattern.amountGroup].replace(/,/g, '');
      result.amount = parseFloat(amountStr);

      // Extract type
      if (pattern.forceType) {
        result.type = pattern.forceType;
      } else if (pattern.typeGroup && match[pattern.typeGroup]) {
        result.type = match[pattern.typeGroup].toLowerCase() === 'credited' ? 'credit' : 'debit';
      }

      // Extract account
      if (pattern.accountGroup && match[pattern.accountGroup]) {
        result.account_last4 = match[pattern.accountGroup];
      }

      // Extract merchant from dedicated group or secondary patterns
      if ('merchantGroup' in pattern && pattern.merchantGroup && match[pattern.merchantGroup]) {
        result.merchant = match[pattern.merchantGroup].trim();
      } else {
        for (const mp of MERCHANT_PATTERNS) {
          const merchantMatch = text.match(mp);
          if (merchantMatch) {
            result.merchant = merchantMatch[1].trim();
            break;
          }
        }
      }

      // Extract date
      for (const dp of DATE_PATTERNS) {
        const dateMatch = text.match(dp);
        if (dateMatch) {
          result.date = dateMatch[1];
          break;
        }
      }

      // Extract reference
      const refMatch = text.match(/Ref\s*(?:No\.?\s*)?:?\s*(\d+)/i);
      if (refMatch) result.reference = refMatch[1];

      result.confidence = 0.85;
      break;
    }
  }

  // If regex failed, try Claude AI as fallback
  if (result.amount === 0) {
    result.confidence = 0; // Will trigger AI parsing
  }

  // Clean merchant name
  if (result.merchant) {
    result.merchant = result.merchant
      .replace(/@\w+/g, '')  // Remove UPI handles
      .replace(/\d+/g, '')   // Remove numbers
      .replace(/[-_]/g, ' ') // Replace separators
      .trim();
  }

  return result;
}

// If regex parser returns confidence < 0.5, use Claude API as fallback
// See src/lib/ai/parse-sms.ts for Claude SMS parsing prompt
```

### 12.2 AI SMS Parsing Fallback

```typescript
// src/lib/ai/parse-sms.ts

const SMS_PARSE_PROMPT = `Parse this Indian bank SMS and extract transaction details.
Return ONLY valid JSON with no markdown:
{
  "amount": number,
  "type": "debit" or "credit",
  "merchant": "merchant name or null",
  "date": "YYYY-MM-DD or null",
  "account_last4": "last 4 digits or null"
}

SMS: "{sms_text}"`;
```

---

## 13. TASKER AUTO-DETECTION SETUP

### 13.1 How It Works

```
FLOW:
1. Install Tasker app on Android (free trial, ₹299 for full)
2. Create a Tasker Profile:
   - Trigger: SMS received matching pattern "*debited*" OR "*credited*"
   - Action: HTTP POST to https://your-app.vercel.app/api/webhook/tasker
   - Body: { "sms": "%SMSRB", "sender": "%SMSRN", "secret": "your-webhook-secret" }

3. App's webhook endpoint:
   - Validates webhook secret (from app_settings)
   - Parses SMS using the parser (Section 12)
   - Creates a DRAFT transaction (not confirmed)
   - Sends push notification: "₹350 at Zomato detected. Confirm?"

4. User opens app → sees pending draft → confirms/edits/deletes
```

### 13.2 Webhook Endpoint

```typescript
// src/app/api/webhook/tasker/route.ts

/**
 * POST /api/webhook/tasker
 *
 * Headers: Content-Type: application/json
 * Body: { sms: string, sender: string, secret: string }
 *
 * Security:
 *   - Validates webhook secret matches app_settings.tasker_webhook_secret
 *   - Rate limited: 30 requests/minute
 *   - SMS text sanitized (no script injection)
 *   - Only processes recognized bank SMS patterns
 *
 * Response:
 *   200: { success: true, draft_id: "uuid" }
 *   401: { error: "Invalid secret" }
 *   429: { error: "Rate limited" }
 *   400: { error: "Could not parse SMS" }
 */
```

### 13.3 Tasker Setup Instructions (For User)

```
STEP-BY-STEP TASKER SETUP:
===========================

1. Install Tasker from Google Play Store
2. Open Tasker → Profiles tab → + button
3. Select "Event" → "Phone" → "Received Text"
   - Type: SMS
   - Sender: (leave blank to match all)
   - Content: *debited* (then add another for *credited*)
4. Back → New Task → give it a name: "Kharcha SMS"
5. + Add Action → "Net" → "HTTP Request"
   - Method: POST
   - URL: https://kharcha.vercel.app/api/webhook/tasker
   - Headers: Content-Type: application/json
   - Body: {"sms":"%SMSRB","sender":"%SMSRN","secret":"YOUR_SECRET_HERE"}
6. Save and enable the profile

GET YOUR SECRET:
- Open Kharcha → Settings → Tasker Integration → Copy Webhook Secret
- Paste it in the Tasker HTTP Request body

TEST:
- Open Kharcha → Settings → Tasker Integration → "Send Test SMS"
- Check if a draft transaction appears
```

---

## 14. PWA CONFIGURATION

### 14.1 Manifest

```json
// public/manifest.json
{
  "name": "Kharcha — Expense Tracker",
  "short_name": "Kharcha",
  "description": "Where every rupee tells a story",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#E5E2DD",
  "theme_color": "#8B7355",
  "categories": ["finance", "utilities"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [],
  "prefer_related_applications": false
}
```

### 14.2 Service Worker Strategy (Serwist)

```typescript
// src/app/sw.ts (Serwist service worker)

/**
 * CACHING STRATEGY:
 *
 * 1. App Shell (HTML, CSS, JS):
 *    Strategy: StaleWhileRevalidate
 *    Cache: 'app-shell-v1'
 *    Reason: Show cached version instantly, update in background
 *
 * 2. API Routes (budget, transactions):
 *    Strategy: NetworkFirst (with 3s timeout fallback to cache)
 *    Cache: 'api-data-v1'
 *    Reason: Always try fresh data, but work offline too
 *
 * 3. Fonts (Google Fonts):
 *    Strategy: CacheFirst
 *    Cache: 'fonts-v1'
 *    MaxAge: 365 days
 *    Reason: Fonts don't change, cache forever
 *
 * 4. Lottie Animations:
 *    Strategy: CacheFirst
 *    Cache: 'assets-v1'
 *    Reason: Static assets
 *
 * OFFLINE QUEUE:
 *    When offline, transactions are stored in IndexedDB
 *    Queue structure: { id, action, data, timestamp }
 *    When back online: queue is processed in order
 *    Conflict resolution: server wins for amounts, client wins for categories
 */
```

### 14.3 Offline Queue (IndexedDB)

```typescript
// src/lib/offline-queue.ts

/**
 * OFFLINE TRANSACTION QUEUE
 *
 * Uses IndexedDB (via idb library) to store pending transactions when offline.
 *
 * DB Name: 'kharcha-offline'
 * Store: 'pending-transactions'
 *
 * Schema:
 *   id: string (UUID, generated client-side)
 *   action: 'create' | 'update' | 'delete'
 *   table: 'transactions' | 'income_entries' | 'vault_transactions'
 *   data: object (the transaction data)
 *   timestamp: number
 *   synced: boolean
 *
 * On app load:
 *   1. Check navigator.onLine
 *   2. If online: process all pending items
 *   3. If offline: show offline indicator in header
 *
 * On transaction create (while offline):
 *   1. Generate client-side UUID
 *   2. Store in IndexedDB
 *   3. Show in UI with "pending" badge
 *   4. When online: POST to server, update local record as synced
 */
```

---

## 15. EXTERNAL SERVICES & FREE TIERS

### 15.1 Cost Breakdown

| Service | Free Tier | Your Usage | Monthly Cost |
|---------|-----------|------------|--------------|
| **Vercel** | 100GB bandwidth, unlimited deploys, serverless functions | ~1GB, 1 user | **$0** |
| **Supabase** | 500MB DB, 50K MAU, 1GB storage, 500K edge function invocations | ~50MB, 1 user | **$0** |
| **Clerk** | 10,000 MAU | 1 user | **$0** |
| **Claude API** | Pay-per-use (no free tier) | ~20 calls/month (after keyword caching) | **~$0.02** |
| **ExchangeRate-API** | 1,500 requests/month | ~30/month (1/day) | **$0** |
| **Google Fonts** | Unlimited | 3 fonts | **$0** |
| **Tasker (Android)** | 7-day trial, then ₹299 one-time | 1 device | **₹299 once** |
| **Lottie Files** | Free animations | 3-5 animations | **$0** |
| **TOTAL** | — | — | **~$0.02/month + ₹299 one-time** |

### 15.2 Service Setup Links

```
Vercel:          https://vercel.com/signup (GitHub login)
Supabase:        https://supabase.com/dashboard (GitHub login)
Clerk:           https://dashboard.clerk.com/sign-up
Claude API:      https://console.anthropic.com (need API key)
ExchangeRate:    https://www.exchangerate-api.com (free key)
Tasker:          https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm
```

---

## 16. ENVIRONMENT VARIABLES

```bash
# .env.local (NEVER commit to git)

# === CLERK ===
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx  # Server-side only, never expose

# === CLAUDE API ===
ANTHROPIC_API_KEY=sk-ant-xxxxx

# === EXCHANGE RATE ===
EXCHANGE_RATE_API_KEY=xxxxx

# === APP ===
NEXT_PUBLIC_APP_URL=https://kharcha.vercel.app
ENCRYPTION_SALT_PEPPER=random-64-char-string  # Additional entropy for key derivation

# === TASKER WEBHOOK ===
# (Generated per user, stored in app_settings table, not in env)
```

---

## 17. DEPLOYMENT GUIDE

### 17.1 Vercel Setup

```bash
# 1. Push code to GitHub
git init && git add . && git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USER/kharcha.git
git push -u origin main

# 2. Connect to Vercel
# Go to vercel.com → Import → Select repo
# Framework: Next.js (auto-detected)
# Root Directory: ./
# Build Command: pnpm build
# Install Command: pnpm install

# 3. Add Environment Variables in Vercel Dashboard
# (all variables from Section 16)

# 4. Deploy
# Vercel auto-deploys on every push to main
# Preview deploys on every PR
```

### 17.2 Supabase Setup

```bash
# 1. Create project at supabase.com
# 2. Go to SQL Editor
# 3. Run all SQL from Section 5.2 (tables, indexes, RLS)
# 4. Go to Settings → API → Copy URL and anon key
# 5. Enable Row Level Security on ALL tables
# 6. Set up Clerk JWT integration:
#    - Supabase → Settings → Auth → JWT Secret
#    - Configure Clerk to issue Supabase-compatible JWTs
```

### 17.3 Clerk + Supabase Integration

```typescript
// src/lib/supabase/server.ts

/**
 * Creating a Supabase client that uses Clerk's JWT for RLS.
 *
 * Setup:
 * 1. In Clerk Dashboard → JWT Templates → Create "supabase" template
 * 2. Set claims: { "sub": "{{user.id}}", "role": "authenticated" }
 * 3. Copy Clerk's JWKS endpoint
 * 4. In Supabase → Settings → Auth → JWT Secret → Set Clerk's JWT signing key
 *
 * Now Supabase RLS policies can use auth.jwt() ->> 'sub' to get Clerk user ID
 */

import { createServerClient } from '@supabase/ssr'
import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

export async function createClient() {
  const { getToken } = await auth()
  const supabaseToken = await getToken({ template: 'supabase' })

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    }
  )
}
```

---

## 18. PHASED BUILD PLAN (Claude Code Instructions)

### PHASE 0: Foundation (Day 1)

```
TASKS:
1. Initialize Next.js 16 project with TypeScript and pnpm
2. Install all dependencies (Section 2.7)
3. Set up Tailwind v4 with custom config (Section 3.3)
4. Add Google Fonts: DM Serif Display, Inter, IBM Plex Mono
5. Create globals.css with all CSS variables (Section 3.2)
6. Set up Clerk auth (provider, middleware, sign-in/up pages)
7. Set up Supabase client (server + browser)
8. Create .env.local with all variables
9. Set up PWA manifest (Section 14.1)
10. Deploy to Vercel (empty app)
11. Set up next.config.ts with security headers (Section 6.5)
12. Create folder structure (Section 9.1)

CLAUDE CODE INSTRUCTIONS:
- Run: pnpm create next-app@latest kharcha --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
- Run all pnpm add commands
- Create the file structure
- Add all env variables (placeholder values)
- Deploy to Vercel
- Verify: app loads on phone browser with Clerk sign-in
```

### PHASE 1: Design System & UI Shell (Day 2-3)

```
TASKS:
1. Build all base UI components (Section 9.1 /components/ui/)
2. Build layout components: BottomNav, Header, PageTransition
3. Create the paper texture CSS (Section 3.5)
4. Create all page shells (empty pages with correct layout)
5. Implement page turn transitions between pages
6. Build the Floating Action Button with float animation
7. Add PencilSkeleton loading component
8. Test on mobile: all pages navigate correctly with animations

CLAUDE CODE INSTRUCTIONS:
- Start with Button, Card, Input, Badge, Modal, Toggle, ProgressRing
- Then BottomNav (5 tabs: Home, Transactions, Analytics, Vault, Settings)
- Each component should use the design tokens from CSS variables
- PageTransition wraps each page with Framer Motion page turn
- Verify on phone: bottom nav works, pages transition smoothly
```

### PHASE 2: Database & Auth (Day 4)

```
TASKS:
1. Run all SQL in Supabase SQL Editor (Section 5.2)
2. Configure Clerk JWT template for Supabase
3. Test RLS policies
4. Build onboarding flow (first-time user: set name, PIN, seed categories)
5. Build PIN lock screen with lockout logic
6. Implement encryption module (Section 6.2)
7. Test: create profile, set PIN, verify PIN, encrypt/decrypt a test amount

CLAUDE CODE INSTRUCTIONS:
- Create the crypto.ts module exactly as specified
- Create the pin.ts module
- Build /onboarding page: welcome → set PIN → confirm PIN → seed categories → done
- Build PinLockScreen component
- Build useEncryption hook
- Build usePinLock hook with inactivity timer
- Test the full flow: sign up → onboard → lock screen → unlock with PIN
```

### PHASE 3: Transaction System (Day 5-7)

```
TASKS:
1. Build server actions: createTransaction, updateTransaction, deleteTransaction
2. Build AddExpenseModal with Ink Spread animation
3. Build CategoryPicker with Stamp Press animation
4. Build NeedWantToggle
5. Build TransactionList with filters
6. Build TransactionItem with swipe-to-delete (Paper Crumple)
7. Build AddIncomeModal (with type selection: allowance/bonus/pass-through/vault)
8. Build pass-through linking flow
9. Build SmartPasteInput (copy SMS → paste → parse → auto-fill)
10. Build OdometerValue component
11. Implement keyword-based categorization (Section 11.1)

CLAUDE CODE INSTRUCTIONS:
- This is the core phase — take time to get it right
- Amounts must be encrypted BEFORE calling server actions
- All server actions validate with Zod schemas
- Test: add expense, see it in list, delete it, add income, mark pass-through
- Test: paste a bank SMS, verify it parses correctly
- Test: odometer shows balance correctly
```

### PHASE 4: Dashboard (Day 8-9)

```
TASKS:
1. Build BalanceCard with OdometerValue
2. Build DailyLimitCard with burn rate indicator
3. Build VaultPreview card
4. Build RecentTransactions (last 5)
5. Build SubscriptionAlert (upcoming renewals)
6. Build the budget calculation API route
7. Implement daily-limit algorithm (Section 7.1)
8. All cards enter with Rise from Paper animation (staggered)

CLAUDE CODE INSTRUCTIONS:
- Dashboard is the first thing user sees — make it beautiful
- Use the cardRise animation from animations.ts
- Burn rate uses color: sage (safe), amber (caution), brick (danger)
- Test: dashboard shows correct balance, daily limit, recent transactions
```

### PHASE 5: Emergency Vault (Day 10-11)

```
TASKS:
1. Build VaultDoor GSAP animation
2. Build VaultBalance with progress ring
3. Build DepositModal and WithdrawModal
4. Build VaultHistory ledger
5. Build vault server actions (deposit, withdraw)
6. Vault page matches specification (Section 10.4)

CLAUDE CODE INSTRUCTIONS:
- Vault door is the showpiece animation — use GSAP timeline
- Progress ring: SVG circle with animated stroke-dashoffset
- Test: deposit to vault, see balance update, withdraw with reason, see history
```

### PHASE 6: Subscription Manager (Day 12-13)

```
TASKS:
1. Build SubscriptionList and SubscriptionCard
2. Build AddSubscription form
3. Build BurnRateCard (total monthly cost)
4. Implement subscription matching algorithm (Section 7.2)
5. Build currency conversion (USD subscriptions → INR)
6. Set up ExchangeRate API integration
7. Subscription reminder notification system

CLAUDE CODE INSTRUCTIONS:
- When adding subscription: name, amount, currency, billing day, keywords
- For USD subscriptions: show both USD and ₹ equivalent
- Test: add GitHub Copilot ($15 USD), see it converts to INR
- Test: add expense matching a subscription keyword, verify auto-match
```

### PHASE 7: AI Intelligence (Day 14-15)

```
TASKS:
1. Set up Claude API route (/api/ai/categorize)
2. Implement 3-tier categorization: ai_learning → keywords → Claude API
3. Implement SMS parsing with Claude fallback
4. Build anomaly detection (Section 7.3)
5. Build monthly AI summary generation
6. Build AISummary component for analytics page
7. Set up Tasker webhook endpoint

CLAUDE CODE INSTRUCTIONS:
- AI calls are expensive — always check cache/keywords first
- Claude API: use claude-sonnet-4-5-20250929 model
- Max tokens: 150 (responses are short JSON)
- Test: add "unknown merchant" → see Claude categorize it
- Test: same merchant again → cached, no API call
- Test: generate monthly summary
```

### PHASE 8: Analytics (Day 16-17)

```
TASKS:
1. Build CategoryPieChart with animated segments
2. Build SpendingTrendLine (draws itself)
3. Build CalendarHeatmap
4. Build NeedsVsWants horizontal bar
5. Build MonthComparison bars
6. Build month picker (scrollable)
7. Build Export CSV and PDF buttons

CLAUDE CODE INSTRUCTIONS:
- Use Recharts for all charts
- Add Framer Motion animations to chart containers
- Pie chart: custom animated segments (not default Recharts animation)
- Line chart: SVG pathLength animation
- Test: add enough transactions to see meaningful charts
```

### PHASE 9: Polish & Security Hardening (Day 18-20)

```
TASKS:
1. Rate limiting on all API routes (Section 6.4)
2. Content Security Policy headers (Section 6.5)
3. Service worker setup with Serwist (Section 14.2)
4. Offline queue implementation (Section 14.3)
5. Push notification setup (subscription reminders, budget warnings)
6. Error boundaries on all pages
7. Empty state components (beautiful, with Lottie)
8. Golden shimmer effect on successful actions
9. Paper crumple delete animation
10. Performance audit: Lighthouse score target > 90
11. Test all security: PIN lockout, encryption, RLS, rate limiting

CLAUDE CODE INSTRUCTIONS:
- This phase is about hardening — make everything robust
- Test offline: add transaction while offline, go online, verify sync
- Test security: try accessing another user's data (should fail RLS)
- Run Lighthouse audit: aim for 90+ on all metrics
```

### PHASE 10: Final Polish (Day 21+)

```
TASKS:
1. Onboarding flow refinement (smooth, animated)
2. Micro-interaction polish (every tap should feel good)
3. Loading states on every async operation
4. Toast notifications for all actions
5. Lottie animations for empty states
6. Tasker setup instructions page in Settings
7. About page
8. Final Lighthouse audit
9. Cross-browser testing (Chrome, Firefox, Safari on Android)
10. Final deployment to Vercel

DELIVERABLE: Complete, polished, production-ready app
```

---

## 19. TESTING STRATEGY

### 19.1 Test Types

```
UNIT TESTS (Vitest):
- All encryption/decryption functions
- SMS parsing (with 20+ real SMS samples)
- Budget calculation algorithm
- Subscription matching algorithm
- Anomaly detection
- Zod validation schemas
- Utility/formatting functions

COMPONENT TESTS (React Testing Library):
- OdometerValue renders correctly
- CategoryPicker selection works
- TransactionItem displays correct amounts
- PIN lock screen lockout behavior
- AddExpenseModal form validation

INTEGRATION TESTS (Vitest + Supabase):
- Create transaction → appears in list
- Add income → budget recalculates
- Vault deposit → balance updates
- Pass-through linking → budget unaffected

E2E TESTS (Playwright):
- Full onboarding flow
- Add expense → see on dashboard
- PIN lock → unlock → access app
- Offline mode → queue → sync
- Full monthly cycle simulation
```

### 19.2 SMS Test Fixtures

```typescript
// tests/fixtures/sms-samples.ts
export const SMS_SAMPLES = [
  {
    text: 'Rs.350.00 debited from a/c **1234 on 21-02-26 to VPA zomato@upi. UPI Ref: 402113456789',
    expected: { amount: 350, type: 'debit', merchant: 'zomato', account: '1234' },
  },
  {
    text: 'INR 21,000.00 credited to your a/c XX5678 on 01-02-26. NEFT Ref: HDFC12345',
    expected: { amount: 21000, type: 'credit', merchant: null, account: '5678' },
  },
  {
    text: 'Paid Rs.149 to YouTube Premium from Paytm wallet. Txn ID: PT123456',
    expected: { amount: 149, type: 'debit', merchant: 'YouTube Premium' },
  },
  // ... 20+ more samples from different banks
];
```

---

## 20. FUTURE ENHANCEMENTS

### Phase 2 (Month 2+)

1. **Receipt Scanner**: Camera → capture receipt → Claude Vision API → extract items and amounts
2. **Savings Goals**: "New headphones ₹3,000" — track progress, suggest daily saving amount
3. **Multi-Currency Dashboard**: Toggle between INR/USD views
4. **Recurring Expense Detection**: AI notices you spend ₹350 at Zomato every Friday → suggests making it a tracked pattern
5. **Budget Templates**: "Exam month" (low entertainment, high food) vs "Vacation month" (high entertainment)
6. **Family Mode**: Dad can see your spending summary (read-only) via a shared link
7. **Data Backup**: Export encrypted backup to Google Drive
8. **Widgets**: Android home screen widget showing balance + daily limit (via PWA shortcuts)
9. **Voice Input**: "Spent 350 on zomato" → voice → transaction
10. **Theme Variations**: Night mode (even darker parchment), Festival mode (temporary gold accent)

---

## APPENDIX A: Quick Reference Card

```
APP NAME:     Kharcha (खर्चा)
STACK:        Next.js 16 + TypeScript + Supabase + Clerk + Tailwind v4
DEPLOY:       Vercel (free)
AI:           Claude Sonnet 4.5
AUTH:         Clerk → Supabase RLS
ENCRYPTION:   AES-256-GCM (PIN-derived key, PBKDF2 600K iterations)
FONTS:        DM Serif Display + Inter + IBM Plex Mono
PALETTE:      Warm Stone (#E5E2DD) + Parchment (#F2F0ED) + Bronze (#8B7355)
ANIMATIONS:   Framer Motion 12 + GSAP 3.12
PWA:          Serwist (offline-first)
COST:         ~$0.02/month
```

---

*Document version: 1.0*
*Created: February 21, 2026*
*For: Kharcha Personal Expense Tracker*
*This document is the single source of truth for the entire project.*
