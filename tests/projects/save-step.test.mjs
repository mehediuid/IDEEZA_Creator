// SAVE — save-step.ts (Phase 2 spec §3.5.9, P2-SAVE-1, 3, 4, 5(C), 6(C), 7,
// 10, 11, 17). `saveRecord`/`saveBuild` are T09's (projects.tsx); this file
// tests only what save-step.ts itself owns.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  arrivalOf,
  checkSaveDraft,
  coverChoicesOf,
  footerLineOf,
  holderOf,
  mintNoticeOf,
  saveBlockOf,
  saveDefaultsOf,
  saveModeOf,
  savedLineOf,
  versionChangesOf,
} from "../../.tmp-test/lib/manual/save-step.js";
import { DAY, T, build, chat, companion, project, row } from "./fixtures/projects.mjs";

// ─────────────────────────── holderOf ───────────────────────────

describe("holderOf", () => {
  it("finds the project via job.projectId", () => {
    const p = project({ id: "p1", name: "Car", createdAt: T });
    const job = build({ id: "b1", chatId: "c1", title: "Car", projectId: "p1", createdAt: T });
    assert.equal(holderOf(job, [p]), p);
  });

  it("finds the project via builds[] when projectId is unset (a failed builds-store write)", () => {
    const p = project({
      id: "p1",
      name: "Car",
      createdAt: T,
      builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
    });
    const job = build({ id: "b1", chatId: "c1", title: "Car", createdAt: T });
    assert.equal(holderOf(job, [p]), p);
  });

  it("finds the project via buildId when it's the origin build", () => {
    const p = project({ id: "p1", name: "Car", buildId: "b1", createdAt: T });
    const job = build({ id: "b1", chatId: "c1", title: "Car", createdAt: T });
    assert.equal(holderOf(job, [p]), p);
  });

  it("is null when nothing names the build", () => {
    const p = project({ id: "p1", name: "Car", createdAt: T });
    const job = build({ id: "b2", chatId: "c1", title: "Car", createdAt: T });
    assert.equal(holderOf(job, [p]), null);
  });
});

// ─────────────────────────── saveModeOf ───────────────────────────

