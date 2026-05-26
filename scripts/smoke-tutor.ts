/**
 * Smoke test do tutor — satisfaz as 5 perguntas-piloto de tasks/ai.md.
 *
 * Pré-requisitos:
 *   1. `npm run dev` (Next.js em http://localhost:3000)
 *   2. OpenAI key configurada em /admin
 *   3. Ingestão sample já rodada (POST /api/admin/ingest-sample)
 *
 * Como rodar:
 *   node --experimental-strip-types scripts/smoke-tutor.ts
 *   # ou
 *   bun run scripts/smoke-tutor.ts
 *
 * Variáveis opcionais:
 *   BUSSOLA_URL  — default http://localhost:3000
 */

interface Citation {
  courseId: number;
  lessonId: number;
  courseTitle: string;
  lessonTitle: string;
  startSeconds: number;
  endSeconds: number;
  similarity: number;
  deepLink: string;
}

interface TutorResponse {
  text: string;
  citations: Citation[];
  suggestedCourses: Array<{ courseId: number; title: string; url: string }>;
  groundedInCefis: boolean;
}

interface Probe {
  question: string;
  expect: "grounded" | "fallback";
  description: string;
}

const PROBES: Probe[] = [
  {
    question: "qual a melhor abertura numa negociação difícil?",
    expect: "grounded",
    description: "abertura difícil — espera-se citação com mm:ss",
  },
  {
    question: "o que é BATNA?",
    expect: "grounded",
    description: "BATNA — espera-se citação com mm:ss",
  },
  {
    question: "como negociar honorários sem perder o cliente?",
    expect: "grounded",
    description: "honorários — espera-se citação com mm:ss",
  },
  {
    question: "diferença entre posição e interesse",
    expect: "grounded",
    description: "posição vs interesse — espera-se citação com mm:ss",
  },
  {
    question: "como fazer pão",
    expect: "fallback",
    description: "fora do escopo — espera-se fallback groundedInCefis=false",
  },
];

const BASE = (process.env.BUSSOLA_URL ?? "http://localhost:3000").replace(/\/$/, "");

interface ProbeResult {
  q: string;
  ok: boolean;
  expect: Probe["expect"];
  got: { grounded: boolean; citations: number; firstCitation?: string };
  preview: string;
  notes: string[];
}

async function run() {
  console.log(`[smoke-tutor] BASE=${BASE}`);
  console.log(`[smoke-tutor] rodando ${PROBES.length} perguntas…\n`);

  const results: ProbeResult[] = [];
  for (const probe of PROBES) {
    const res = await ask(probe.question);
    const r = evaluate(probe, res);
    results.push(r);
    printResult(probe, r);
  }

  const groundedProbes = PROBES.filter((p) => p.expect === "grounded");
  const groundedResults = results.filter((_, i) => PROBES[i]!.expect === "grounded");
  const groundedWithMmss = groundedResults.filter((r) =>
    r.got.firstCitation ? /\b\d+:\d{2}\b/.test(r.got.firstCitation) : false
  ).length;
  const fallbackOk = results
    .filter((_, i) => PROBES[i]!.expect === "fallback")
    .every((r) => r.ok);

  console.log("\n────────────────────────────────");
  console.log(`Grounded (negociação): ${groundedResults.filter((r) => r.ok).length}/${groundedProbes.length} com citação`);
  console.log(`Grounded com mm:ss no texto: ${groundedWithMmss}/${groundedProbes.length}`);
  console.log(`Fallback ("fazer pão"): ${fallbackOk ? "OK" : "FALHOU"}`);

  const pass =
    groundedResults.filter((r) => r.ok).length >= 3 && // ai.md: ≥ 3 das 4
    fallbackOk;
  console.log(pass ? "\n✅ smoke PASSOU (critérios mínimos de ai.md atendidos)" : "\n❌ smoke FALHOU");
  process.exit(pass ? 0 : 1);
}

async function ask(message: string): Promise<TutorResponse | { error: string }> {
  try {
    const res = await fetch(`${BASE}/api/tutor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    return (await res.json()) as TutorResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function evaluate(probe: Probe, res: TutorResponse | { error: string }): ProbeResult {
  const notes: string[] = [];
  if ("error" in res) {
    return {
      q: probe.question,
      ok: false,
      expect: probe.expect,
      got: { grounded: false, citations: 0 },
      preview: `(erro: ${res.error})`,
      notes: [res.error],
    };
  }

  const firstCite = res.citations[0];
  const got = {
    grounded: res.groundedInCefis,
    citations: res.citations.length,
    ...(firstCite && {
      firstCitation: `${firstCite.lessonTitle} @ ${formatSec(firstCite.startSeconds)}`,
    }),
  };
  const preview = res.text.length > 160 ? res.text.slice(0, 160) + "…" : res.text;

  if (probe.expect === "grounded") {
    if (!res.groundedInCefis) notes.push("grounded=false (esperava true)");
    if (res.citations.length === 0) notes.push("zero citações");
    else {
      if (firstCite!.startSeconds <= 0) notes.push("start_seconds=0 (sem deep-link útil)");
      if (!firstCite!.deepLink.startsWith("http")) notes.push("deep_link inválido");
      if (!/\b\d+:\d{2}\b/.test(res.text)) notes.push("resposta não cita mm:ss no texto");
    }
    const ok = res.groundedInCefis && res.citations.length > 0 && firstCite!.startSeconds > 0;
    return { q: probe.question, ok, expect: probe.expect, got, preview, notes };
  }

  // fallback
  if (res.groundedInCefis) notes.push("grounded=true (esperava false)");
  const ok = !res.groundedInCefis;
  return { q: probe.question, ok, expect: probe.expect, got, preview, notes };
}

function formatSec(s: number): string {
  if (!s || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function printResult(probe: Probe, r: ProbeResult) {
  const mark = r.ok ? "✓" : "✗";
  console.log(`${mark} [${probe.expect}] "${probe.question}"`);
  console.log(`    grounded=${r.got.grounded} citações=${r.got.citations}${r.got.firstCitation ? ` first="${r.got.firstCitation}"` : ""}`);
  console.log(`    resposta: ${r.preview}`);
  if (r.notes.length) console.log(`    notas: ${r.notes.join("; ")}`);
  console.log();
}

run().catch((err) => {
  console.error("[smoke-tutor] crash:", err);
  process.exit(2);
});
