import { createServerClient } from "@supabase/ssr";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client that uses Clerk's JWT for RLS.
 *
 * Setup:
 * 1. In Clerk Dashboard -> JWT Templates -> Create "supabase" template
 * 2. Set claims: { "sub": "{{user.id}}", "role": "authenticated" }
 * 3. Copy Clerk's JWKS endpoint
 * 4. In Supabase -> Settings -> Auth -> JWT Secret -> Set Clerk's JWT signing key
 *
 * Now Supabase RLS policies can use auth.jwt() ->> 'sub' to get Clerk user ID
 */
export async function createClient() {
  const { getToken } = await auth();
  const supabaseToken = await getToken({ template: "supabase" });

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    }
  );
}
