import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service role key.
 * This client bypasses Row Level Security (RLS) and should ONLY be used
 * in trusted server-side contexts (e.g. cron jobs, internal API routes).
 * Never expose the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      // Disable auto-refreshing tokens for server-side service clients
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
