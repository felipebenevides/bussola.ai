import { Hono } from "hono";
import { z } from "zod";
import { createGroup } from "./evolution";
import { env } from "./env";
import { hmacMiddleware, parseBody } from "./middleware";
import { log } from "./log";

const CreateSchema = z.object({
  subject: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  participants: z.array(z.string().min(10).max(20)).min(1).max(5),
});

export const groupRouter = new Hono();
groupRouter.use("*", hmacMiddleware);

groupRouter.post("/group/create", async (c) => {
  const parsed = CreateSchema.safeParse(parseBody(c));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  try {
    const res = await createGroup({
      instanceName: env().EVOLUTION_INSTANCE,
      subject: parsed.data.subject,
      description: parsed.data.description,
      participants: parsed.data.participants,
    });
    const jid = res.groupJid ?? res.id ?? null;
    if (!jid) {
      log.warn("group.noJidReturned", { subject: parsed.data.subject });
      return c.json({ error: "evolution returned no jid" }, 502);
    }
    return c.json({
      jid,
      subject: parsed.data.subject,
      participants: res.participants ?? [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("group.create.failed", { msg });
    return c.json({ error: msg }, 502);
  }
});