describe("saveModeOf", () => {
  it("new: no lineage, no choice, and canJoin true once a project exists", () => {
    const other = project({ id: "p-other", name: "Lamp", createdAt: T });
    const job = build({ id: "b1", chatId: "c1", title: "Bench tools", createdAt: T });
    const mode = saveModeOf(job, [job], [other], [job], []);
    assert.deepEqual(mode, { kind: "new", choiceGone: false, canJoin: true });
  });

  it("new, canJoin false with no project in this browser", () => {
    const job = build({ id: "b1", chatId: "c1", title: "Bench tools", createdAt: T });
    const mode = saveModeOf(job, [job], [], [job], []);
    assert.deepEqual(mode, { kind: "new", choiceGone: false, canJoin: false });
  });

  it("new, because the chosen project is gone", () => {
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "Bench tools",
      projectChoiceId: "p-gone",
      createdAt: T,
    });
    const mode = saveModeOf(job, [job], [], [job], []);
    assert.equal(mode.kind, "new");
    assert.equal(mode.choiceGone, true);
  });

  it("join: a single-product build with a live projectChoiceId", () => {
    const target = project({ id: "p-garden", name: "Garden", createdAt: T });
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "Sprinkler",
      projectChoiceId: "p-garden",
      createdAt: T,
    });
    const mode = saveModeOf(job, [job], [target], [job], []);
    assert.deepEqual(mode, { kind: "join", project: target });
  });

  it("a multi-product build never joins, even with a projectChoiceId (a system is one new project)", () => {
    const target = project({ id: "p-garden", name: "Garden", createdAt: T });
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "Sprinkler",
      projectChoiceId: "p-garden",
      companions: [companion({ id: "comp-a", name: "Timer" })],
      createdAt: T,
    });
    const mode = saveModeOf(job, [job], [target], [job], []);
    assert.equal(mode.kind, "new");
  });

  it("version: a rebuild of a chat already saved joins as the next version", () => {
    const p = project({
      id: "p-car",
      name: "Car",
      createdAt: T,
      builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
    });
    const b1 = build({ id: "b1", chatId: "c1", title: "Car", projectId: "p-car", createdAt: T });
    const b2 = build({ id: "b2", chatId: "c1", title: "Car", createdAt: T + DAY });
    const mode = saveModeOf(b2, [b1, b2], [p], [b1, b2], [chat("c1", "Car chat", T)]);
    assert.equal(mode.kind, "version");
    assert.equal(mode.version, 2);
    assert.equal(mode.project, p);
    assert.equal(mode.chatTitle, "Car chat");
  });

  it("saved: job.projectId already names a live project", () => {
    const p = project({ id: "p-car", name: "Car", createdAt: T });
    const job = build({ id: "b1", chatId: "c1", title: "Car", projectId: "p-car", createdAt: T });
    const mode = saveModeOf(job, [job], [p], [job], []);
    assert.deepEqual(mode, { kind: "saved", project: p });
  });

  it("saved: via builds[]", () => {
    const p = project({
      id: "p-car",
      name: "Car",
      createdAt: T,
      builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
    });
    const job = build({ id: "b1", chatId: "c1", title: "Car", createdAt: T });
    assert.equal(saveModeOf(job, [job], [p], [job], []).kind, "saved");
  });

  it("saved: via buildId", () => {
    const p = project({ id: "p-car", name: "Car", buildId: "b1", createdAt: T });
    const job = build({ id: "b1", chatId: "c1", title: "Car", createdAt: T });
    assert.equal(saveModeOf(job, [job], [p], [job], []).kind, "saved");
  });
});

// ─────────────────────────── saveDefaultsOf ───────────────────────────

describe("saveDefaultsOf", () => {
  it("a single product: the model's sentence, else what the maker typed", () => {
    const job = build({ id: "b1", chatId: "c1", title: "Car", description: "A two-wheeled bot.", createdAt: T });
    assert.deepEqual(saveDefaultsOf(job), {
      name: "Car",
      description: "A two-wheeled bot.",
      coverProductId: "primary",
    });
  });

  it("a system: the primary's sentence, then the join of the companions' names", () => {
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "Survey Drone",
      description: "A quadcopter that maps a field from 60 m up.",
      companions: [
        companion({ id: "c1p", name: "Remote Controller" }),
        companion({ id: "c2p", name: "Battery Charger" }),
        companion({ id: "c3p", name: "Spare Battery Pack" }),
      ],
      createdAt: T,
    });
    assert.equal(
      saveDefaultsOf(job).description,
      "A quadcopter that maps a field from 60 m up. Comes with Remote Controller, Battery Charger and Spare Battery Pack.",
    );
  });

  it("the setup answer wins over the title, else falls back when it's blank", () => {
    const named = build({ id: "b1", chatId: "c1", title: "Car", projectChoiceId: undefined, createdAt: T });
    named.projectChoiceName = "Bench tools";
    assert.equal(saveDefaultsOf(named).name, "Bench tools");

    const blank = build({ id: "b2", chatId: "c1", title: "Car", createdAt: T });
    blank.projectChoiceName = "   ";
    assert.equal(saveDefaultsOf(blank).name, "Car");
  });

  it("clips the name to 80 characters and the description to 1,000", () => {
    const longTitle = "x".repeat(120);
    const job = build({ id: "b1", chatId: "c1", title: longTitle, description: "y".repeat(1200), createdAt: T });
    assert.equal(saveDefaultsOf(job).name.length, 80);
    assert.equal(saveDefaultsOf(job).description.length, 1000);
  });
});

// ─────────────────────────── coverChoicesOf ───────────────────────────

