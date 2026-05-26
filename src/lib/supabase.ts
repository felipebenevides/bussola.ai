import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

function assertEnv() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars missing. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local."
    );
  }
}

let _server: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient {
  assertEnv();
  if (!_server) {
    _server = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _server;
}

export function supabaseAdmin(): SupabaseClient {
  assertEnv();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_KEY ausente — necessário para escrita server-side.");
  }
  if (!_admin) {
    _admin = createClient(url!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
