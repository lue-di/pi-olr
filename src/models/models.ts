import type { Api } from "@earendil-works/pi-ai";
import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { humanizeModelName } from "../utils.js";

export const PROVIDER_ID = "onelastrouter";
export const PROVIDER_NAME = "OneLastRouter";

/** Reuse Pi's built-in OpenAI Chat Completions streamer — no custom stream function. */
export const ONELASTROUTER_API = "openai-completions" as const satisfies Api;

export const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/**
 * Conservative cold-start seed. OneLastRouter's real catalog is account-dependent,
 * so these entries are only a placeholder until the first successful refresh replaces
 * them with the live `/v1/models` list. None of them is guaranteed to exist on your relay.
 */
export const FALLBACK_MODELS: string[] = ["claude-3-5-sonnet-20241022", "gpt-4o", "deepseek-chat"];

interface FamilyMeta {
  contextWindow: number;
  maxTokens: number;
  input: ("text" | "image")[];
}

/**
 * Best-effort context-window / modality hints by model id prefix. The OpenAI `/v1/models`
 * endpoint does not advertise context window, max output tokens, or modality, so these are
 * conservative family-based guesses — chosen to avoid over-requesting max_tokens on models
 * with smaller limits. Unknown families default to image-capable (relays commonly serve
 * multimodal models); adjust here if you need tighter control.
 */
function familyMeta(id: string): FamilyMeta {
  const l = id.toLowerCase();
  if (l.startsWith("claude-"))
    return { contextWindow: 200_000, maxTokens: 8192, input: ["text", "image"] };
  if (
    l.startsWith("gpt-4o") ||
    l.startsWith("gpt-4.1") ||
    l.startsWith("gpt-4.5") ||
    l.startsWith("gpt-5") ||
    l.startsWith("gpt-4-turbo") ||
    l.startsWith("gpt-4-vision")
  )
    return { contextWindow: 128_000, maxTokens: 16_384, input: ["text", "image"] };
  if (l.startsWith("gpt-4"))
    return { contextWindow: 128_000, maxTokens: 8192, input: ["text", "image"] };
  if (l.startsWith("gpt-3.5")) return { contextWindow: 16_385, maxTokens: 4096, input: ["text"] };
  if (l.startsWith("o1") || l.startsWith("o3") || l.startsWith("o4"))
    return { contextWindow: 200_000, maxTokens: 32_768, input: ["text", "image"] };
  if (l.startsWith("gemini-"))
    return { contextWindow: 1_048_576, maxTokens: 8192, input: ["text", "image"] };
  if (l.startsWith("deepseek")) return { contextWindow: 65_536, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("qwen")) return { contextWindow: 32_768, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("glm-4"))
    return { contextWindow: 128_000, maxTokens: 8192, input: ["text", "image"] };
  if (l.startsWith("glm")) return { contextWindow: 128_000, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("llama")) return { contextWindow: 128_000, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("mistral") || l.startsWith("mixtral"))
    return { contextWindow: 32_000, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("gemma")) return { contextWindow: 8192, maxTokens: 8192, input: ["text"] };
  if (l.startsWith("command")) return { contextWindow: 128_000, maxTokens: 8192, input: ["text"] };
  return { contextWindow: 128_000, maxTokens: 8192, input: ["text", "image"] };
}

/**
 * Build a Pi model entry from a OneLastRouter model id.
 *
 * `reasoning` is false for every model: the `/v1/models` endpoint does not advertise
 * thinking support, and reasoning controls over an OpenAI-compatible relay are not wired
 * here. Models are still fully callable for standard chat. Pricing is unknown on a relay,
 * so cost is zeroed.
 */
export function buildModelConfig(id: string): ProviderModelConfig {
  const meta = familyMeta(id);
  return {
    id,
    name: `${humanizeModelName(id)} (OneLastRouter)`,
    reasoning: false,
    input: meta.input,
    cost: ZERO_COST,
    contextWindow: meta.contextWindow,
    maxTokens: meta.maxTokens,
  };
}

let currentModels: ProviderModelConfig[] = [];

export function getCurrentCatalog(): ProviderModelConfig[] {
  return currentModels;
}

export function applyCatalog(models: ProviderModelConfig[]): void {
  currentModels = models;
}
