"use client";

// ============================================================
// KHARCHA — CategoryPicker
// Grid of category icons for selecting a transaction category.
//
// Layout: 5-column grid, each cell = icon circle + label.
// Animation:
//   • StaggerContainer for entrance (each icon fades/slides in)
//   • "Stamp Press": scale [1 → 1.3 → 0.9 → 1.0] on select
//   • "Ink ring": opacity 0.3 → 0, scale 1 → 2.5 expanding outward
// ============================================================

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { getIcon } from "@/lib/icon-map";
import type { Category } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a 6-char hex colour to rgba with the given alpha (0–1). */
function hexToRgba(hex: string, alpha: number): string {
  // Strip leading # and handle shorthand (#RGB → #RRGGBB)
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── CategoryItem ──────────────────────────────────────────────────────────────

interface CategoryItemProps {
  category: Category;
  isSelected: boolean;
  onSelect: (categoryId: string, categoryName: string) => void;
}

function CategoryItem({ category, isSelected, onSelect }: CategoryItemProps) {
  // Increment on each click → AnimatePresence unmounts/remounts the ink ring,
  // replaying the fade-expand animation even if the same category is tapped twice.
  const [inkKey, setInkKey] = useState(0);
  const [isStamping, setIsStamping] = useState(false);

  const handlePress = () => {
    onSelect(category.id, category.name);

    // Trigger ink ring (remount via new key)
    setInkKey((k) => k + 1);

    // Trigger stamp scale sequence
    setIsStamping(true);
    setTimeout(() => setIsStamping(false), 420);
  };

  const Icon = useMemo(() => getIcon(category.icon), [category.icon]);

  return (
    <button
      type="button"
      onClick={handlePress}
      className="flex flex-col items-center gap-1 p-1 w-full min-h-16 focus-visible:outline-none"
      aria-pressed={isSelected}
      aria-label={category.name}
    >
      {/* ── Icon area ──────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        {/* Ink ring: expands and fades outward on each selection */}
        <AnimatePresence>
          {inkKey > 0 && (
            <motion.div
              key={inkKey}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 40,
                height: 40,
                backgroundColor: category.color,
              }}
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        {/* Icon circle: stamp-press animation on selection */}
        <motion.div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            backgroundColor: isSelected
              ? hexToRgba(category.color, 0.22)
              : hexToRgba(category.color, 0.1),
            boxShadow: isSelected ? `0 0 0 2px ${category.color}` : "none",
            transition: "background-color 0.2s ease, box-shadow 0.2s ease",
          }}
          animate={isStamping ? { scale: [1, 1.3, 0.9, 1.0] } : { scale: 1 }}
          transition={
            isStamping
              ? { duration: 0.4, times: [0, 0.3, 0.7, 1], ease: "easeOut" }
              : { type: "spring", stiffness: 400, damping: 30 }
          }
        >
          <Icon size={18} color={category.color} strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* ── Label ──────────────────────────────────────────────────────────── */}
      <span
        className="text-xs leading-tight truncate w-full text-center"
        style={{
          color: isSelected ? category.color : "var(--text-secondary)",
          fontWeight: isSelected ? 500 : 400,
          transition: "color 0.2s ease",
        }}
      >
        {category.name}
      </span>
    </button>
  );
}

// ── CategoryPicker ────────────────────────────────────────────────────────────

export interface CategoryPickerProps {
  /** Currently selected category ID. */
  selected?: string;
  /** Called with (categoryId, categoryName) when a category is tapped. */
  onSelect: (categoryId: string, categoryName: string) => void;
  /** Category list from useCategories(). */
  categories: Category[];
}

/**
 * 5-column grid of icon tiles for picking a transaction category.
 *
 * Entrance: each tile staggers in via StaggerContainer.
 * Selection: stamp-press scale + expanding ink ring.
 */
export function CategoryPicker({
  selected,
  onSelect,
  categories,
}: CategoryPickerProps) {
  if (categories.length === 0) return null;

  return (
    <StaggerContainer
      className="grid grid-cols-5 gap-x-1 gap-y-2"
      staggerDelay={0.04}
      initialDelay={0.05}
    >
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          isSelected={selected === category.id}
          onSelect={onSelect}
        />
      ))}
    </StaggerContainer>
  );
}

export default CategoryPicker;
