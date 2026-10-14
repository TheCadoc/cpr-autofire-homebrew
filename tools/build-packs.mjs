// Compiles each folder in packs/_source/ into a LevelDB pack in packs/. Foundry locks an open pack, so close the world first.
// A compiled pack whose source folder is gone stays on disk; Foundry loads only the packs module.json declares, so delete it by hand.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const PACKS = fileURLToPath(new URL("../packs/", import.meta.url));
const SOURCE = join(PACKS, "_source");

for (const entry of await readdir(SOURCE, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await compilePack(join(SOURCE, entry.name), join(PACKS, entry.name), {
    log: true,
  });
}
