import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { fetchOneLastRouterModels } from "./client.js";
import { getLastDiagnostics, setLastError } from "./diagnostics.js";
import { loadInitialCatalog, refreshOneLastRouterModels } from "./models/discovery.js";
import { ONELASTROUTER_API, PROVIDER_ID, PROVIDER_NAME } from "./models/models.js";
import { onelastrouterEnv, redactSecrets, resolveBaseUrl, safeError } from "./utils.js";

/**
 * Pi's interactive `notify` writes into the chat transcript. `console.log` in that mode
 * paints over the TUI, so pick one channel: notify when the UI is available, else console.
 */
function emit(
  ctx: ExtensionCommandContext,
  text: string,
  type: "info" | "warning" | "error" = "info",
): void {
  if (ctx.hasUI) {
    ctx.ui.notify(text, type);
    return;
  }
  if (type === "warning" || type === "error") console.error(text);
  else console.log(text);
}

async function resolveApiKey(ctx: ExtensionCommandContext): Promise<string | undefined> {
  try {
    const key = await ctx.modelRegistry.getApiKeyForProvider(PROVIDER_ID);
    if (key) return key;
  } catch {
    // fall through to the environment
  }
  return onelastrouterEnv("API_KEY");
}

export default function (pi: ExtensionAPI): void {
  pi.registerProvider(PROVIDER_ID, {
    name: PROVIDER_NAME,
    baseUrl: resolveBaseUrl(),
    apiKey: "$ONELASTROUTER_API_KEY",
    authHeader: true,
    api: ONELASTROUTER_API,
    models: loadInitialCatalog(),
    refreshModels: refreshOneLastRouterModels,
  });

  pi.registerCommand("onelastrouter.models", {
    description: "List OneLastRouter models (live fetch from /v1/models)",
    handler: async (_args, ctx) => {
      const key = await resolveApiKey(ctx);
      if (!key) {
        emit(
          ctx,
          'No OneLastRouter API key. Set ONELASTROUTER_API_KEY or add an "onelastrouter" entry to ~/.pi/agent/auth.json.',
          "warning",
        );
        return;
      }
      if (ctx.hasUI) ctx.ui.notify("Fetching OneLastRouter models…", "info");
      try {
        const ids = await fetchOneLastRouterModels(key);
        if (ids.length === 0) {
          emit(ctx, "OneLastRouter returned no models.");
          return;
        }
        const lines = [
          "OneLastRouter available models",
          `endpoint=${resolveBaseUrl()}`,
          `count=${ids.length}`,
          "",
          ...ids,
          "",
          `Select with: /model ${PROVIDER_ID}/<id>`,
        ];
        emit(ctx, lines.join("\n"));
      } catch (error) {
        const msg = safeError(error);
        setLastError(msg);
        emit(ctx, `OneLastRouter models fetch failed: ${redactSecrets(msg)}`, "warning");
      }
    },
  });

  pi.registerCommand("onelastrouter.doctor", {
    description: "Show OneLastRouter provider diagnostics",
    handler: async (_args, ctx) => {
      const d = getLastDiagnostics();
      const lines = [
        `provider=${PROVIDER_ID}`,
        `endpoint=${resolveBaseUrl()}`,
        `lastStatus=${d.status ?? "none"}`,
        `checkedAt=${d.checkedAt ? new Date(d.checkedAt).toISOString() : "none"}`,
        `lastError=${d.error ? redactSecrets(d.error) : "none"}`,
        "transport=native-openai-completions",
        "commands=/onelastrouter.models /onelastrouter.doctor",
      ];
      emit(ctx, `OneLastRouter doctor\n${lines.join("\n")}`);
    },
  });
}
