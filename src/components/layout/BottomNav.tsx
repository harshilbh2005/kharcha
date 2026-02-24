"use client";

// ============================================================
// KHARCHA — BottomNav
//
// Fixed bottom navigation bar.  Four tab items (Home, Transactions,
// Vault, Settings) arranged left / right with a passive spacer in the
// centre that visually reserves room for the floating FABMenu button
// (rendered separately in BottomNavWrapper and positioned via CSS
// fixed so it floats above the bar at the same visual centre).
// ============================================================

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Shield,
  BarChart2,
  type LucideIcon,
} from "lucide-react";

// ─── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  icon: LucideIcon;
  label: string;
  path: string;
}

// Split into left / right so the passive FAB spacer sits between them
const LEFT_TABS: TabDef[] = [
  { icon: LayoutDashboard, label: "Home",         path: "/"             },
  { icon: ArrowLeftRight,  label: "Transactions", path: "/transactions" },
];

const RIGHT_TABS: TabDef[] = [
  { icon: Shield,    label: "Vault",     path: "/vault"     },
  { icon: BarChart2, label: "Analytics", path: "/analytics" },
];

// ─── Active-path helper ────────────────────────────────────────────────────────

// Root must be exact; other paths also match their sub-routes so that
// e.g. /vault/emergency keeps the Vault tab highlighted.
function isActive(pathname: string, tabPath: string): boolean {
  if (tabPath === "/") return pathname === "/";
  return pathname === tabPath || pathname.startsWith(tabPath + "/");
}

// ─── NavTabItem ────────────────────────────────────────────────────────────────

function NavTabItem({ tab, active }: { tab: TabDef; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.path}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center gap-1 flex-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-1"
      style={{
        color: active ? "var(--color-accent)" : "var(--text-secondary)",
        textDecoration: "none",
        // Ensure minimum 44 px tap target width
        minWidth: 44,
      }}
    >
      <Icon
        size={22}
        // Heavier stroke on active tab simulates a "filled" feel
        strokeWidth={active ? 2.5 : 1.7}
      />

      <span className="font-body text-xs leading-none">{tab.label}</span>

      {/* ── Sliding indicator dot ──────────────────────────────────────────── */}
      {/* A fixed-height container reserves the 4 px row on ALL tabs so the   */}
      {/* layout never shifts when the dot appears / disappears.               */}
      <div
        className="flex justify-center items-center"
        style={{ height: 5, width: "100%" }}
      >
        {active && (
          <motion.div
            layoutId="nav-indicator"
            // Spring keeps the slide crisp without overshooting
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
            }}
          />
        )}
      </div>
    </Link>
  );
}

// ─── BottomNav ─────────────────────────────────────────────────────────────────
//
// No longer accepts onAddPress — the FABMenu component handles its own
// open / close logic and is rendered as a sibling in BottomNavWrapper.

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: "var(--bg-navigation)",
        borderTop: "1px solid var(--border-default)",

        // Total height = visible content (64 px) + iPhone notch clearance
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",

        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
      }}
    >
      {/* Left: Home + Transactions */}
      {LEFT_TABS.map((tab) => (
        <NavTabItem key={tab.path} tab={tab} active={isActive(pathname, tab.path)} />
      ))}

      {/* Centre: passive spacer — the real FAB button is rendered in FABMenu
          (position:fixed, z-52) so it floats at the same visual centre above
          this nav bar without being constrained by its stacking context. */}
      <div
        aria-hidden="true"
        style={{ flex: 1, minWidth: 44, height: 48 }}
      />

      {/* Right: Vault + Settings */}
      {RIGHT_TABS.map((tab) => (
        <NavTabItem key={tab.path} tab={tab} active={isActive(pathname, tab.path)} />
      ))}
    </nav>
  );
}

export default BottomNav;
