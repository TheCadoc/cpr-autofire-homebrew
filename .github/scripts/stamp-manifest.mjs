// Release step: refuses a tag that does not match module.json, then pins `download` to that tag.
import { readFileSync, writeFileSync } from "node:fs";

const REPO = "https://github.com/TheCadoc/cpr-autofire-homebrew";
const tag = process.env.GITHUB_REF_NAME;
const manifest = JSON.parse(readFileSync("module.json", "utf8"));

if (tag !== `v${manifest.version}`) {
  console.error(
    `Tag ${tag} does not match module.json version ${manifest.version}.`,
  );
  process.exit(1);
}
manifest.download = `${REPO}/releases/download/${tag}/module.zip`;
writeFileSync("module.json", `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Pinned download to ${manifest.download}`);
