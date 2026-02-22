import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { BottomNavWrapper } from "@/components/layout/BottomNavWrapper";
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
  maximumScale:  1,
  // Disable pinch-zoom — numbers/amounts are always readable at base scale
  userScalable:  false,
};

// ─── RootLayout ─────────────────────────────────────────────────────────────────
//
// Provider nesting (outermost → innermost):
//
//   ClerkProvider         Server Component — injects auth context for the
//                         whole tree; safe to use in a Server Component layout.
//
//   Providers (client)    QueryClientProvider + ToastProvider.
//                         "use client" boundary lives inside providers.tsx so
//                         the rest of layout.tsx stays a Server Component.
//
//   <main>                Semantic landmark for the page-level content rendered
//                         by each route. PageTransition (via template.tsx)
//                         owns the enter/exit animation of this content.
//
//   BottomNavWrapper      Fixed-position nav. Client Component — uses useAuth()
//                         + usePathname() to conditionally render BottomNav only
//                         when the user is signed in and not on an auth page.
//
// Body classes:
//   font variables        Injected by next/font so Tailwind utilities resolve.
//   font-body             Sets Inter as the default body typeface.
//   antialiased           Subpixel AA on macOS — keeps thin Inter strokes clean.
//
//   Background + paper texture are set globally in globals.css:
//     body { background-color: var(--bg-global); background-image: <SVG noise>; }
//   No inline style needed here.

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
            {/* ── Page content (Header + page body via template.tsx) ── */}
            <main>{children}</main>

            {/* ── Global bottom nav — hidden on auth pages + signed-out ── */}
            <BottomNavWrapper />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
