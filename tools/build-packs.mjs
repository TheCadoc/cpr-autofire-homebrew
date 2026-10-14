// Compiles each folder in packs/_source/ into a LevelDB pack in packs/. Foundry locks an open pack, so close the world first.
import { readdir } from "node:fs/promises";
import { compilePack } from "@foundryvtt/foundryvtt-cli";

const SOURCE = "packs/_source";

for (const entry of await readdir(SOURCE, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  await compilePack(`${SOURCE}/${entry.name}`, `packs/${entry.name}`, {
    log: true,
  });
}
