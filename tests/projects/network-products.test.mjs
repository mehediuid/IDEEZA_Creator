// networkProducts (COR-48): a network's products read their parts from the
// build each one is in — any of the project's builds, not only the newest —
// and keep their `p-<slug(name)>` ids so a saved network still resolves.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildsOf } from "../../.tmp-test/lib/manual/project-read.js";
import { networkProducts } from "../../.tmp-test/lib/network/products.js";
import { DAY, MIN, T, build, companion, dropsOne, legacyHand, part, project, row } from "./fixtures/projects.mjs";

const partNames = (p) => p.parts.map((x) => x.name);

test("networkProducts: a product a later version dropped keeps its own build's parts (COR-48)", () => {
  const refs = buildsOf(dropsOne.project, dropsOne.builds);
  const products = networkProducts(dropsOne.project, refs);
  assert.deepEqual(
    products.map((p) => p.id),
    ["p-rc-car-controller", "p-remote-controller", "p-battery-charger", "p-spare-battery-pack"],
  );
  const charger = products.find((p) => p.id === "p-battery-charger");
  // Only version 1 has it; reading the newest build alone left it with none.
  assert.deepEqual(partNames(charger), ["nRF24L01", "2 x AA holder"]);
  assert.equal(charger.imageUrl, "https://img.test/battery-charger.png");
  // The remote is read from version 2, where it gained a sensor.
  const remote = products.find((p) => p.id === "p-remote-controller");
  assert.ok(partNames(remote).includes("HC-SR04 ultrasonic sensor"));
  assert.equal(remote.senses, true);
});

test("networkProducts: a product from another chat's build gets that build's MCU (COR-48)", () => {
  const car = build({
    id: "b-car",
    chatId: "c-car",
    title: "RC Car",
    projectId: "p-two",
    createdAt: T + DAY,
    parts: [part("ESP32-WROOM-32"), part("L298N motor driver", "Actuator")],
  });
  const remote = build({
    id: "b-remote",
    chatId: "c-remote",
    title: "Remote",
    createdAt: T,
    parts: [part("ATmega328P"), part("nRF24L01+ 2.4 GHz module", "Connectivity")],
  });
  const p = project({
    id: "p-two",
    name: "Two chats",
    createdAt: T,
    builds: [
      { buildId: "b-remote", chatId: "c-remote", version: 1, savedAt: T + 5 * MIN },
      { buildId: "b-car", chatId: "c-car", version: 1, savedAt: T + DAY + 5 * MIN },
    ],
    products: [
      row("prd_car", "RC Car", "", "b-car", "primary", T + DAY),
      row("prd_remote", "Remote", "", "b-remote", "primary", T),
    ],
  });
  const products = networkProducts(p, buildsOf(p, [car, remote]));
  const byId = Object.fromEntries(products.map((x) => [x.id, x]));
  assert.deepEqual(partNames(byId["p-remote"]), ["ATmega328P", "nRF24L01+ 2.4 GHz module"]);
  assert.ok(byId["p-remote"].mcu, "the older chat's product has its MCU detected");
  assert.ok(byId["p-rc-car"].mcu);
});

test("networkProducts: a legacy row (no source) is joined by name across every build", () => {
  const b1 = build({ id: "b-old", chatId: "c-a", title: "Hub", createdAt: T, companions: [companion({ id: "probe", name: "Probe" })] });
  const b2 = build({ id: "b-new", chatId: "c-b", title: "Lamp", createdAt: T + DAY });
  const p = project({
    id: "p-legacy-rows",
    name: "Legacy rows",
    createdAt: T,
    buildId: "b-old",
    products: [
      { id: "p1", name: "Probe", description: "" },
      { id: "p2", name: "Lamp", description: "" },
    ],
  });
  const products = networkProducts(p, buildsOf(p, [b1, { ...b2, projectId: "p-legacy-rows" }]));
  assert.deepEqual(products.map((x) => x.id), ["p-probe", "p-lamp"]);
  assert.deepEqual(partNames(products[0]), ["nRF24L01", "2 x AA holder"]);
  assert.deepEqual(partNames(products[1]), ["ESP32-WROOM-32", "L298N motor driver"]);
});

test("networkProducts: a project with no list reads the newest build; a hand-made one has names only", () => {
  const b = build({ id: "b-solo", chatId: "c-solo", title: "Solo", createdAt: T, companions: [companion({ id: "pad", name: "Pad" })] });
  const noList = project({ id: "p-nolist", name: "No list", createdAt: T, buildId: "b-solo" });
  assert.deepEqual(
    networkProducts(noList, buildsOf(noList, [b])).map((x) => [x.id, x.parts.length]),
    [["p-solo", 2], ["p-pad", 2]],
  );
  const hand = networkProducts(legacyHand.project, buildsOf(legacyHand.project, legacyHand.builds));
  assert.deepEqual(hand.map((x) => [x.id, x.parts.length, x.mcu]), [["p-desk-lamp", 0, null]]);
});
