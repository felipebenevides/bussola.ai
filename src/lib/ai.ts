import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import OpenAI from "openai";
import { getSettings } from "./settings";

export async function getOpenAIProvider() {
  const settings = await getSettings();
  if (!settings.openai_api_key) {
    throw new Error(
      "OpenAI API key não configurada. Configure em /admin antes de usar IA."
    );
  }
  return createOpenAI({ apiKey: settings.openai_api_key });
}

export async function getChatModel() {
  const settings = await getSettings();
  const provider = await getOpenAIProvider();
  return provider(settings.chat_model);
}

export async function getOpenAIRaw() {
  const settings = await getSettings();
  if (!settings.openai_api_key) {
    throw new Error("OpenAI API key não configurada.");
  }
  return new OpenAI({ apiKey: settings.openai_api_key });
}

export async function embed(input: string | string[]): Promise<number[][]> {
  const settings = await getSettings();
  const oai = await getOpenAIRaw();
  const inputs = Array.isArray(input) ? input : [input];
  const res = await oai.embeddings.create({
    model: settings.embedding_model,
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}
