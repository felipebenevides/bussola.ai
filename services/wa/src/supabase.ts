import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _client: SupabaseClient<any, "bussola", "bussola"> | null = null;

export function db(): SupabaseClient<any, "bussola", "bussola"> {
  if (_client) return _client;
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = env();
  _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bussola" },
  });
  return _client;
}
