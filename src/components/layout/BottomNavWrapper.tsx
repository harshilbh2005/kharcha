"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BottomNav, type FabOrigin } from "@/components/layout/BottomNav";
import { AddExpenseModal } from "@/components/transactions/AddExpenseModal";

// ─── Auth-route prefixes ────────────────────────────────────────────────────────

const AUTH_PATHS = ["/sign-in", "/sign-up"];

// ─── BottomNavWrapper ───────────────────────────────────────────────────────────
//
// Owns the add-expense modal lifecycle:
//   1. Renders BottomNav and wires the FAB's onAddPress.
//   2. When the FAB is pressed, captures its center coordinates (via BottomNav's
//      FabOrigin callback) and opens AddExpenseModal.
//   3. AddExpenseModal uses those coordinates as the InkSpread origin so the
//      ink appears to burst from the FAB button.

export function BottomNavWrapper() {
  const pathname = usePathname();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fabOrigin, setFabOrigin] = useState<FabOrigin>({ x: 0, y: 0 });

  // Never render on Clerk auth pages — they own their full-screen layout.
  // startsWith covers sub-paths like /sign-in/sso-callback.
  const isAuthPage = AUTH_PATHS.some((prefix) => pathname.startsWith(prefix));
  if (isAuthPage) return null;

  const handleAddPress = (origin: FabOrigin) => {
    setFabOrigin(origin);
    setIsModalOpen(true);
  };

  return (
    <>
      <BottomNav onAddPress={handleAddPress} />
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        origin={fabOrigin}
      />
    </>
  );
}

export default BottomNavWrapper;