describe("coverChoicesOf", () => {
  it("the primary first, then each companion with an image, one entry per URL", () => {
    const job = build({
      id: "b1",
      chatId: "c1",
      title: "Car",
      image: "https://img.test/primary.png",
      companions: [
        companion({ id: "wheel", name: "Wheel", image: "https://img.test/wheel.png" }),
        companion({ id: "twin", name: "Twin", image: "https://img.test/primary.png" }), // duplicate URL
        companion({ id: "blank", name: "No image", image: "" }), // a companion with no image
      ],
      createdAt: T,
    });
    const choices = coverChoicesOf(job);
    assert.deepEqual(
      choices.map((c) => c.productId),
      ["primary", "wheel"],
    );
    assert.equal(choices[0].imageUrl, "https://img.test/primary.png");
  });
});

// ─────────────────────────── versionChangesOf ───────────────────────────

describe("versionChangesOf", () => {
  const baseProject = () =>
    project({
      id: "p-car",
      name: "Car",
      productName: "Product A",
      description: "A desc v1",
      buildId: "b1",
      createdAt: T,
      builds: [{ buildId: "b1", chatId: "c1", version: 1, savedAt: T }],
      products: [
        row("prd_a", "Product A", "A desc v1", "b1", "primary", T),
        row("prd_b", "Product B", "B desc", "b1", "comp-b", T),
      ],
    });
  const b1 = () =>
    build({
      id: "b1",
      chatId: "c1",
      title: "Product A",
      description: "A desc v1",
      projectId: "p-car",
      companions: [companion({ id: "comp-b", name: "Product B", description: "B desc" })],
      createdAt: T,
    });

  it("new / updated / dropped", () => {
    const b2 = build({
      id: "b2",
      chatId: "c1",
      title: "Product A",
      description: "A desc v2",
      companions: [companion({ id: "comp-c", name: "Product C", description: "C desc" })],
      createdAt: T + DAY,
    });
    const changes = versionChangesOf(baseProject(), b2, [b1(), b2], [b1(), b2], [], T + DAY);
    assert.deepEqual(changes.added, ["Product C"]);
    assert.deepEqual(changes.updated, ["Product A"]);
    assert.deepEqual(changes.dropped, ["Product B"]);
  });

  it("same: an identical rebuild changes nothing", () => {
    const b1c = build({
      id: "b1c",
      chatId: "c1",
      title: "Product A",
      description: "A desc v1",
      companions: [companion({ id: "comp-b", name: "Product B", description: "B desc" })],
      createdAt: T + DAY,
    });
    const changes = versionChangesOf(baseProject(), b1c, [b1(), b1c], [b1(), b1c], [], T + DAY);
    assert.deepEqual(changes, { added: [], updated: [], dropped: [] });
  });
});

// ─────────────────────────── copy helpers ───────────────────────────

describe("mintNoticeOf", () => {
  it("is null for a Draft target, and the neutral line otherwise", () => {
    assert.equal(mintNoticeOf("draft", "Car", "product"), null);
    assert.equal(
      mintNoticeOf("private", "Car", "product"),
      "Car is already minted. This product won't be part of that mint.",
    );
    assert.equal(
      mintNoticeOf("listed", "Car", "version"),
      "Car is already minted. This version won't be part of that mint.",
    );
  });
});

describe("footerLineOf", () => {
  const p = project({ id: "p-car", name: "Car", createdAt: T });

  it("new mode", () => {
    assert.equal(
      footerLineOf({ kind: "new", choiceGone: false, canJoin: false }, 5),
      "All five pieces are ready. Save it to name the project and put it in My projects.",
    );
  });

  it("new mode, the chosen project is gone", () => {
    assert.equal(
      footerLineOf({ kind: "new", choiceGone: true, canJoin: false }, 5),
      "All five pieces are ready. The project you picked at the start isn't in this browser any more — save it as a new project.",
    );
  });

  it("join mode names the project", () => {
    assert.equal(
      footerLineOf({ kind: "join", project: p }, 5),
      "All five pieces are ready. Save it to add it to Car.",
    );
  });

  it("version mode names the project and the version", () => {
    assert.equal(
      footerLineOf({ kind: "version", project: p, version: 2, chatTitle: "x" }, 5),
      "All five pieces are ready. Save it as version 2 of Car.",
    );
  });
});

