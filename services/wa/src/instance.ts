import { Hono } from "hono";
import { z } from "zod";
import { createInstance, connectInstance, instanceStatus } from "./evolution";
import { hmacMiddleware, parseBody } from "./middleware";

const CreateSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_-]+$/, "lowercase, hífen ou underline"),
});

export const instanceRouter = new Hono();
instanceRouter.use("*", hmacMiddleware);

instanceRouter.post("/instance/create", async (c) => {
  const parsed = CreateSchema.safeParse(parseBody(c));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  try {
    const res = await createInstance(parsed.data.name);
    return c.json({
      instance: res.instance?.instanceName ?? parsed.data.name,
      status: res.instance?.status ?? null,
      qr: res.qrcode?.base64 ?? res.qrcode?.code ?? null,
    });
  } catch {
    return c.json({ error: "evolution failed" }, 502);
  }
});

instanceRouter.get("/instance/:name/status", async (c) => {
  const name = c.req.param("name");
  if (!name) return c.json({ error: "name required" }, 400);
  try {
    const s = await instanceStatus(name);
    return c.json(s);
  } catch {
    return c.json({ error: "evolution failed" }, 502);
  }
});

instanceRouter.post("/instance/:name/connect", async (c) => {
  const name = c.req.param("name");
  if (!name) return c.json({ error: "name required" }, 400);
  try {
    const r = await connectInstance(name);
    return c.json({ qr: r.qr ?? null });
  } catch {
    return c.json({ error: "evolution failed" }, 502);
  }
});
