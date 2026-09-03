import { fetchOneLastRouterModels } from "../src/client.js";

const key = process.env.ONELASTROUTER_API_KEY;
if (!key) {
  console.error("Set ONELASTROUTER_API_KEY first, e.g. export ONELASTROUTER_API_KEY=sk-...");
  process.exit(1);
}

try {
  const ids = await fetchOneLastRouterModels(key);
  console.log(`OneLastRouter returned ${ids.length} models:\n`);
  for (const id of ids) console.log(`  ${id}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
