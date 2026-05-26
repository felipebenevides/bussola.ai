import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Aliases de cliente tipado no schema dedicado. O parâmetro genérico
// "bussola" precisa bater com o argumento `db.schema` passado ao createClient
// para o TypeScript não inferir "public".
type BussolaClient = SupabaseClient<any, "bussola", "bussola">;

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

// Schema dedicado da Bússola — isola tabelas/RPCs de outros apps no mesmo
// projeto Supabase. Precisa estar listado em Settings → API → Exposed schemas.
const BUSSOLA_SCHEMA = "bussola";

let _server: BussolaClient | null = null;
let _admin: BussolaClient | null = null;

export function supabaseServer(): BussolaClient {
  assertEnv();
  if (!_server) {
    _server = createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: BUSSOLA_SCHEMA },
    });
  }
  return _server;
}

export function supabaseAdmin(): BussolaClient {
  assertEnv();
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_KEY ausente — necessário para escrita server-side.");
  }
  if (!_admin) {
    _admin = createClient(url!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: BUSSOLA_SCHEMA },
    });
  }
  return _admin;
}
