"use client";

import { ClerkProvider } from "@clerk/nextjs";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function isValidClerkKey(key: string | undefined): key is string {
  return !!key && (key.startsWith("pk_test_") || key.startsWith("pk_live_")) && key.length > 20;
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!isValidClerkKey(PUBLISHABLE_KEY)) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
