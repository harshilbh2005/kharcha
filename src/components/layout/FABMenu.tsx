'use client';

// ============================================================
// KHARCHA — FABMenu (Radial Action Menu)
//
// Self-contained FAB that fans out into 4 action buttons:
//   Expense      (bottom-left,  largest — most common)
//   Income       (top-center)
//   Subscription (bottom-right)
//   Smart Paste  (top, above arc)
//
// Icons are the same Lucide icons used elsewhere in the project:
//   ArrowDownLeft (expense), Wallet (income),
//   RefreshCw (subscription), Sparkles (smart paste)
//
// Buttons use --bg-surface (parchment) as solid background —
// same as all cards in the app — so icons are always crisp.
// Coloured border + shadow give each button its semantic identity.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  ArrowDownLeft,
  Wallet,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import AddExpenseModal from '@/components/transactions/AddExpenseModal';
import AddIncomeModal from '@/components/transactions/AddIncomeModal';
import AddSubscriptionModal from '@/components/subscriptions/AddSubscriptionModal';
import SmartPasteInput from '@/components/transactions/SmartPasteInput';
import type { AddExpenseModalPrefill } from '@/components/transactions/AddExpenseModal';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActiveModal = 'none' | 'expense' | 'income' | 'subscription' | 'smartpaste';

// ── Fan button config ─────────────────────────────────────────────────────────

interface FanButtonDef {
  id:          ActiveModal;
  label:       string;
  // Lucide icon component
  Icon:        React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  // Design-token colours (CSS variable strings)
  iconColor:   string;
  borderColor: string;   // semantic colour border
  shadowColor: string;   // coloured drop-shadow
  /** X offset from FAB center (px) */
  x: number;
  /** Y offset from FAB center (px, negative = up) */
  y: number;
  /** Circle diameter (px) — Expense is slightly larger */
  size: number;
  iconSize: number;
}

// All buttons share --bg-surface (parchment #F2F0ED) — same as cards throughout the app.
// Coloured border + shadow distinguish each action type semantically.
const FAN_BUTTONS: FanButtonDef[] = [
  {
    id:          'expense',
    label:       'Expense',
    Icon:        ArrowDownLeft,
    iconColor:   'var(--color-expense)',   // terracotta #A37B6F
    borderColor: 'rgba(163,123,111,0.55)',
    shadowColor: 'rgba(163,123,111,0.30)',
    x: -68, y: -82, size: 54, iconSize: 22,
  },
  {
    id:          'income',
    label:       'Income',
    Icon:        Wallet,
    iconColor:   'var(--color-income)',    // sage #6B7D71
    borderColor: 'rgba(107,125,113,0.55)',
    shadowColor: 'rgba(107,125,113,0.28)',
    x: 0, y: -110, size: 48, iconSize: 19,
  },
  {
    id:          'subscription',
    label:       'Subscription',
    Icon:        RefreshCw,
    iconColor:   'var(--color-accent)',    // bronze #8B7355
    borderColor: 'rgba(139,115,85,0.55)',
    shadowColor: 'rgba(139,115,85,0.26)',
    x: 68, y: -82, size: 48, iconSize: 19,
  },
  {
    id:          'smartpaste',
    label:       'Smart Paste',
    Icon:        Sparkles,
    iconColor:   'var(--color-vault)',     // deep forest #5C6B5E
    borderColor: 'rgba(92,107,94,0.55)',
    shadowColor: 'rgba(92,107,94,0.26)',
    x: 0, y: -178, size: 44, iconSize: 17,
  },
];

// Spring preset for all fan button animations
const FAN_SPRING = { type: 'spring', stiffness: 380, damping: 22 } as const;

// ── FanItem ───────────────────────────────────────────────────────────────────
//
// A single coloured action button + label.
// It is anchored at fabCenter (fixed left/top) and Framer Motion
// translates it to its arc position via x/y so the origin of the
// animation always appears to come from the FAB itself.

interface FanItemProps {
  btn:       FanButtonDef;
  index:     number;
  fabCenter: { x: number; y: number };
  onPress:   (id: ActiveModal) => void;
}

function FanItem({ btn, index, fabCenter, onPress }: FanItemProps) {
  const { Icon } = btn;

  return (
    <motion.div
      style={{
        position:      'fixed',
        left:          fabCenter.x - btn.size / 2,
        top:           fabCenter.y - btn.size / 2,
        width:         btn.size,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        zIndex:        51,
        pointerEvents: 'auto',
        overflow:      'visible',
      }}
      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
      animate={{ scale: 1, opacity: 1, x: btn.x, y: btn.y }}
      exit={{   scale: 0, opacity: 0, x: 0, y: 0 }}
      transition={{ ...FAN_SPRING, delay: index * 0.05 }}
    >
      {/* ── Circle button ─────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        onClick={() => onPress(btn.id)}
        aria-label={btn.label}
        whileTap={{ scale: 0.86 }}
        style={{
          width:           btn.size,
          height:          btn.size,
          flexShrink:      0,
          borderRadius:    '50%',
          // Solid parchment — same as all app cards, icons always crisp
          backgroundColor: 'var(--bg-surface)',
          border:          `1.5px solid ${btn.borderColor}`,
          // Coloured drop shadow gives each button its semantic identity
          boxShadow:       `0 4px 18px ${btn.shadowColor}, 0 2px 6px rgba(0,0,0,0.10)`,
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Icon size={btn.iconSize} strokeWidth={1.8} color={btn.iconColor} />
      </motion.button>

      {/* ── Label ─────────────────────────────────────────────────────────── */}
      <span
        style={{
          marginTop:  7,
          fontSize:   '0.67rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          color:      '#ffffff',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          // White + shadow — readable over the dark overlay
          textShadow: '0 1px 4px rgba(0,0,0,0.65)',
          letterSpacing: '0.02em',
        }}
      >
        {btn.label}
      </span>
    </motion.div>
  );
}

