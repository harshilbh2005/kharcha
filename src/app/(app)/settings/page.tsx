// ============================================================
// KHARCHA — Settings Page
//
// Server component: fetches profile, app_settings, and categories
// in parallel, then renders the fully-interactive SettingsClient.
//
// All mutations are handled by server actions inside SettingsClient —
// no form posts or API calls from the page itself.
// ============================================================

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { getAppSettings } from "@/app/actions/settings";
import { getCategories } from "@/app/actions/categories";
import Header from "@/components/layout/Header";
import { SettingsClient } from "@/components/settings/SettingsClient";
import type { AppSettings } from "@/types";

export const metadata = { title: "Settings — Kharcha" };

export default async function SettingsPage() {
  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [profile, appSettingsResult, categoriesResult] = await Promise.all([
    getProfile(),
    getAppSettings(),
    getCategories(),
  ]);

  // Layout already handles the auth guard; this is a belt-and-suspenders check
  if (!profile) redirect("/onboarding");

  // Graceful fallback if app_settings row doesn't exist yet
  const appSettings: AppSettings = ("success" in appSettingsResult)
    ? appSettingsResult.data
    : {
        id: "",
        profile_id: profile.id,
        exchange_rate_usd_inr: 84.0,
        exchange_rate_updated_at: null,
        theme: "parchment",
        tasker_webhook_secret: null,
        ai_categorization_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const categories = ("success" in categoriesResult) ? categoriesResult.data : [];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-global)",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
      }}
    >
      <Header title="Settings" />

      <SettingsClient
        profile={profile}
        appSettings={appSettings}
        categories={categories}
      />
    </div>
  );
}
