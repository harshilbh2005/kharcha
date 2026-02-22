// ============================================================
// KHARCHA — Lucide Icon Map
// Maps icon name strings (stored in categories.icon) to the
// actual Lucide React component.
//
// Default category icons are seeded from database/seed-categories.sql.
// Additional icons are included for user-created categories.
//
// Falls back to MoreHorizontal for any unrecognised name.
// ============================================================

import {
  // ── Default category icons (from seed-categories.sql) ──────────────────────
  UtensilsCrossed,
  Car,
  Gamepad2,
  ShoppingBag,
  RefreshCw,
  GraduationCap,
  Heart,
  Zap,
  User,
  MoreHorizontal,

  // ── Food & drink ───────────────────────────────────────────────────────────
  Coffee,
  Pizza,
  Utensils,
  Wine,
  IceCream,

  // ── Transport ──────────────────────────────────────────────────────────────
  Bus,
  Train,
  Plane,
  Bike,
  Fuel,
  MapPin,

  // ── Entertainment & leisure ────────────────────────────────────────────────
  Music,
  Film,
  Headphones,
  Camera,
  Gamepad,
  Tv,
  Ticket,

  // ── Education & work ──────────────────────────────────────────────────────
  BookOpen,
  Briefcase,
  Pencil,
  Globe,
  Landmark,

  // ── Health & wellness ──────────────────────────────────────────────────────
  Dumbbell,
  Stethoscope,
  Pill,
  ActivitySquare,

  // ── Shopping & lifestyle ───────────────────────────────────────────────────
  ShoppingCart,
  Shirt,
  Gift,
  Tag,
  Package,
  Scissors,
  Star,

  // ── Home & utilities ──────────────────────────────────────────────────────
  Home,
  Wifi,
  Smartphone,
  Monitor,
  Wrench,
  Lightbulb,

  // ── Finance ────────────────────────────────────────────────────────────────
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
  Banknote,
  PiggyBank,

  // ── Misc ───────────────────────────────────────────────────────────────────
  Baby,
  Leaf,
  Bell,
  Globe2,
  Smile,
  type LucideIcon,
} from 'lucide-react';

export type { LucideIcon };

/**
 * Mapping from icon name string (as stored in `categories.icon`) to the
 * corresponding Lucide React component.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  // Default seeds
  UtensilsCrossed,
  Car,
  Gamepad2,
  ShoppingBag,
  RefreshCw,
  GraduationCap,
  Heart,
  Zap,
  User,
  MoreHorizontal,

  // Food & drink
  Coffee,
  Pizza,
  Utensils,
  Wine,
  IceCream,

  // Transport
  Bus,
  Train,
  Plane,
  Bike,
  Fuel,
  MapPin,

  // Entertainment
  Music,
  Film,
  Headphones,
  Camera,
  Gamepad,
  Tv,
  Ticket,

  // Education & work
  BookOpen,
  Briefcase,
  Pencil,
  Globe,
  Landmark,

  // Health
  Dumbbell,
  Stethoscope,
  Pill,
  ActivitySquare,

  // Shopping
  ShoppingCart,
  Shirt,
  Gift,
  Tag,
  Package,
  Scissors,
  Star,

  // Home & utilities
  Home,
  Wifi,
  Smartphone,
  Monitor,
  Wrench,
  Lightbulb,

  // Finance
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
  Banknote,
  PiggyBank,

  // Misc
  Baby,
  Leaf,
  Bell,
  Globe2,
  Smile,
};

/**
 * Resolve a Lucide icon name string to its React component.
 * Returns `MoreHorizontal` for any name not present in the map.
 */
export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MoreHorizontal;
}
