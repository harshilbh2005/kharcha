'use client';

// ============================================================
// KHARCHA — VaultDoorSVG
// Premium bank-vault safe door SVG.
//
// GSAP targets:
//   #vault-door-body  — main door disc (scale, opacity)
//   #vault-handle     — cross handle   (rotation, transformOrigin: 120px 120px)
//
// All colors via CSS variables. viewBox fixed at 0 0 240 240.
// ============================================================

interface VaultDoorSVGProps {
  /** Rendered width/height in px (default: 220) */
  size?: number;
  className?: string;
}

export function VaultDoorSVG({ size = 220, className }: VaultDoorSVGProps) {
  const cx = 120;
  const cy = 120;

  // 8 bolt holes evenly spaced (starting at 12 o'clock, clockwise)
  const boltRingR = 94;
  const bolts = Array.from({ length: 8 }, (_, i) => {
    const rad = (i * Math.PI) / 4; // 0°, 45°, 90° …
    return {
      x: +(cx + boltRingR * Math.sin(rad)).toFixed(2),
      y: +(cy - boltRingR * Math.cos(rad)).toFixed(2),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      overflow="visible"
      aria-label="Vault door"
      role="img"
    >
      <defs>
        {/* ── Drop shadow for the whole door ── */}
        <filter id="door-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="8"
            floodOpacity="0.15"
          />
        </filter>

        {/* ── Door body: radial gradient — lighter at top-left, darker at edge ── */}
        <radialGradient id="doorBodyGrad" cx="36%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="var(--color-vault-light)" stopOpacity="0.9" />
          <stop offset="55%"  stopColor="var(--color-vault)" />
          <stop offset="100%" stopColor="#1E3828" />
        </radialGradient>

        {/* ── Outer frame ring: metallic radial ── */}
        <radialGradient id="frameGrad" cx="28%" cy="22%" r="80%">
          <stop offset="0%"   stopColor="#5A8A6E" />
          <stop offset="42%"  stopColor="var(--color-vault)" />
          <stop offset="100%" stopColor="#162B20" />
        </radialGradient>

        {/* ── Handle arms: linear metallic gold ── */}
        <linearGradient id="handleGrad" x1="8%" y1="4%" x2="92%" y2="96%">
          <stop offset="0%"   stopColor="#D4BE96" />
          <stop offset="28%"  stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="#5E4A1C" />
        </linearGradient>

        {/* ── Center cap: radial gold ── */}
        <radialGradient id="capGrad" cx="30%" cy="26%" r="70%">
          <stop offset="0%"   stopColor="#D4BE96" />
          <stop offset="52%"  stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="#5E4A1C" />
        </radialGradient>

        {/* ── Bolt highlights ── */}
        <radialGradient id="boltGrad" cx="30%" cy="28%" r="68%">
          <stop offset="0%"   stopColor="#D4BE96" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* ══════════════════════════════════════════════════
          Everything inside this <g> gets the drop shadow
          ══════════════════════════════════════════════════ */}
      <g filter="url(#door-shadow)">

        {/* ───────────────────────────────────────────────
            1. OUTER FRAME
            A filled metallic ring that the door sits inside
            ─────────────────────────────────────────────── */}
        {/* Frame base — filled metallic disc */}
        <circle cx={cx} cy={cy} r="116" fill="url(#frameGrad)" />

        {/* Outer bevel highlight (light catching the top-left rim) */}
        <circle
          cx={cx} cy={cy} r="115"
          fill="none"
          stroke="var(--color-vault-light)"
          strokeWidth="0.75"
          strokeOpacity="0.38"
        />

        {/* Inner frame machining line */}
        <circle
          cx={cx} cy={cy} r="110"
          fill="none"
          stroke="#1A2E1F"
          strokeWidth="2"
          strokeOpacity="0.55"
        />

        {/* Frame-to-door shadow step (dark inset annulus) */}
        <circle cx={cx} cy={cy} r="107" fill="#0F1A12" fillOpacity="0.55" />

        {/* ───────────────────────────────────────────────
            2. DOOR BODY
            ─────────────────────────────────────────────── */}
        <circle
          id="vault-door-body"
          cx={cx} cy={cy} r="104"
          fill="url(#doorBodyGrad)"
        />

        {/* Door edge — shadow bevel (bottom-right) */}
        <circle
          cx={cx} cy={cy} r="104"
          fill="none"
          stroke="#0F1A12"
          strokeWidth="2.5"
          strokeOpacity="0.5"
        />
        {/* Door edge — light bevel (top-left) */}
        <circle
          cx={cx} cy={cy} r="102.5"
          fill="none"
          stroke="var(--color-vault-light)"
          strokeWidth="0.75"
          strokeOpacity="0.18"
        />

        {/* ───────────────────────────────────────────────
            3. INNER DECORATIVE RINGS (machined grooves)
            ─────────────────────────────────────────────── */}
        <circle
          cx={cx} cy={cy} r="88"
          fill="none"
          stroke="var(--color-vault-light)"
          strokeWidth="1"
          strokeOpacity="0.28"
        />
        <circle
          cx={cx} cy={cy} r="75"
          fill="none"
          stroke="var(--color-vault-light)"
          strokeWidth="0.75"
          strokeOpacity="0.20"
        />
        <circle
          cx={cx} cy={cy} r="62"
          fill="none"
          stroke="var(--color-vault-light)"
          strokeWidth="0.5"
          strokeOpacity="0.15"
        />

        {/* ───────────────────────────────────────────────
            4. BOLT HOLES — 8 evenly spaced around edge
            ─────────────────────────────────────────────── */}
        {bolts.map((b, i) => (
          <g key={i}>
            {/* Recess shadow */}
            <circle
              cx={b.x + 0.8} cy={b.y + 0.8} r="5.5"
              fill="#0F1A12"
              fillOpacity="0.4"
            />
            {/* Bolt body */}
            <circle
              cx={b.x} cy={b.y} r="4.5"
              fill="url(#boltGrad)"
            />
            {/* Bolt center recess */}
            <circle
              cx={b.x} cy={b.y} r="2.5"
              fill="var(--color-vault)"
              fillOpacity="0.75"
            />
            {/* Specular highlight */}
            <circle
              cx={b.x - 1.3} cy={b.y - 1.3} r="1.1"
              fill="#D4BE96"
              fillOpacity="0.62"
            />
          </g>
        ))}

        {/* ───────────────────────────────────────────────
            5. HANDLE GROUP  ← GSAP target: vault-handle
               transformOrigin must be set in GSAP as
               gsap.set('#vault-handle', { transformOrigin:'120px 120px' })
            ─────────────────────────────────────────────── */}
        <g id="vault-handle" style={{ transformOrigin: '120px 120px' }}>

          {/* Arm drop shadows */}
          <rect
            x="81" y="115.75" width="78" height="10" rx="5"
            fill="#0F1A12" fillOpacity="0.28"
          />
          <rect
            x="115.75" y="81" width="10" height="78" rx="5"
            fill="#0F1A12" fillOpacity="0.28"
          />

          {/* Horizontal arm */}
          <rect
            x="80" y="115" width="80" height="10" rx="5"
            fill="url(#handleGrad)"
          />
          {/* Vertical arm */}
          <rect
            x="115" y="80" width="10" height="80" rx="5"
            fill="url(#handleGrad)"
          />

          {/* Top-face specular streak — horizontal */}
          <rect
            x="82" y="115.5" width="76" height="2.25" rx="1.12"
            fill="#D4BE96" fillOpacity="0.38"
          />
          {/* Top-face specular streak — vertical */}
          <rect
            x="115.5" y="82" width="2.25" height="76" rx="1.12"
            fill="#D4BE96" fillOpacity="0.38"
          />

          {/* Center cap — outer bronze ring */}
          <circle cx={cx} cy={cy} r="17" fill="url(#capGrad)" />
          {/* Center cap — outer rim highlight */}
          <circle
            cx={cx} cy={cy} r="17"
            fill="none"
            stroke="#D4BE96"
            strokeWidth="0.75"
            strokeOpacity="0.45"
          />
          {/* Center cap — vault-dark inset well */}
          <circle cx={cx} cy={cy} r="12" fill="var(--color-vault)" />
          {/* Center cap — fine ring etching */}
          <circle
            cx={cx} cy={cy} r="12"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="0.75"
            strokeOpacity="0.65"
          />
          {/* Center dot */}
          <circle cx={cx} cy={cy} r="4.5" fill="url(#capGrad)" />
          {/* Center dot specular */}
          <circle
            cx={cx - 1.5} cy={cy - 1.5} r="1.5"
            fill="#D4BE96" fillOpacity="0.72"
          />
        </g>

        {/* ───────────────────────────────────────────────
            6. KEYHOLE — small decorative teardrop below center
            ─────────────────────────────────────────────── */}
        <g opacity="0.3" fill="var(--text-primary)">
          {/* Circle (top of keyhole) */}
          <circle cx={cx} cy="148" r="5" />
          {/* Shaft (tapered trapezoid) */}
          <path d="M116.5 152.5 L123.5 152.5 L121.5 162 L118.5 162 Z" />
        </g>

      </g>
    </svg>
  );
}

export default VaultDoorSVG;
