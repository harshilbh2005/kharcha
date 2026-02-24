import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

// ─── Google Fonts ───────────────────────────────────────────────────────────────
//
// Three fonts drive the "Slate & Parchment" system:
//   DM Serif Display → headings, balance figures  (font-display)
//   Inter            → body copy, UI labels        (font-body / default)
//   IBM Plex Mono    → amounts, dates, codes        (font-mono)
//
// Each is injected via a CSS variable so Tailwind v4 utility classes
// (font-display, font-body, font-mono) pick them up from globals.css.

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// ─── Metadata ───────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Kharcha — Where every rupee tells a story",
  description: "Personal expense tracker with AI-powered insights",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kharcha",
  },
};

// ─── Viewport ───────────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  // Aged Bronze theme-color keeps the browser chrome on-brand for PWA installs
  themeColor:    "#8B7355",
  width:         "device-width",
  initialScale:  1,
  maximumScale:  5,
  // Allow pinch-zoom for accessibility (Lighthouse requires it)
  userScalable:  true,
};

// ─── RootLayout ─────────────────────────────────────────────────────────────────
//
// Minimal root shell. Route-group layouts handle specialised concerns:
//
//   (auth)/layout.tsx   → centered sign-in / sign-up (no nav)
//   (app)/layout.tsx    → profile check, PIN gate, BottomNav
//   /onboarding         → standalone wizard (no nav, no PIN gate)
//
// Provider nesting (outermost → innermost):
//
//   ClerkProvider       Server Component — injects auth context for the
//                       whole tree; safe to use in a Server Component layout.
//
//   Providers (client)  QueryClientProvider + ToastProvider.
//                       "use client" boundary lives inside providers.tsx so
//                       the rest of layout.tsx stays a Server Component.
//
//   <main>              Semantic landmark. PageTransition (via template.tsx)
//                       owns the enter/exit animation of page content.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`
            ${dmSerifDisplay.variable}
            ${inter.variable}
            ${ibmPlexMono.variable}
            font-body
            antialiased
          `}
        >
          <Providers>
            <ServiceWorkerRegistrar />
            <main>{children}</main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
