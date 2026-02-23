'use client';

// ============================================================
// KHARCHA — VaultDoor
// Animated SVG vault door with GSAP timeline.
//
// On mount:
//   Step 1: handle rotates 0→90° (0.8s ease)
//   Step 2: door "opens" — slight scale + shadow change (0.4s)
//
// Colors: var(--color-vault) door, var(--color-accent) handle
// Size: 200px diameter, SVG-based for clean scaling
// ============================================================

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export interface VaultDoorProps {
  /** Outer diameter in px (default: 200) */
  size?: number;
  /** Skip the animation and show opened state immediately */
  skipAnimation?: boolean;
}

export function VaultDoor({ size = 200, skipAnimation = false }: VaultDoorProps) {
  const doorRef = useRef<SVGGElement>(null);
  const handleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!doorRef.current || !handleRef.current) return;

    if (skipAnimation) {
      gsap.set(handleRef.current, { rotation: 90, transformOrigin: '50% 50%' });
      gsap.set(doorRef.current, { scale: 1.03 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // Step 1: Handle rotates from 0 to 90 degrees
    tl.to(handleRef.current, {
      rotation: 90,
      transformOrigin: '50% 50%',
      duration: 0.8,
      delay: 0.3,
    });

    // Step 2: Door "opens" — slight scale + shadow pulse
    tl.to(doorRef.current, {
      scale: 1.03,
      duration: 0.4,
      ease: 'power1.out',
    });

    return () => { tl.kill(); };
  }, [skipAnimation]);

  const half = size / 2;
  const outerR = half - 4; // outer ring radius
  const innerR = outerR * 0.72; // inner dial circle
  const handleLen = innerR * 0.55; // handle spoke length
  const boltR = outerR * 0.12; // bolt circles

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Drop shadow filter */}
        <defs>
          <filter id="vault-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="rgba(92,107,94,0.25)" />
          </filter>
          <radialGradient id="vault-gradient" cx="40%" cy="35%">
            <stop offset="0%" stopColor="var(--color-vault)" stopOpacity="1" />
            <stop offset="100%" stopColor="#4A5A4C" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Door group — scales on "open" */}
        <g ref={doorRef} style={{ transformOrigin: `${half}px ${half}px` }}>
          {/* Outer ring */}
          <circle
            cx={half}
            cy={half}
            r={outerR}
            fill="url(#vault-gradient)"
            filter="url(#vault-shadow)"
          />

          {/* Outer rim line */}
          <circle
            cx={half}
            cy={half}
            r={outerR - 3}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Bolt circles at 4 corners */}
          {[45, 135, 225, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const boltDist = outerR - 12;
            const bx = half + Math.cos(rad) * boltDist;
            const by = half + Math.sin(rad) * boltDist;
            return (
              <circle
                key={angle}
                cx={bx}
                cy={by}
                r={boltR}
                fill="rgba(255,255,255,0.08)"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Inner dial circle */}
          <circle
            cx={half}
            cy={half}
            r={innerR}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1.5"
          />

          {/* Dial tick marks (12 positions like a clock) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const tickInner = innerR - 6;
            const tickOuter = innerR + 1;
            return (
              <line
                key={i}
                x1={half + Math.cos(angle) * tickInner}
                y1={half + Math.sin(angle) * tickInner}
                x2={half + Math.cos(angle) * tickOuter}
                y2={half + Math.sin(angle) * tickOuter}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
                strokeLinecap="round"
              />
            );
          })}

          {/* Handle group — rotates */}
          <g ref={handleRef} style={{ transformOrigin: `${half}px ${half}px` }}>
            {/* Handle spokes (3-arm) */}
            {[0, 120, 240].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <line
                  key={angle}
                  x1={half}
                  y1={half}
                  x2={half + Math.cos(rad) * handleLen}
                  y2={half + Math.sin(rad) * handleLen}
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Handle tip circles */}
            {[0, 120, 240].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={`tip-${angle}`}
                  cx={half + Math.cos(rad) * handleLen}
                  cy={half + Math.sin(rad) * handleLen}
                  r={4}
                  fill="var(--color-accent)"
                />
              );
            })}

            {/* Center hub */}
            <circle
              cx={half}
              cy={half}
              r={8}
              fill="var(--color-accent)"
            />
            <circle
              cx={half}
              cy={half}
              r={4}
              fill="var(--color-vault)"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default VaultDoor;