// ── FABMenu ───────────────────────────────────────────────────────────────────

export function FABMenu() {
  const [isFanOpen,   setIsFanOpen]   = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [fabCenter,   setFabCenter]   = useState({ x: 0, y: 0 });
  const [exchangeRate, setExchangeRate] = useState(84);
  const [smartPastePrefill, setSmartPastePrefill] =
    useState<AddExpenseModalPrefill | undefined>();

  const fabRef = useRef<HTMLButtonElement>(null);

  // ── Fetch exchange rate once ───────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((d: { rate?: number }) => {
        if (typeof d.rate === 'number') setExchangeRate(d.rate);
      })
      .catch(() => {});
  }, []);

  // ── FAB press ─────────────────────────────────────────────────────────────
  const handleFabPress = () => {
    if (isFanOpen) {
      setIsFanOpen(false);
    } else {
      const rect = fabRef.current?.getBoundingClientRect();
      setFabCenter(
        rect
          ? { x: rect.left + rect.width  / 2, y: rect.top + rect.height / 2 }
          : { x: window.innerWidth / 2,        y: window.innerHeight - 52      },
      );
      setIsFanOpen(true);
    }
  };

  // ── Fan button press: close fan → 200 ms → open modal ────────────────────
  const handleFanButtonPress = useCallback((id: ActiveModal) => {
    setIsFanOpen(false);
    setTimeout(() => setActiveModal(id), 200);
  }, []);

  // ── Modal close ───────────────────────────────────────────────────────────
  const closeModal = useCallback(() => {
    setActiveModal('none');
    setSmartPastePrefill(undefined);
  }, []);

  // ── SmartPaste "Edit First" → AddExpenseModal handoff ────────────────────
  const handleSmartPasteEditFirst = useCallback(
    (prefill: AddExpenseModalPrefill) => {
      setActiveModal('none');
      setTimeout(() => {
        setSmartPastePrefill(prefill);
        setActiveModal('expense');
      }, 200);
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── FAB button ────────────────────────────────────────────────────── */}
      <motion.button
        ref={fabRef}
        type="button"
        onClick={handleFabPress}
        aria-label={isFanOpen ? 'Close menu' : 'Add transaction'}
        aria-expanded={isFanOpen}
        animate={isFanOpen ? { y: 0 } : { y: [0, -2, 0] }}
        transition={
          isFanOpen
            ? { duration: 0.15 }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
        whileTap={{ scale: 0.90 }}
        style={{
          position:        'fixed',
          left:            'calc(50% - 24px)',
          bottom:          'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          zIndex:          52,
          width:           48,
          height:          48,
          borderRadius:    '50%',
          backgroundColor: isFanOpen ? 'var(--text-primary)' : 'var(--color-accent)',
          color:           '#ffffff',
          border:          'none',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       'var(--shadow-float, 0 4px 20px rgba(139,115,85,0.35), 0 1px 6px rgba(0,0,0,0.12))',
          transition:      'background-color 0.2s ease',
        }}
      >
        <motion.div
          animate={{ rotate: isFanOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      {/* ── Overlay + Fan buttons ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isFanOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="fab-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsFanOpen(false)}
              aria-hidden="true"
              style={{
                position:        'fixed',
                inset:           0,
                zIndex:          50,
                backgroundColor: 'rgba(30, 32, 36, 0.55)',
                backdropFilter:  'blur(3px)',
              }}
            />

            {/* Fan buttons */}
            {FAN_BUTTONS.map((btn, i) => (
              <FanItem
                key={btn.id}
                btn={btn}
                index={i}
                fabCenter={fabCenter}
                onPress={handleFanButtonPress}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AddExpenseModal
        isOpen={activeModal === 'expense'}
        onClose={closeModal}
        origin={fabCenter}
        prefill={smartPastePrefill}
      />
      <AddIncomeModal
        isOpen={activeModal === 'income'}
        onClose={closeModal}
      />
      <AddSubscriptionModal
        isOpen={activeModal === 'subscription'}
        onClose={closeModal}
        exchangeRate={exchangeRate}
      />
      <SmartPasteInput
        isOpen={activeModal === 'smartpaste'}
        onClose={closeModal}
        onEditFirst={handleSmartPasteEditFirst}
      />
    </>
  );
}

export default FABMenu;
