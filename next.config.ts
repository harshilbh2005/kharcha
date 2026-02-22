import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // In dev, allow 'unsafe-eval' for Next.js HMR + Clerk's CDN scripts
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://*.clerk.accounts.dev`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.clerk.com",
      `connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.clerk.com https://api.exchangerate-api.com https://*.clerk.accounts.dev${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
      "frame-src 'self' https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
  {
    // DENY in production, SAMEORIGIN in dev so the preview iframe works
    key: "X-Frame-Options",
    value: isDev ? "SAMEORIGIN" : "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
