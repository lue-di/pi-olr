import {
  asString,
  isRecord,
  MODELS_SUFFIX,
  redactSecrets,
  resolveBaseUrl,
  safeError,
} from "./utils.js";
import {
  setCheckedAt,
  setLastEndpoint,
  setLastError,
  setLastModelCount,
  setLastStatus,
} from "./diagnostics.js";

/**
 * Fetch the live model list from OneLastRouter's OpenAI-style `/v1/models` endpoint using
 * the resolved platform token. Returns de-duplicated, non-empty model ids. Throws a clear
 * error (with the server's message when available) on non-2xx responses.
 */
export async function fetchOneLastRouterModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const base = resolveBaseUrl();
  const url = `${base}${MODELS_SUFFIX}`;
  setLastEndpoint(base);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal,
    });
  } catch (error) {
    const msg = safeError(error);
    setLastError(msg);
    throw new Error(`OneLastRouter model list fetch failed: ${msg}`, { cause: error });
  }

  setLastStatus(res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const body = JSON.parse(text) as unknown;
      if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
        message = body.error.message;
      }
    } catch {
      // keep the raw response text as the message
    }
    setLastError(`${res.status} ${message}`);
    throw new Error(
      `OneLastRouter /v1/models returned ${res.status}: ${redactSecrets(message).slice(0, 300)}`,
    );
  }

  const body = (await res.json()) as unknown;
  const ids = extractModelIds(body);
  setLastModelCount(ids.length);
  setCheckedAt(Date.now());
  return ids;
}

/** Accept both the OpenAI shape `{ data: [{ id }] }` and a bare top-level array. */
function extractModelIds(body: unknown): string[] {
  const list: unknown[] = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.data)
      ? body.data
      : [];

  const ids = new Set<string>();
  for (const entry of list) {
    const id =
      isRecord(entry) && typeof entry.id === "string"
        ? entry.id
        : typeof entry === "string"
          ? entry
          : asString(entry);
    if (id) ids.add(id);
  }
  return [...ids];
}
