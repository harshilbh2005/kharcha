"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";

// ─── Tab definitions ───────────────────────────────────────────────────────────

interface TabDef {
  icon: LucideIcon;
  label: string;
  path: string;
}

// Split into left / right so the centre Add button sits between them
const LEFT_TABS: TabDef[] = [
  { icon: LayoutDashboard, label: "Home",         path: "/"             },
  { icon: ArrowLeftRight,  label: "Transactions", path: "/transactions" },
];

const RIGHT_TABS: TabDef[] = [
  { icon: Shield,   label: "Vault",    path: "/vault"    },
  { icon: Settings, label: "Settings", path: "/settings" },
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
      className="flex flex-col items-center gap-1 flex-1 py-1 focus:outline-none focus-visible:ring-2"
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

// ─── AddButton ─────────────────────────────────────────────────────────────────

/** Origin: center coordinates of the FAB for the InkSpread animation. */
export type FabOrigin = { x: number; y: number };

function AddButton({ onPress }: { onPress?: (origin: FabOrigin) => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    const origin: FabOrigin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight - 52 }; // fallback
    onPress?.(origin);
  };

  return (
    // Wrapper keeps the button centred inside its flex-1 slot
    <div
      className="flex flex-col items-center justify-center flex-1"
      style={{ minWidth: 44 }}
    >
      <motion.button
        ref={btnRef}
        onClick={handleClick}
        // Continuous 2 px vertical oscillation — the "floating FAB" feel
        animate={{ y: [0, -2, 0] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileTap={{ scale: 0.92 }}
        aria-label="Add expense"
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "var(--color-accent)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          // Warm bronze-tinted shadow matching --color-accent
          boxShadow:
            "var(--shadow-float, 0 4px 20px rgba(139,115,85,0.30), 0 1px 6px rgba(0,0,0,0.10))",
        }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </motion.button>
    </div>
  );
}

// ─── BottomNav ─────────────────────────────────────────────────────────────────

export interface BottomNavProps {
  /** Called with the FAB's center coordinates when the Add button is pressed. */
  onAddPress?: (origin: FabOrigin) => void;
}

export function BottomNav({ onAddPress }: BottomNavProps) {
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

      {/* Centre: Add expense FAB */}
      <AddButton onPress={onAddPress} />

      {/* Right: Vault + Settings */}
      {RIGHT_TABS.map((tab) => (
        <NavTabItem key={tab.path} tab={tab} active={isActive(pathname, tab.path)} />
      ))}
    </nav>
  );
}

export default BottomNav;
