import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const SOURCE = new URL("../packs/_source/", import.meta.url);

/** Every pack source entry, as [pack folder, file name, document]. */
const entries = readdirSync(SOURCE, { withFileTypes: true })
  .filter((dir) => dir.isDirectory())
  .flatMap((dir) =>
    readdirSync(new URL(`${dir.name}/`, SOURCE))
      .filter((file) => file.endsWith(".json"))
      .map((file) => [
        dir.name,
        file,
        JSON.parse(
          readFileSync(new URL(`${dir.name}/${file}`, SOURCE), "utf8"),
        ),
      ]),
  );

test("every pack entry has a Foundry id and the LevelDB key compilePack needs", () => {
  assert.ok(entries.length > 0);
  const ids = new Set();
  for (const [, file, doc] of entries) {
    assert.match(doc._id, /^[a-zA-Z0-9]{16}$/, file);
    assert.equal(doc._key, `!items!${doc._id}`, file);
    assert.ok(!ids.has(doc._id), `${file}: duplicate _id`);
    ids.add(doc._id);
  }
});

test("the Adjustable Gas Piston is a flagged, slotless weapon upgrade", () => {
  const pistons = entries.filter(
    ([, , doc]) => doc.flags?.["cpr-autofire-homebrew"]?.gasPiston === true,
  );
  assert.equal(pistons.length, 1);
  const [[pack, , piston]] = pistons;
  assert.equal(pack, "autofire-homebrew-items");
  assert.equal(piston.type, "itemUpgrade");
  assert.equal(piston.system.type, "weapon");
  assert.equal(piston.system.size, 0);
  assert.equal(piston.system.price.market, 1000);
  assert.equal(piston.flags["cyberpunk-red-core"]._migration.current, 38);
  assert.match(piston.system.description.value, /u\/Infernox-Ratchet/);
});
