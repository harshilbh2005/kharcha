// ============================================================
// KHARCHA — Server-side push notification dispatcher
//
// Call this AFTER writing to the `notifications` table to also
// deliver a Web Push to all subscribed devices for the profile.
//
// Usage (server action / API route):
//   await dispatchPush({ profileId, title, body, url, type });
//
// Non-critical: errors are swallowed so callers are never blocked.
// ============================================================

interface PushPayload {
  profileId: string;
  title:     string;
  body:      string;
  url?:      string;
  type?:     string;
}

/**
 * Fires a Web Push notification to all registered devices for `profileId`.
 * Safe to call with `void` — never throws.
 */
export async function dispatchPush(payload: PushPayload): Promise<void> {
  const secret = process.env.PUSH_INTERNAL_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!secret) return; // VAPID not configured — silently skip

  try {
    await fetch(`${appUrl}/api/push/send`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "x-push-secret": secret,
      },
      body: JSON.stringify({
        profileId: payload.profileId,
        title:     payload.title,
        body:      payload.body,
        url:       payload.url ?? "/",
        type:      payload.type ?? "general",
      }),
    });
  } catch {
    // Non-critical — never block callers
  }
}