describe("savedLineOf", () => {
  it("names the project and the version", () => {
    const p = project({ id: "p-car", name: "Car", createdAt: T });
    assert.equal(savedLineOf(p, 2), "Saved to Car as version 2.");
    assert.equal(savedLineOf(p, null), "Saved to Car.");
  });
});

describe("arrivalOf", () => {
  it("new / join / version", () => {
    assert.deepEqual(arrivalOf("new", { name: "Car", product: "", version: 0 }), {
      title: "Saved to My projects",
      body: "Car is ready for its next step.",
    });
    assert.deepEqual(arrivalOf("join", { name: "Garden", product: "Sprinkler", version: 0 }), {
      title: "Sprinkler was added to Garden.",
    });
    assert.deepEqual(arrivalOf("version", { name: "Car", product: "", version: 2 }), {
      title: "Saved as version 2.",
    });
  });
});

// ─────────────────────────── checkSaveDraft ───────────────────────────

describe("checkSaveDraft", () => {
  it("refuses an empty name and a too-long description", () => {
    const draft = { mode: "new", name: "", description: "x".repeat(1001), coverProductId: "primary", joinId: null };
    const check = checkSaveDraft(draft, []);
    assert.equal(check.ok, false);
    assert.equal(check.name.error, "Give the project a name.");
    assert.match(check.description.error, /Keep it under 1,000 characters/);
  });

  it("allows a duplicate name, with a note but no error", () => {
    const draft = { mode: "new", name: "Car", description: "", coverProductId: "primary", joinId: null };
    const check = checkSaveDraft(draft, ["Car"]);
    assert.equal(check.ok, true);
    assert.match(check.name.note, /already called/);
  });
});

// ─────────────────────────── saveBlockOf (decision 12, P2-SAVE-5/6 as changed) ───────────────────────────

describe("saveBlockOf", () => {
  const car = project({ id: "p-car", name: "Car", createdAt: T });

  it("is null for new and saved modes, whatever the gate", () => {
    assert.equal(saveBlockOf({ kind: "new", choiceGone: false, canJoin: true }, { kind: "locked", reason: "x" }), null);
    assert.equal(saveBlockOf({ kind: "saved", project: car }, { kind: "locked", reason: "x" }), null);
  });

  it("is null when the gate is free or confirm", () => {
    const mode = { kind: "version", project: car, version: 2, chatTitle: "x" };
    assert.equal(saveBlockOf(mode, { kind: "free" }), null);
    assert.equal(saveBlockOf(mode, { kind: "confirm", listingId: "lst_1" }), null);
  });

  it("locked version mode returns spec §3.8.5's exact copy", () => {
    const mode = { kind: "version", project: car, version: 2, chatTitle: "x" };
    const block = saveBlockOf(mode, { kind: "locked", reason: "irrelevant" });
    assert.deepEqual(block, {
      kind: "locked",
      reason: "Car was sold in full, so it can't take a new version. Save this build as a new project.",
    });
  });

  it("an auction-blocked gate forwards LISTING's reason, for join and version alike", () => {
    const reason = "An auction is running — you can change the project after it closes.";
    const join = { kind: "join", project: car };
    const version = { kind: "version", project: car, version: 2, chatTitle: "x" };
    assert.deepEqual(saveBlockOf(join, { kind: "blocked", reason }), { kind: "blocked", reason });
    assert.deepEqual(saveBlockOf(version, { kind: "blocked", reason }), { kind: "blocked", reason });
  });
});
