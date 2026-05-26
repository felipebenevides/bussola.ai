// Parser WebVTT minimalista para as transcrições da CEFIS.
// Foco: extrair timestamps + texto, agrupar em chunks compatíveis com embeddings.

export interface VttCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface VttChunk {
  text: string;
  startSeconds: number;
  endSeconds: number;
  cueCount: number;
}

/**
 * Converte "HH:MM:SS.mmm" → segundos (float).
 */
function parseTimestamp(ts: string): number {
  const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/);
  if (!m) throw new Error(`Timestamp inválido: ${ts}`);
  const [, hh, mm, ss, ms] = m;
  return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss) + parseInt(ms) / 1000;
}

const TIMING_LINE = /^(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/;

/**
 * Parseia o conteúdo de um arquivo .vtt e retorna a lista de cues.
 */
export function parseVtt(content: string): VttCue[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const cues: VttCue[] = [];

  let i = 0;
  // Pula header "WEBVTT" e qualquer metadado inicial até a primeira linha em branco
  if (lines[0]?.startsWith("WEBVTT")) i = 1;

  while (i < lines.length) {
    // Pula linhas em branco
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i >= lines.length) break;

    // Próxima linha pode ser cue identifier (numérico/string) OU já a linha de timing
    let timingLine = lines[i];
    let match = timingLine.match(TIMING_LINE);
    if (!match && i + 1 < lines.length) {
      // tinha um identificador antes; o timing vem na próxima
      i++;
      timingLine = lines[i];
      match = timingLine.match(TIMING_LINE);
    }
    if (!match) {
      i++;
      continue;
    }

    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);
    i++;

    // Coleta linhas de texto até próxima linha em branco
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }

    let text = textLines.join(" ").trim();
    // Remove "- " no início (padrão do VTT do CEFIS marca de fala)
    text = text.replace(/^-\s+/, "").replace(/\s+/g, " ").trim();
    if (text) {
      cues.push({ startSeconds: start, endSeconds: end, text });
    }
  }

  return cues;
}

/**
 * Agrupa cues consecutivos em chunks de até ~targetChars caracteres.
 * Preserva start/end seconds para deep-link no player.
 *
 * Estratégia: greedy — adiciona cues até passar o target; quebra em sentença
 * próxima quando possível.
 */
export function chunkCues(
  cues: VttCue[],
  opts: { targetChars?: number; maxChars?: number } = {}
): VttChunk[] {
  const target = opts.targetChars ?? 800;
  const max = opts.maxChars ?? 1200;
  const chunks: VttChunk[] = [];

  let buffer: VttCue[] = [];
  let bufferLen = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      text: buffer.map((c) => c.text).join(" "),
      startSeconds: Math.floor(buffer[0].startSeconds),
      endSeconds: Math.ceil(buffer[buffer.length - 1].endSeconds),
      cueCount: buffer.length,
    });
    buffer = [];
    bufferLen = 0;
  };

  for (const cue of cues) {
    const next = bufferLen + cue.text.length + 1;
    if (bufferLen > 0 && next > max) {
      flush();
    }
    buffer.push(cue);
    bufferLen += cue.text.length + 1;

    // Se passou o target E o cue termina em pontuação forte, quebra aqui
    if (bufferLen >= target && /[.!?]$/.test(cue.text.trim())) {
      flush();
    }
  }
  flush();
  return chunks;
}

/**
 * Combina parse + chunk em uma só chamada.
 */
export function parseAndChunk(content: string, opts?: { targetChars?: number; maxChars?: number }) {
  const cues = parseVtt(content);
  const chunks = chunkCues(cues, opts);
  return { cues, chunks };
}
