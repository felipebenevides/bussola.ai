import { z } from "zod";

const Schema = z.object({
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(16, "use openssl rand -hex 24"),

  NEXTJS_PROCESS_URL: z.string().url(),
  INTERNAL_HMAC_SECRET: z.string().min(32, "use openssl rand -hex 32"),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`[env] Configuração inválida:\n${issues}`);
    process.exit(1);
  }
  cached = {
    ...parsed.data,
    EVOLUTION_API_URL: parsed.data.EVOLUTION_API_URL.replace(/\/$/, ""),
  };
  return cached;
}
