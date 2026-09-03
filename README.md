# pi-onelastrouter

[![license](https://img.shields.io/npm/l/pi-onelastrouter)](LICENSE)

**pi-onelastrouter** is a [Pi Coding Agent](https://pi.dev) provider that talks to an
[OneLastRouter](https://onelastrouter.org) relay — an OpenAI-compatible API gateway. Set your
platform token, pick a model, and go. The model list is fetched **live** from
`GET https://api.onelastrouter.org/v1/models`, so newly enabled models appear without an
extension release. Chat calls are routed through OneLastRouter using Pi's built-in OpenAI
Chat Completions streamer — no custom transport, no shell-out.

> **Unofficial integration.** This project is not affiliated with or endorsed by OneLastRouter.
> Use it only with an account and services you are authorized to access.

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Commands](#commands)
- [Models](#models)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Requirements

- Pi Coding Agent and Pi AI version **0.80.0 or later**
- An OneLastRouter platform token (API key) for an account you can access

## Install

Install from the repository:

```bash
pi install git:github.com/lue-di/pi-olr
```

Restart Pi (or run `/reload`) after installation. To update later, run
`pi update git:github.com/lue-di/pi-olr`.

## Quick start

1. Export your OneLastRouter platform token:

   ```bash
   export ONELASTROUTER_API_KEY=sk-...
   ```

2. Restart Pi (so it picks up the environment variable), then list your live models:

   ```text
   /onelastrouter.models
   ```

3. Select a model from that list:

   ```text
   /model onelastrouter/<model-id>
   ```

4. Start working. If a request fails, run `/onelastrouter.doctor` for sanitized diagnostics.

## Authentication

This provider authenticates with a plain API key, sent as `Authorization: Bearer <key>` on
every request. Set it as an environment variable before launching Pi:

```bash
export ONELASTROUTER_API_KEY=sk-...
```

Pi resolves `$ONELASTROUTER_API_KEY` per request. Alternatively, add the key to Pi's auth
store at `~/.pi/agent/auth.json` (mode `0600`):

```json
{
  "onelastrouter": { "type": "api_key", "key": "sk-..." }
}
```

The auth file contains a sensitive token: **do not commit it, paste it into issues, or
share its contents.**

## Commands

| Command                     | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `/model onelastrouter/<id>` | Select an OneLastRouter model (use an id from `/onelastrouter.models`). |
| `/onelastrouter.models`     | Live-fetch and list the models your token can access.                   |
| `/onelastrouter.doctor`     | Show sanitized provider diagnostics (endpoint, last status, error).     |

## Models

At startup the provider loads a last-known-good catalog from
`~/.pi/agent/onelastrouter-model-catalog.json` (or a small conservative seed on first run).
Pi's refresh phase then calls `GET https://api.onelastrouter.org/v1/models` with your token
and replaces the catalog with the live list. The result is cached back to disk and published
to Pi's provider store, so the next session starts from it.

A failed refresh **never wipes** the catalog — the last-known-good list is kept until the
next successful fetch.

### Notes on model metadata

The OpenAI `/v1/models` endpoint only returns model ids — it does not advertise context
window, max output tokens, or modality. This extension derives conservative defaults from
the model id prefix (e.g. `claude-*`, `gpt-4o*`, `gemini-*`, `deepseek-*`) and zeroes cost
(relay pricing is not exposed). `reasoning` is `false` for every model, so thinking-level
controls are not surfaced; models remain fully callable for standard chat. Adjust
`familyMeta` in `src/models/models.ts` if you need tighter per-family values.

## Configuration

All environment variables use the `ONELASTROUTER_` prefix.

| Variable                 | Purpose                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `ONELASTROUTER_API_KEY`  | Required. Your OneLastRouter platform token.                                                               |
| `ONELASTROUTER_BASE_URL` | Override the API base URL (default `https://api.onelastrouter.org/v1`). Must be HTTPS, no URL credentials. |

`ONELASTROUTER_BASE_URL` must be set before Pi launches and should include the `/v1`
segment (e.g. `https://relay.example.com/v1`), matching Pi's OpenAI base-URL convention.

## Troubleshooting

- **No models / 401 / `Missing platform token`:** Set `ONELASTROUTER_API_KEY` to a valid
  OneLastRouter token, restart Pi, then run `/onelastrouter.doctor`.
- **`Invalid or disabled platform token`:** The token was rejected. Regenerate it in
  OneLastRouter and re-export.
- **Catalog did not refresh:** `/onelastrouter.doctor` shows the last status and error. A
  failed refresh keeps the last-known-good models; a later successful fetch replaces them.
- **Model returns an error when called:** Confirm the id you selected with `/model` appears
  in `/onelastrouter.models`. Relays may 404 on ids they no longer serve.
- **Need a safe diagnostic:** `/onelastrouter.doctor` redacts recognized secrets from its
  output. Review before sharing publicly.

## Development

The published extension runs on Node (Pi's CLI) and has no runtime dependencies. Install with
your preferred package manager:

```bash
npm install
npm run check          # typecheck + lint + format check
npm test               # pure model-id → config mapping check (no network)
ONELASTROUTER_API_KEY=sk-... npm run probe   # live /v1/models fetch + parser check
```

[Bun](https://bun.sh) works too (`bun install`, `bun run check`, `bun scripts/probe.ts`).

The package declares its Pi extension in `package.json` under `pi.extensions`. See the
[Pi package documentation](https://pi.dev/docs/latest/packages) for package installation,
manifest, and gallery conventions.

## License

[MIT](LICENSE)
