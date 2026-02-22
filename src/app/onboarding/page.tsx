'use client';

// ============================================================
// KHARCHA — Onboarding Wizard
// 4-step flow: Welcome → Name → PIN Setup → All Set
// Shows only for first-time users (onboarding_completed = false).
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Delete, ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { completeOnboarding } from '@/app/actions/onboarding';
import { deriveKey } from '@/lib/crypto';
import { useEncryptionStore } from '@/stores/encryption-store';

// ── Constants ───────────────────────────────────────────────────

const MAX_PIN_LENGTH = 6;
const MIN_PIN_LENGTH = 4;
const TOTAL_STEPS = 4;

const NUM_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
] as const;

// ── Slide variants for step transitions ─────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: 'spring' as const, stiffness: 300, damping: 30 },
  opacity: { duration: 0.2 },
};

// ── Notebook SVG Illustration ───────────────────────────────────

function NotebookIllustration() {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-40 w-40"
    >
      {/* Shadow */}
      <ellipse cx="80" cy="140" rx="50" ry="6" fill="var(--border-default)" opacity="0.4" />
      {/* Notebook body */}
      <rect x="28" y="24" width="104" height="112" rx="4" fill="var(--bg-surface)" stroke="var(--border-default)" strokeWidth="1.5" />
      {/* Spine */}
      <line x1="80" y1="24" x2="80" y2="136" stroke="var(--border-default)" strokeWidth="1" />
      {/* Ruled lines — left page */}
      <line x1="38" y1="48" x2="72" y2="48" stroke="var(--border-default)" opacity="0.3" />
      <line x1="38" y1="60" x2="72" y2="60" stroke="var(--border-default)" opacity="0.3" />
      <line x1="38" y1="72" x2="72" y2="72" stroke="var(--border-default)" opacity="0.3" />
      <line x1="38" y1="84" x2="68" y2="84" stroke="var(--border-default)" opacity="0.3" />
      <line x1="38" y1="96" x2="64" y2="96" stroke="var(--border-default)" opacity="0.3" />
      {/* Ruled lines — right page */}
      <line x1="88" y1="48" x2="122" y2="48" stroke="var(--border-default)" opacity="0.3" />
      <line x1="88" y1="60" x2="122" y2="60" stroke="var(--border-default)" opacity="0.3" />
      <line x1="88" y1="72" x2="122" y2="72" stroke="var(--border-default)" opacity="0.3" />
      <line x1="88" y1="84" x2="118" y2="84" stroke="var(--border-default)" opacity="0.3" />
      {/* Pen */}
      <line x1="118" y1="16" x2="104" y2="68" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="104" cy="68" r="1.5" fill="var(--color-accent)" />
      {/* Ink marks on left page (handwriting feel) */}
      <line x1="40" y1="47" x2="58" y2="47" stroke="var(--color-accent)" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
      <line x1="40" y1="59" x2="65" y2="59" stroke="var(--color-accent)" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
      <line x1="40" y1="71" x2="52" y2="71" stroke="var(--color-accent)" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function OnboardingPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const setKey = useEncryptionStore((s) => s.setKey);

  // ── Step state ──────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // ── Form state ──────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('');

  // ── PIN state ───────────────────────────────────────────────
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmingPin, setIsConfirmingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // ── Submit state ────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Ref to track whether we've already checked confirmation
  const confirmChecked = useRef(false);

  // ── Derived ─────────────────────────────────────────────────
  const currentPin = isConfirmingPin ? confirmPin : pin;

  // ── Navigation ──────────────────────────────────────────────
  const goForward = useCallback(() => {
    setDirection(1);
    setStep((s) => s + 1);
  }, []);

  // ── PIN key handler ─────────────────────────────────────────
  const handlePinKey = useCallback(
    (key: string) => {
      if (isSubmitting) return;
      setPinError(null);

      const setter = isConfirmingPin ? setConfirmPin : setPin;

      if (key === 'backspace') {
        setter((prev) => prev.slice(0, -1));
        return;
      }

      setter((prev) => {
        if (prev.length >= MAX_PIN_LENGTH) return prev;
        return prev + key;
      });
    },
    [isConfirmingPin, isSubmitting],
  );

  // ── Physical keyboard support ─────────────────────────────
  useEffect(() => {
    if (step !== 2) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinKey(e.key);
      } else if (e.key === 'Backspace') {
        handlePinKey('backspace');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, handlePinKey]);

  // ── PIN confirmation check ────────────────────────────────
  useEffect(() => {
    if (!isConfirmingPin) return;
    if (confirmPin.length < MIN_PIN_LENGTH) {
      confirmChecked.current = false;
      return;
    }
    if (confirmPin.length !== pin.length) return;
    if (confirmChecked.current) return;

    confirmChecked.current = true;

    if (confirmPin === pin) {
      // Match — advance to step 3
      goForward();
    } else {
      // Mismatch — shake + clear
      setShakeKey((k) => k + 1);
      setPinError("PINs don't match, try again");
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
      setTimeout(() => {
        setConfirmPin('');
        confirmChecked.current = false;
      }, 400);
    }
  }, [confirmPin, pin, isConfirmingPin, goForward]);

  // ── Handle "Continue" on PIN entry (step 2, before confirm) ─
  const handlePinContinue = useCallback(() => {
    if (pin.length >= MIN_PIN_LENGTH) {
      setIsConfirmingPin(true);
      setPinError(null);
      confirmChecked.current = false;
    }
  }, [pin]);

  // ── Complete onboarding (step 3 button) ─────────────────────
  const handleComplete = useCallback(async () => {
    if (!userId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await completeOnboarding({
        clerkUserId: userId,
        displayName: displayName.trim(),
        pin,
      });

      if (!result.success) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Derive encryption key from PIN + returned salt
      const saltBytes = Uint8Array.from(atob(result.salt), (c) =>
        c.charCodeAt(0),
      );
      const { key, salt } = await deriveKey(pin, saltBytes);
      setKey(key, salt);

      // Redirect to dashboard
      router.push('/');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }, [userId, displayName, pin, setKey, router]);

  // ── Step 0: Welcome ─────────────────────────────────────────

  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <NotebookIllustration />
      </motion.div>

      <h1 className="mt-6 font-display text-3xl text-ink-primary">
        Welcome to Kharcha
      </h1>
      <p className="mt-2 font-body text-base text-ink-secondary">
        Where every rupee tells a story
      </p>

      <Button
        className="mt-10"
        size="lg"
        fullWidth
        onClick={goForward}
      >
        Get Started
        <ArrowRight size={18} />
      </Button>
    </div>
  );

  // ── Step 1: Name ────────────────────────────────────────────

  const renderName = () => (
    <div className="flex w-full flex-col items-center text-center">
      <h2 className="font-display text-xl text-ink-primary">
        What should we call you?
      </h2>
      <p className="mt-1 font-body text-sm text-ink-secondary">
        This will appear on your dashboard
      </p>

      <div className="mt-8 w-full">
        <Input
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          autoFocus
        />
      </div>

      <Button
        className="mt-8"
        size="lg"
        fullWidth
        onClick={goForward}
        disabled={displayName.trim().length === 0}
      >
        Continue
        <ArrowRight size={18} />
      </Button>
    </div>
  );

  // ── Step 2: PIN Setup ───────────────────────────────────────

  const renderPin = () => (
    <div className="flex w-full flex-col items-center text-center">
      <Lock size={32} className="mb-3 text-bronze" />

      <h2 className="font-display text-xl text-ink-primary">
        {isConfirmingPin ? 'Confirm your PIN' : 'Secure your finances'}
      </h2>
      <p className="mt-1 font-body text-sm text-ink-secondary">
        {isConfirmingPin
          ? 'Re-enter the same PIN'
          : 'Create a 4–6 digit PIN to protect your data'}
      </p>

      {/* PIN circles */}
      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="mt-6 flex gap-3"
      >
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => {
          const isFilled = i < currentPin.length;
          return (
            <motion.div
              key={i}
              animate={isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ duration: 0.15 }}
              className="h-3.5 w-3.5 rounded-full transition-colors duration-150"
              style={{
                backgroundColor: isFilled ? 'var(--color-accent)' : 'transparent',
                border: isFilled
                  ? '2px solid var(--color-accent)'
                  : '2px solid var(--border-default)',
              }}
            />
          );
        })}
      </motion.div>

      {/* Error / hint */}
      <div className="mt-3 h-5 font-body text-sm text-terracotta">
        {pinError ?? ''}
      </div>

      {/* Number pad */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {NUM_KEYS.flat().map((key, i) => {
          if (key === '') {
            return <div key={i} className="h-16 w-16" />;
          }

          const isBackspace = key === 'backspace';

          return (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => handlePinKey(key)}
              className={[
                'flex h-16 w-16 items-center justify-center rounded-full',
                'font-display text-2xl text-ink-primary',
                'bg-stone-surface',
                'transition-colors duration-150',
                'active:bg-stone-surface-hover',
                'select-none cursor-pointer',
              ].join(' ')}
              aria-label={isBackspace ? 'Delete' : key}
            >
              {isBackspace ? (
                <Delete size={22} className="text-ink-secondary" />
              ) : (
                key
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Continue button (only in initial PIN entry, not confirm) */}
      {!isConfirmingPin && (
        <Button
          className="mt-6"
          size="lg"
          fullWidth
          onClick={handlePinContinue}
          disabled={pin.length < MIN_PIN_LENGTH}
        >
          Continue
          <ArrowRight size={18} />
        </Button>
      )}
    </div>
  );

  // ── Step 3: All Set ─────────────────────────────────────────

  const renderComplete = () => (
    <div className="flex w-full flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <ShieldCheck size={56} className="text-sage" />
      </motion.div>

      <h2 className="mt-4 font-display text-2xl text-ink-primary">
        You&apos;re all set!
      </h2>
      <p className="mt-1 font-body text-sm text-ink-secondary">
        Your data is encrypted and secure
      </p>

      {/* Security summary */}
      <div className="mt-6 w-full space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-stone-surface px-4 py-3">
          <CheckCircle2 size={20} className="shrink-0 text-sage" />
          <span className="font-body text-sm text-ink-primary">
            Encryption: AES-256-GCM
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-stone-surface px-4 py-3">
          <CheckCircle2 size={20} className="shrink-0 text-sage" />
          <span className="font-body text-sm text-ink-primary">
            PIN Protected
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-stone-surface px-4 py-3">
          <CheckCircle2 size={20} className="shrink-0 text-sage" />
          <span className="font-body text-sm text-ink-primary">
            Zero-knowledge — only you can see your data
          </span>
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <p className="mt-4 font-body text-sm text-terracotta">{submitError}</p>
      )}

      <Button
        className="mt-8"
        size="lg"
        fullWidth
        onClick={handleComplete}
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Setting up...' : 'Start Tracking'}
        {!isSubmitting && <ArrowRight size={18} />}
      </Button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────

  const steps = [renderWelcome, renderName, renderPin, renderComplete];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-global px-6 py-8">
      {/* Progress dots */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor:
                i <= step ? 'var(--color-accent)' : 'var(--border-default)',
              scale: i === step ? 1.2 : 1,
            }}
            className="h-2 w-2 rounded-full"
          />
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="flex flex-col items-center"
          >
            {steps[step]()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
