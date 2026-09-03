import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { isRecord } from "../utils.js";

export const CATALOG_CACHE_VERSION = 1;

export interface CachedCatalog {
  version: typeof CATALOG_CACHE_VERSION;
  checkedAt: number;
  models: ProviderModelConfig[];
}

let cachePathOverride: string | undefined;

export function setCatalogCachePathForTests(path: string | undefined): void {
  cachePathOverride = path;
}

export function getCatalogCachePath(): string {
  return cachePathOverride ?? join(homedir(), ".pi", "agent", "onelastrouter-model-catalog.json");
}

/** Last-known-good catalog, read at cold start before the first network refresh. */
export function readCatalogCache(path = getCatalogCachePath()): CachedCatalog | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!isCachedCatalog(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Replace-on-success only: never write an empty list over a known-good catalog. */
export function writeCatalogCache(
  models: ProviderModelConfig[],
  path = getCatalogCachePath(),
): CachedCatalog | undefined {
  if (models.length === 0) return undefined;
  const entry: CachedCatalog = {
    version: CATALOG_CACHE_VERSION,
    checkedAt: Date.now(),
    models,
  };
  const json = `${JSON.stringify(entry, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, json, "utf8");
  try {
    renameSync(tmp, path);
  } catch {
    writeFileSync(path, json, "utf8");
    try {
      unlinkSync(tmp);
    } catch {
      // ignore leftover temp file
    }
  }
  return entry;
}

export function isUsableCatalog(
  catalog: { models: unknown } | undefined,
): catalog is { models: ProviderModelConfig[] } {
  return Boolean(catalog && Array.isArray(catalog.models) && catalog.models.length > 0);
}

function isCachedCatalog(value: unknown): value is CachedCatalog {
  if (!isRecord(value) || value.version !== CATALOG_CACHE_VERSION) return false;
  if (!Array.isArray(value.models) || value.models.length === 0) return false;
  return value.models.every(isProviderModelConfig);
}

function isProviderModelConfig(value: unknown): value is ProviderModelConfig {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.reasoning === "boolean"
  );
}
