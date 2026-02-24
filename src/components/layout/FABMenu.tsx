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
// Polish features:
//   • Resting shadow pulses in sync with the float animation
//   • FAB scales 1→1.1→1 (pulse) when menu opens
//   • Overlay fades in with blur(4px)
//   • Fan buttons spring in with stiffness:500/damping:22, 60ms stagger
//   • Labels slide in 150ms after their button (x:5→0, opacity 0→1)
//   • Close WITHOUT selection: buttons spring out with 40ms stagger
//   • Close WITH selection: selected button scales 1→1.3→0, others collapse
//   • Haptic: FAB tap 30ms, mini button tap 20ms
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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
  Icon:        React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  iconColor:   string;
  borderColor: string;
  shadowColor: string;
  /** X offset from FAB center (px) */
  x: number;
  /** Y offset from FAB center (px, negative = up) */
  y: number;
  /** Circle diameter (px) */
  size: number;
  iconSize: number;
}

const FAN_BUTTONS: FanButtonDef[] = [
  {
    id:          'expense',
    label:       'Expense',
    Icon:        ArrowDownLeft,
    iconColor:   'var(--color-expense)',
    borderColor: 'rgba(163,123,111,0.55)',
    shadowColor: 'rgba(163,123,111,0.30)',
    x: -68, y: -82, size: 54, iconSize: 22,
  },
  {
    id:          'income',
    label:       'Income',
    Icon:        Wallet,
    iconColor:   'var(--color-income)',
    borderColor: 'rgba(107,125,113,0.55)',
    shadowColor: 'rgba(107,125,113,0.28)',
    x: 0, y: -110, size: 48, iconSize: 19,
  },
  {
    id:          'subscription',
    label:       'Subscription',
    Icon:        RefreshCw,
    iconColor:   'var(--color-accent)',
    borderColor: 'rgba(139,115,85,0.55)',
    shadowColor: 'rgba(139,115,85,0.26)',
    x: 68, y: -82, size: 48, iconSize: 19,
  },
  {
    id:          'smartpaste',
    label:       'Smart Paste',
    Icon:        Sparkles,
    iconColor:   'var(--color-vault)',
    borderColor: 'rgba(92,107,94,0.55)',
    shadowColor: 'rgba(92,107,94,0.26)',
    x: 0, y: -178, size: 44, iconSize: 17,
  },
];

// ── FanItem ───────────────────────────────────────────────────────────────────
//
// Animated fan button + label.
// Uses variants so enter/exit can carry their own transition configs.
// The label is a separate motion.span so it appears 150ms after the button.

interface FanItemProps {
  btn:        FanButtonDef;
  index:      number;
  fabCenter:  { x: number; y: number };
  onPress:    (id: ActiveModal) => void;
  /** The button that was tapped to close the menu (null = plain dismiss) */
  selectedId: ActiveModal | null;
}

function FanItem({ btn, index, fabCenter, onPress, selectedId }: FanItemProps) {
  const { Icon } = btn;
  const isSelected = selectedId === btn.id;
  const enterDelay = index * 0.06;   // 60ms stagger on open
  const exitDelay  = index * 0.04;   // 40ms stagger on close (faster)

  // Variants — defined here so btn.x / btn.y are in scope
  const containerVariants: Variants = {
    hidden: { scale: 0, opacity: 0, x: 0, y: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      x: btn.x,
      y: btn.y,
      transition: { type: 'spring', stiffness: 500, damping: 22, delay: enterDelay },
    },
    // Plain dismiss: spring to FAB center, staggered
    exitNormal: {
      scale: 0,
      opacity: 0,
      x: 0,
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 30, delay: exitDelay },
    },
    // Selected: stays in place, scales up then collapses
    exitSelected: {
      scale: [1, 1.3, 0],
      opacity: [1, 1, 0],
      x: btn.x,
      y: btn.y,
      transition: { type: 'tween', duration: 0.35, times: [0, 0.4, 1] },
    },
  };

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
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={isSelected ? 'exitSelected' : 'exitNormal'}
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
          backgroundColor: 'var(--bg-surface)',
          border:          `1.5px solid ${btn.borderColor}`,
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

      {/* ── Label — appears 150ms after button ────────────────────────────── */}
      <motion.span
        initial={{ opacity: 0, x: 5 }}
        animate={{
          opacity: 1,
          x: 0,
          transition: { delay: enterDelay + 0.15, duration: 0.2, ease: 'easeOut' },
        }}
        exit={{ opacity: 0, x: 5 }}
        transition={{ duration: 0.1 }}
        style={{
          marginTop:     7,
          fontSize:      '0.67rem',
          fontFamily:    'var(--font-body)',
          fontWeight:    600,
          color:         '#ffffff',
          whiteSpace:    'nowrap',
          pointerEvents: 'none',
          textShadow:    '0 1px 4px rgba(0,0,0,0.65)',
          letterSpacing: '0.02em',
          display:       'block',
        }}
      >
        {btn.label}
      </motion.span>
    </motion.div>
  );
}

