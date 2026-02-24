'use client';

// ============================================================
// KHARCHA — VaultDoor
// Premium GSAP animation timeline wrapping VaultDoorSVG.
//
// Full cinematic (isFirstVisit = true, ~2.5 s):
//   Phase 1  0.0 → 0.6 s  Light scan    diagonal shimmer sweeps
//   Phase 2  0.3 → 1.1 s  Handle        CCW loosen + CW open
//   Phase 3  1.1 → 1.3 s  Spark         brief bronze flash
//   Phase 4  1.1 → 1.6 s  Door opens    rotateY + scale + fade
//   Phase 5  1.6 → 2.0 s  Light burst   radial bloom
//   Phase 6  2.0 → 2.5 s  Hold → onOpenComplete()
//
// Shortened (isFirstVisit = false, ~1.2 s):
//   Skips phases 1, 3, 5; faster 2 & 4; immediate callback
//
// Reduced motion: skip all, call onOpenComplete immediately.
// Session tracking: sessionStorage key 'kharcha_vault_visited'
// GSAP cleanup: gsap.context() + ctx.revert()
// ============================================================

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { VaultDoorSVG } from './VaultDoorSVG';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const SESSION_KEY = 'kharcha_vault_visited';

export interface VaultDoorProps {
  /** Rendered SVG diameter in px (default: 200) */
  size?: number;
  /**
   * true  → full cinematic (~2.5 s)
   * false → shortened (~1.2 s)
   * omit  → auto-detected from sessionStorage
   */
  isFirstVisit?: boolean;
  /** Fired once the opening animation finishes */
  onOpenComplete?: () => void;
  /** Skip all animation — kept for backwards compat */
  skipAnimation?: boolean;
}

