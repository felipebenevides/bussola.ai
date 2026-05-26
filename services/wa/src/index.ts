import { Hono } from "hono";
import { env } from "./env";
import { log } from "./log";
import { pingEvolution } from "./evolution";
import { webhookRouter } from "./webhook";
import { sendRouter } from "./send";
import { instanceRouter } from "./instance";

env(); // valida configuração no boot — sai com exit 1 se faltar algo

const app = new Hono();

app.get("/", (c) => c.text("bussola-wa"));

app.get("/health", async (c) => {
  const reachable = await pingEvolution();
  return c.json({
    ok: true,
    service: "bussola-wa",
    evolutionReachable: reachable,
    ts: new Date().toISOString(),
  });
});

app.route("/v1", webhookRouter);
app.route("/v1", sendRouter);
app.route("/v1", instanceRouter);

app.onError((err, c) => {
  log.error("unhandled", { err: err.message });
  return c.json({ error: "internal" }, 500);
});

app.notFound((c) => c.json({ error: "not found" }, 404));

const port = env().PORT;
log.info("listening", { port });

export default {
  port,
  fetch: app.fetch,
};
