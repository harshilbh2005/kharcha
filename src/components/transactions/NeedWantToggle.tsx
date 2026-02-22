'use client';

// ============================================================
// KHARCHA — NeedWantToggle
// Sliding pill toggle: "Need" (true) vs "Want" (false).
// Framer Motion layoutId drives the sliding active indicator.
// ============================================================

import { motion } from 'framer-motion';
import { ShieldCheck, Heart } from 'lucide-react';

export interface NeedWantToggleProps {
  value: boolean;
  onChange: (isNeed: boolean) => void;
}

const OPTIONS = [
  { label: 'Need', isNeed: true,  Icon: ShieldCheck },
  { label: 'Want', isNeed: false, Icon: Heart },
] as const;

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

export function NeedWantToggle({ value, onChange }: NeedWantToggleProps) {
  return (
    <div
      className="flex w-full h-10 rounded-full p-1"
      style={{ backgroundColor: 'var(--bg-navigation)' }}
      role="group"
      aria-label="Expense type"
    >
      {OPTIONS.map(({ label, isNeed, Icon }) => {
        const active = value === isNeed;

        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(isNeed)}
            className="relative flex flex-1 items-center justify-center gap-1.5 rounded-full text-sm select-none focus-visible:outline-none"
          >
            {/* Sliding background indicator */}
            {active && (
              <motion.span
                layoutId="need-want-indicator"
                className="absolute inset-0 rounded-full shadow-sm"
                style={{ backgroundColor: 'var(--bg-surface)' }}
                transition={SPRING}
              />
            )}

            {/* Icon + label — above the sliding layer */}
            <span className="relative flex items-center gap-1.5 z-10">
              <Icon
                size={14}
                strokeWidth={active ? 2 : 1.5}
                style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'color 0.15s ease',
                }}
              />
              <span
                style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                  transition: 'color 0.15s ease, font-weight 0.15s ease',
                }}
              >
                {label}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default NeedWantToggle;
