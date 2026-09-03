import type { Api, Credential, Model, RefreshModelsContext } from "@earendil-works/pi-ai";
import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { fetchOneLastRouterModels } from "../client.js";
import { isUsableCatalog, readCatalogCache, writeCatalogCache } from "./cache.js";
import {
  applyCatalog,
  buildModelConfig,
  FALLBACK_MODELS,
  getCurrentCatalog,
  ONELASTROUTER_API,
  PROVIDER_ID,
} from "./models.js";
import { resolveBaseUrl } from "../utils.js";

/**
 * Load the initial model catalog at extension load time: the last-known-good file cache
 * when present, otherwise the conservative static seed. Pi's own refresh phase replaces
 * this with the live `/v1/models` list once network access is available.
 */
export function loadInitialCatalog(): ProviderModelConfig[] {
  const cached = readCatalogCache();
  if (cached && cached.models.length > 0) {
    applyCatalog(cached.models);
    return cached.models;
  }
  const seed = FALLBACK_MODELS.map((id) => buildModelConfig(id));
  applyCatalog(seed);
  return seed;
}

/**
 * Refresh the OneLastRouter model list in real time from `/v1/models`.
 *
 * - Offline/cache-only init (`allowNetwork === false`) and missing credentials return the
 *   current catalog unchanged.
 * - A failed fetch keeps the last-known-good catalog — a transient failure must never wipe
 *   the selectable model list.
 * - On success, the live list replaces the catalog, is persisted to the file cache, and is
 *   published to Pi's provider store so the next session starts from it.
 */
export async function refreshOneLastRouterModels(
  context: RefreshModelsContext,
): Promise<ProviderModelConfig[]> {
  const current = getCurrentCatalog();
  if (!context.allowNetwork) return current;

  const key = apiKeyFromCredential(context.credential);
  if (!key || context.signal.aborted) return current;

  try {
    const ids = await fetchOneLastRouterModels(key, context.signal);
    const models = ids.map((id) => buildModelConfig(id));
    if (isUsableCatalog({ models })) {
      applyCatalog(models);
      writeCatalogCache(models);
      await context.publish({ persist: { models: toStoredModels(models), checkedAt: Date.now() } });
      return models;
    }
  } catch {
    // Keep last-known-good; a failed refresh must not wipe the catalog.
  }

  return getCurrentCatalog();
}

function apiKeyFromCredential(credential: Credential | undefined): string | undefined {
  if (!credential) return undefined;
  if (credential.type === "api_key") {
    return typeof credential.key === "string" && credential.key ? credential.key : undefined;
  }
  return undefined;
}

/** Add the `Model<Api>`-required fields (api/provider/baseUrl) for Pi's persisted store. */
function toStoredModels(models: ProviderModelConfig[]): Model<Api>[] {
  const baseUrl = resolveBaseUrl();
  return models.map((model) => ({
    ...model,
    api: ONELASTROUTER_API,
    provider: PROVIDER_ID,
    baseUrl,
  }));
}
