import { buildModelConfig } from "../src/models/models.js";
import { humanizeModelName } from "../src/utils.js";

const ids = [
  "claude-3-5-sonnet-20241022",
  "claude-opus-4-20250514",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "gemini-2.5-flash",
  "deepseek-chat",
  "deepseek-reasoner",
  "qwen-max",
  "glm-4-plus",
  "llama-3.1-70b",
  "some-unknown-future-model",
];

let ok = true;
for (const id of ids) {
  const m = buildModelConfig(id);
  const valid =
    m.id === id &&
    m.name.endsWith("(OneLastRouter)") &&
    typeof m.contextWindow === "number" &&
    typeof m.maxTokens === "number" &&
    Array.isArray(m.input) &&
    m.input.length > 0 &&
    m.reasoning === false &&
    m.cost.input === 0;
  if (!valid) ok = false;
  console.log(
    `${id.padEnd(30)} → name=${m.name.padEnd(38)} ctx=${m.contextWindow} maxOut=${m.maxTokens} input=${m.input.join("/")}`,
  );
}

console.log(
  `\nhumanizeModelName("claude-3-5-sonnet-20241022") = ${humanizeModelName("claude-3-5-sonnet-20241022")}`,
);
console.log(`humanizeModelName("gpt-4o") = ${humanizeModelName("gpt-4o")}`);

console.log(`\n${ok ? "OK — all model configs valid" : "FAIL — some config invalid"}`);
process.exit(ok ? 0 : 1);
