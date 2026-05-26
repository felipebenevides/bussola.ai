import { log } from "./log";

/**
 * Fila FIFO em memória para envios outbound (Bun → Evolution).
 *
 * Por que existe:
 * 1. Garantir ordem: se o Next.js dispara várias respostas em paralelo, o
 *    usuário recebe na sequência correta de chegada na fila.
 * 2. Cadência humana: aplica um delay mínimo (DELAY_MS) entre o momento
 *    em que a mensagem foi enfileirada e o envio efetivo — evita o bot
 *    responder em <1s e dar sensação robótica.
 *
 * Persistência: zero. Reinício do processo perde a fila. Aceitável porque
 * o Next.js já tem retry no relay e o pior caso é mensagem perdida em
 * crash/redeploy raro.
 */

const DELAY_MS = 10_000;

interface Job {
  exec: () => Promise<string | null>;
  enqueuedAt: number;
  label: string;
}

const queue: Job[] = [];
let workerRunning = false;

export function enqueueOutbound(label: string, exec: () => Promise<string | null>): void {
  queue.push({ exec, enqueuedAt: Date.now(), label });
  log.info("queue.enqueued", { label, size: queue.length });
  if (!workerRunning) void runWorker();
}

async function runWorker() {
  workerRunning = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      const waited = Date.now() - job.enqueuedAt;
      const remaining = DELAY_MS - waited;
      if (remaining > 0) await sleep(remaining);
      try {
        await job.exec();
        log.info("queue.sent", { label: job.label, queue: queue.length });
      } catch (err) {
        log.error("queue.exec.failed", {
          label: job.label,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    workerRunning = false;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function queueSize(): number {
  return queue.length;
}
