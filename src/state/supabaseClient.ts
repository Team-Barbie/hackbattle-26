import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

function readConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function isClinicCloudEnabled(): boolean {
  return readConfig() !== null;
}

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }

  const config = readConfig();
  client = config ? createClient(config.url, config.anonKey) : null;
  return client;
}