// ── FABMenu ───────────────────────────────────────────────────────────────────

export function FABMenu() {
  const [isFanOpen,    setIsFanOpen]    = useState(false);
  const [activeModal,  setActiveModal]  = useState<ActiveModal>('none');
  const [fabCenter,    setFabCenter]    = useState({ x: 0, y: 0 });
  // Tracks which mini button triggered close — drives exit emphasis
  const [selectedId,   setSelectedId]   = useState<ActiveModal | null>(null);
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
  const handleFabPress = useCallback(() => {
    // Short haptic buzz on FAB tap
    if (navigator.vibrate) navigator.vibrate(30);

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
  }, [isFanOpen]);

  // ── Fan button press ───────────────────────────────────────────────────────
  // 1. Lighter haptic
  // 2. Record which button was chosen (drives exitSelected variant)
  // 3. Close the fan (triggers exit animations)
  // 4. Open the corresponding modal 200 ms later (lets exit settle)
  // 5. Clear selectedId at 700 ms (well after exit animations finish)
  const handleFanButtonPress = useCallback((id: ActiveModal) => {
    if (navigator.vibrate) navigator.vibrate(20);
    setSelectedId(id);
    setIsFanOpen(false);
    setTimeout(() => setActiveModal(id), 200);
    setTimeout(() => setSelectedId(null), 700);
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
      {/*
        Resting: floats y:[0,-2,0] with shadow growing when up and shrinking when down.
        Opening: pulses scale 1→1.1→1 (0.2 s) as the fan launches.
        Shadow is animated in `animate` (not `style`) so it can loop with the float.
      */}
      <motion.button
        ref={fabRef}
        type="button"
        onClick={handleFabPress}
        aria-label={isFanOpen ? 'Close menu' : 'Add transaction'}
        aria-expanded={isFanOpen}
        initial={{
          boxShadow: '0 4px 12px rgba(42,45,52,0.08), 0 1px 4px rgba(0,0,0,0.06)',
        }}
        animate={
          isFanOpen
            ? {
                y: 0,
                // Pulse once on open
                scale: [1, 1.1, 1],
                boxShadow: '0 8px 24px rgba(42,45,52,0.20), 0 2px 8px rgba(0,0,0,0.12)',
              }
            : {
                y: [0, -2, 0],
                scale: 1,
                // Shadow grows as button lifts, shrinks as it returns
                boxShadow: [
                  '0 4px 12px rgba(42,45,52,0.08), 0 1px 4px rgba(0,0,0,0.06)',
                  '0 8px 20px rgba(42,45,52,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                  '0 4px 12px rgba(42,45,52,0.08), 0 1px 4px rgba(0,0,0,0.06)',
                ],
              }
        }
        transition={
          isFanOpen
            ? {
                scale:     { duration: 0.2, ease: 'easeInOut' },
                y:         { duration: 0.15 },
                boxShadow: { duration: 0.2 },
              }
            : {
                y:         { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                scale:     { duration: 0.15 },
                boxShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              }
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
          transition:      'background-color 0.2s ease',
        }}
      >
        {/* "+" rotates to "×" when fan opens */}
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
            {/* Backdrop — fades in with blur(4px) */}
            <motion.div
              key="fab-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsFanOpen(false)}
              aria-hidden="true"
              style={{
                position:             'fixed',
                inset:                0,
                zIndex:               50,
                backgroundColor:      'rgba(30, 32, 36, 0.55)',
                backdropFilter:       'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
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
                selectedId={selectedId}
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
