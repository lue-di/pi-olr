/** Base URL for the OneLastRouter OpenAI-compatible API. Override with ONELASTROUTER_BASE_URL. */
export const DEFAULT_BASE_URL = "https://api.onelastrouter.org/v1";

/** Suffix appended to the resolved base URL to reach the OpenAI-style model list. */
export const MODELS_SUFFIX = "/models";

/** Read an ONELASTROUTER_* environment variable (empty string treated as unset). */
export function onelastrouterEnv(name: string): string | undefined {
  const value = process.env[`ONELASTROUTER_${name}`];
  return typeof value === "string" && value ? value : undefined;
}

/**
 * Resolve the API base URL. Defaults to OneLastRouter's hosted endpoint; an
 * ONELASTROUTER_BASE_URL override is accepted only when it is https and carries no URL
 * credentials, otherwise the default is kept (the override is visible in /doctor output).
 */
export function resolveBaseUrl(): string {
  const override = onelastrouterEnv("BASE_URL");
  if (!override) return DEFAULT_BASE_URL;
  try {
    const url = new URL(override);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("must be https without URL credentials");
    }
    return override.replace(/\/+$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Best-effort redaction of bearer tokens and api keys for safe diagnostic output. */
export function redactSecrets(text: string): string {
  return text
    .replace(/(Bearer\s+)[^\s]+/gi, "$1***")
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***")
    .replace(/("key"\s*:\s*")[^"]*/gi, "$1***");
}

/** Turn a model id like "claude-3-5-sonnet-20241022" into "Claude 3.5 Sonnet 20241022". */
export function humanizeModelName(id: string): string {
  const tokens = id.split("-");
  const words: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (!token) continue;
    const next = tokens[i + 1];
    if (token === "gpt" && next === "oss") {
      words.push("GPT-OSS");
      i++;
      continue;
    }
    const lower = token.toLowerCase();
    if (lower === "gpt") {
      words.push("GPT");
      continue;
    }
    if (lower === "glm") {
      words.push("GLM");
      continue;
    }
    if (lower === "deepseek") {
      words.push("DeepSeek");
      continue;
    }
    if (lower === "oss") {
      words.push("OSS");
      continue;
    }
    if (/^\d+$/.test(token) && next && /^\d+$/.test(next)) {
      words.push(`${token}.${next}`);
      i++;
      continue;
    }
    if (/^\d/.test(token)) {
      words.push(token.toUpperCase());
      continue;
    }
    words.push(token.charAt(0).toUpperCase() + token.slice(1));
  }
  return words.join(" ") || id;
}