export function VaultDoor({
  size = 200,
  isFirstVisit: isFirstVisitProp,
  onOpenComplete,
  skipAnimation = false,
}: VaultDoorProps) {
  // ── Refs ──────────────────────────────────────────────────
  const containerRef   = useRef<HTMLDivElement>(null);
  const svgWrapperRef  = useRef<HTMLDivElement>(null);
  const lightScanRef   = useRef<HTMLDivElement>(null);
  const sparkRef       = useRef<HTMLDivElement>(null);
  const lightBurstRef  = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();

  // ── Resolve cinematic flag once (lazy useState) ───────────
  const [cinematic] = useState<boolean>(() => {
    // Prop wins if provided
    if (isFirstVisitProp !== undefined) return isFirstVisitProp;
    // SSR guard
    if (typeof window === 'undefined') return false;
    // Check session; mark visited on first call
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (!seen) {
      sessionStorage.setItem(SESSION_KEY, '1');
      return true;
    }
    return false;
  });

  // ── GSAP timeline ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    // Reduced motion / legacy skip → show final state immediately
    if (prefersReducedMotion || skipAnimation) {
      const handle = containerRef.current.querySelector<Element>('#vault-handle');
      const wrapper = svgWrapperRef.current;
      if (handle)  gsap.set(handle,  { rotation: 90, svgOrigin: '120 120' });
      if (wrapper) gsap.set(wrapper, { rotateY: -8, scale: 0.96 });
      onOpenComplete?.();
      return;
    }

    const ctx = gsap.context(() => {
      const handle    = containerRef.current!.querySelector<Element>('#vault-handle');
      const wrapper   = svgWrapperRef.current;
      const lightScan = lightScanRef.current;
      const spark     = sparkRef.current;
      const burst     = lightBurstRef.current;

      if (!handle || !wrapper) return;

      // Reset to clean initial state
      gsap.set(handle,  { rotation: 0,   svgOrigin: '120 120' });
      gsap.set(wrapper, { rotateY: 0, scale: 1, opacity: 1 });
      if (lightScan) gsap.set(lightScan, { x: '-100%' });
      if (spark)     gsap.set(spark,     { scale: 0, opacity: 0 });
      if (burst)     gsap.set(burst,     { scale: 0, opacity: 0 });

      const tl = gsap.timeline({ onComplete: () => onOpenComplete?.() });

      if (cinematic) {
        // ══════════════════════════════════════════════
        // FULL CINEMATIC  (~2.5 s)
        // ══════════════════════════════════════════════

        // Phase 1 — Light scan (0 → 0.6 s)
        if (lightScan) {
          tl.to(lightScan, {
            x: '100%',
            duration: 0.6,
            ease: 'none',
          }, 0);
        }

        // Phase 2A — Handle: CCW loosen (0.3 → 0.5 s)
        tl.to(handle, {
          rotation: -15,
          svgOrigin: '120 120',
          duration: 0.2,
          ease: 'power2.inOut',
        }, 0.3);

        // Phase 2B — Handle: CW open to 90° (0.5 → 1.1 s)
        tl.to(handle, {
          rotation: 90,
          svgOrigin: '120 120',
          duration: 0.6,
          ease: 'power2.inOut',
        }, 0.5);

        // Phase 3 — Click spark (1.1 → 1.3 s)
        if (spark) {
          tl.to(spark, {
            scale: 1.5,
            opacity: 0.6,
            duration: 0.1,
            ease: 'power1.out',
          }, 1.1);
          tl.to(spark, {
            scale: 0,
            opacity: 0,
            duration: 0.1,
            ease: 'power1.in',
          }, 1.2);
        }

        // Phase 4 — Door opens: 3D rotateY + shrink (1.1 → 1.6 s)
        // NOTE: NO opacity here — Framer Motion owns opacity on the outer wrapper
        // to prevent compounding (GSAP 0.2 × Framer 0.3 = 0.06, too transparent)
        tl.to(wrapper, {
          rotateY: -8,
          scale: 0.96,
          duration: 0.5,
          ease: 'power2.out',
        }, 1.1);

        // Phase 5 — Light burst bloom (1.6 → 2.0 s)
        if (burst) {
          tl.to(burst, {
            scale: 2,
            opacity: 0.3,
            duration: 0.2,
            ease: 'power1.out',
          }, 1.6);
          tl.to(burst, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.in',
          }, 1.8);
        }

        // Phase 6 — Hold 0.5 s then onComplete fires (2.0 → 2.5 s)
        // Animate wrapper to same values — zero visual change, adds duration
        tl.to(wrapper, { scale: 0.96, duration: 0.5 }, 2.0);

      } else {
        // ══════════════════════════════════════════════
        // SHORTENED  (~1.2 s)
        // ══════════════════════════════════════════════

        // Small lead-in delay (0 → 0.2 s)
        // Phase 2A — Handle: CCW loosen (0.2 → 0.35 s)
        tl.to(handle, {
          rotation: -10,
          svgOrigin: '120 120',
          duration: 0.15,
          ease: 'power2.inOut',
        }, 0.2);

        // Phase 2B — Handle: CW open (0.35 → 0.6 s)
        tl.to(handle, {
          rotation: 90,
          svgOrigin: '120 120',
          duration: 0.25,
          ease: 'power2.inOut',
        }, 0.35);

        // Phase 4 — Door opens: faster (0.6 → 0.9 s)
        // NOTE: NO opacity — Framer Motion owns it on the outer wrapper
        tl.to(wrapper, {
          rotateY: -8,
          scale: 0.96,
          duration: 0.3,
          ease: 'power2.out',
        }, 0.6);

        // Brief hold (0.9 → 1.2 s) then onComplete
        tl.to(wrapper, { scale: 0.96, duration: 0.3 }, 0.9);
      }
    }, containerRef);

    return () => ctx.revert();
  }, [cinematic, prefersReducedMotion, skipAnimation, onOpenComplete]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size, perspective: '800px' }}
    >
      {/* Light burst — sits behind the SVG, blooms outward on door open */}
      <div
        ref={lightBurstRef}
        className="absolute pointer-events-none"
        style={{
          inset: 0,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          transform: 'scale(0)',
          opacity: 0,
        }}
      />

      {/* SVG wrapper — receives rotateY for the 3D door-swing effect */}
      <div
        ref={svgWrapperRef}
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <VaultDoorSVG size={size} />

        {/* Light scan overlay — clipped to circle, sweeps left → right */}
        <div
          ref={lightScanRef}
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
            clipPath: 'circle(50%)',
            transform: 'translateX(-100%)',
          }}
        />

        {/* Spark — brief bronze flash at handle center on click */}
        <div
          ref={sparkRef}
          className="absolute pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--color-accent-light)',
            transform: 'translate(-50%, -50%) scale(0)',
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}

export default VaultDoor;
