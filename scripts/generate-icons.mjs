// ============================================================
// KHARCHA — PWA Icon Generator
// Converts the inline SVG logo into 192×192 and 512×512 PNGs
// for the Web App Manifest.
//
// Run once: node scripts/generate-icons.mjs
// Requires sharp (available as a Next.js transitive dep).
// ============================================================

import { createRequire } from 'module';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = join(__dirname, '..');

// Load sharp from pnpm's hoisted location
const require = createRequire(import.meta.url);
const sharp   = require(join(ROOT, 'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp'));

// ── SVG template ─────────────────────────────────────────────────────────────
// Design: aged-bronze circle on parchment, white ₹ symbol
// Matches the KHARCHA "Slate & Parchment" design system.

function buildSvg(size) {
  const cx = size / 2;
  const r  = size * 0.46;              // circle leaves a small margin
  const fs = size * 0.42;             // font size relative to icon size
  const ty = cx + fs * 0.35;          // vertical center of ₹ glyph

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Parchment background -->
  <rect width="${size}" height="${size}" fill="#E5E2DD" rx="${size * 0.22}" ry="${size * 0.22}"/>
  <!-- Aged-bronze filled circle -->
  <circle cx="${cx}" cy="${cx}" r="${r}" fill="#8B7355"/>
  <!-- White ₹ symbol, DM Serif Display not available in SVG renderer
       so we fall back to a generic serif stack -->
  <text
    x="${cx}"
    y="${ty}"
    text-anchor="middle"
    font-family="serif"
    font-size="${fs}"
    font-weight="400"
    fill="#F2F0ED"
  >₹</text>
</svg>`;
}

// ── Generate ──────────────────────────────────────────────────────────────────

const outDir = join(ROOT, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const svg  = buildSvg(size);
  const buf  = Buffer.from(svg, 'utf8');
  const dest = join(outDir, `icon-${size}.png`);

  await sharp(buf)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(dest);

  console.log(`✓  ${dest}`);
}

console.log('\nPWA icons generated successfully.');
