// SAVE / TABS — describe.ts: the description's join sentence, the "Update
// with AI" prompt and its trigger, and the coachmark's rule (P2-SAVE-4,
// P2-SAVE-8, P2-TABS-21 as changed, P2-TABS-22). The save step's prefill and
// /api/refine's "project" fallback both run joinDescriptions, so they are
// tested as one here.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DESCRIBE_MAX,
  coachmarkDueOf,
  describableCount,
  describePromptOf,
  joinDescriptions,
} from "../../.tmp-test/lib/manual/describe.js";
import { PROJECT_DESC_MAX } from "../../.tmp-test/lib/manual/projects.js";
import { describedProductsOf, saveDefaultsOf } from "../../.tmp-test/lib/manual/save-step.js";
import { T, build, companion } from "./fixtures/projects.mjs";

const car = { name: "RC Car", description: "A two-motor RC car with an ESP32 brain." };
const remote = { name: "Remote Controller", description: "A handheld 2.4 GHz remote." };
const charger = { name: "Battery Charger", description: "A USB charger for the pack." };
const pack = { name: "Spare Battery Pack", description: "" };

describe("joinDescriptions", () => {
  it("the first sentence, then 'Comes with' and every other name", () => {
    assert.equal(
      joinDescriptions([car, remote, charger, pack]),
      "A two-motor RC car with an ESP32 brain. Comes with Remote Controller, Battery Charger and Spare Battery Pack.",
    );
  });

  it("two products read 'A and B'; one product is its own sentence", () => {
    assert.equal(
      joinDescriptions([car, remote]),
      "A two-motor RC car with an ESP32 brain. Comes with Remote Controller.",
    );
    assert.equal(joinDescriptions([car]), car.description);
  });

  it("leads with the first product that has a sentence, and stops an unstopped one", () => {
    assert.equal(
      joinDescriptions([{ name: "Lamp", description: "" }, { name: "Base", description: "A weighted base" }]),
      "A weighted base. Comes with Lamp.",
    );
  });

  it("with no sentence at all it is only the names", () => {
    assert.equal(
      joinDescriptions([{ name: "A", description: "" }, { name: "B", description: "" }]),
      "Comes with B.",
    );
    assert.equal(joinDescriptions([]), "");
  });

  it("clips to 1,000 characters, counted as a person counts them", () => {
    const long = { name: "X", description: "🙂".repeat(1200) };
    const out = joinDescriptions([long, remote]);
    assert.equal(Array.from(out).length, 1000);
  });

  it("DESCRIBE_MAX is PROJECT_DESC_MAX", () => {
    assert.equal(DESCRIBE_MAX, PROJECT_DESC_MAX);
  });
});

describe("the save step's prefill is the same join", () => {
  it("saveDefaultsOf on a 4-product build equals joinDescriptions on its products", () => {
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "RC Car",
      description: "A two-motor RC car with an ESP32 brain.",
      createdAt: T,
      companions: [
        companion({ id: "remote", name: "Remote Controller", description: "A remote." }),
        companion({ id: "charger", name: "Battery Charger" }),
        companion({ id: "pack", name: "Spare Battery Pack" }),
      ],
    });
    const d = saveDefaultsOf(job);
    assert.equal(
      d.description,
      "A two-motor RC car with an ESP32 brain. Comes with Remote Controller, Battery Charger and Spare Battery Pack.",
    );
    // The AI's input: the primary's sentence (the maker's words when the
    // model wrote none) and each companion's own.
    assert.deepEqual(describedProductsOf(job), [
      { name: "RC Car", description: "A two-motor RC car with an ESP32 brain." },
      { name: "Remote Controller", description: "A remote." },
      { name: "Battery Charger", description: "" },
      { name: "Spare Battery Pack", description: "" },
    ]);
  });
});

describe("describePromptOf", () => {
  it("one '{name}: {description}' line per product, whitespace folded", () => {
    assert.equal(
      describePromptOf([car, { name: "Remote Controller", description: "A handheld\n  remote." }, pack]),
      "RC Car: A two-motor RC car with an ESP32 brain.\nRemote Controller: A handheld remote.\nSpare Battery Pack",
    );
  });
});

describe("describableCount (Update with AI shows at two)", () => {
  it("counts products with a description", () => {
    assert.equal(describableCount([car, remote, pack]), 2);
    assert.equal(describableCount([car, pack]), 1);
    assert.equal(describableCount([{ name: "A", description: "   " }]), 0);
  });
});

describe("coachmarkDueOf (P2-TABS-22)", () => {
  it("due on 3 described products never dismissed", () => {
    assert.equal(coachmarkDueOf([car, remote, charger], undefined), true);
  });
  it("not due on one product, or with fewer than two described", () => {
    assert.equal(coachmarkDueOf([car], undefined), false);
    assert.equal(coachmarkDueOf([car, pack], undefined), false);
  });
  it("Not now hides it until the product count grows past the one recorded", () => {
    const hint = { dismissedAt: T, productCount: 3 };
    assert.equal(coachmarkDueOf([car, remote, charger], hint), false);
    assert.equal(coachmarkDueOf([car, remote, charger, pack], hint), true);
  });
});
