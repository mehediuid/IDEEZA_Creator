import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { productsOf } from "../../.tmp-test/lib/create/history.js";
import {
  buildsOf,
  conceptOf,
  coverOf,
  lineageProjectOf,
  lineagesOf,
  pendingVersionsOf,
  piecesOf,
  productRowsOf,
  productsOfProject,
  projectLogOf,
  resumeStepOf,
  versionsOf,
} from "../../.tmp-test/lib/manual/project-read.js";
import { STATUS_WORD, projectStatus } from "../../.tmp-test/lib/manual/project-summary.js";
import { logLinesOf } from "../../.tmp-test/lib/manual/rail-rows.js";
import {
  DAY,
  MIN,
  MINT,
  T,
  build,
  chat,
  companion,
  dropsOne,
  four,
  handJoined,
  items,
  legacyHand,
  mintedSell,
  project,
  purged,
  rebuiltTwice,
} from "./fixtures/projects.mjs";

const refsOf = (fx) => buildsOf(fx.project, fx.builds);
const productsFor = (fx) => productsOfProject(fx.project, refsOf(fx));
const versionsFor = (fx) => {
  const refs = refsOf(fx);
  return versionsOf(refs, lineagesOf(refs, fx.chats), productRowsOf(fx.project));
};
/** A version without its job, for readable deepEqual. */
const plain = (v) => ({
  version: v.version,
  current: v.current,
  buildId: v.buildId,
  savedAt: v.savedAt,
  pieces: v.pieces,
  products: v.products,
  diff: v.diff,
});

describe("productsOf (COR-90)", () => {
  it("gives the primary the job's own description", () => {
    const [primary] = productsOf(four.builds[0]);
    assert.equal(primary.id, "primary");
    assert.equal(primary.description, "A quadcopter that maps a field from 60 m up.");
    assert.equal(primary.summary, "ESP32-WROOM-32 · L298N motor driver");
  });
  it("leaves the key out when the job has none", () => {
    const job = build({ id: "b-nodesc", chatId: "c-x", title: "Thing", createdAt: T });
    assert.equal("description" in productsOf(job)[0], false);
  });
});

describe("buildsOf (COR-86)", () => {
  it("reads stored refs with their jobs", () => {
    const refs = refsOf(four);
    assert.equal(refs.length, 1);
    assert.deepEqual(
      { buildId: refs[0].buildId, chatId: refs[0].chatId, version: refs[0].version, savedAt: refs[0].savedAt },
      { buildId: "b-drone", chatId: "c-drone", version: 1, savedAt: T + 5 * MIN },
    );
    assert.equal(refs[0].job, four.builds[0]);
  });
  it("keeps a stored ref whose build is gone, with job null", () => {
    const [ref] = refsOf(purged);
    assert.equal(ref.buildId, "b-purged");
    assert.equal(ref.job, null);
  });
  it("numbers legacy links per lineage by createdAt; only the origin has a save time", () => {
    const p = project({ id: "p-leg", name: "Legacy", productName: "Rover", buildId: "b-l1", createdAt: T + MIN });
    const all = [
      build({ id: "b-m1", chatId: "c-m", title: "Mast", projectId: "p-leg", createdAt: T + 2 * DAY }),
      build({ id: "b-l2", chatId: "c-l", title: "Rover", projectId: "p-leg", createdAt: T + DAY }),
      build({ id: "b-l1", chatId: "c-l", title: "Rover", projectId: "p-leg", createdAt: T }),
      build({ id: "b-other", chatId: "c-l", title: "Rover", createdAt: T + 3 * DAY }),
    ];
    assert.deepEqual(
      buildsOf(p, all).map(({ buildId, chatId, version, savedAt }) => ({ buildId, chatId, version, savedAt })),
      [
        { buildId: "b-l1", chatId: "c-l", version: 1, savedAt: T + MIN },
        { buildId: "b-l2", chatId: "c-l", version: 2, savedAt: null },
        { buildId: "b-m1", chatId: "c-m", version: 1, savedAt: null },
      ],
    );
  });
  it("sorts a gone origin build first, with no chat", () => {
    const p = project({ id: "p-g", name: "Gone", buildId: "b-gone", createdAt: T });
    const all = [build({ id: "b-x", chatId: "c-x", title: "X", projectId: "p-g", createdAt: T + DAY })];
    assert.deepEqual(
      buildsOf(p, all).map(({ buildId, chatId, version, job }) => ({ buildId, chatId, version, gone: job === null })),
      [
        { buildId: "b-gone", chatId: null, version: 1, gone: true },
        { buildId: "b-x", chatId: "c-x", version: 1, gone: false },
      ],
    );
  });
  it("appends a legacy link after its lineage's stored versions", () => {
    const p = { ...rebuiltTwice.project, builds: rebuiltTwice.project.builds.slice(0, 2) };
    const refs = buildsOf(p, rebuiltTwice.builds);
    assert.deepEqual(
      refs.map((r) => [r.buildId, r.version]),
      [
        ["b-bot-1", 1],
        ["b-bot-2", 2],
        ["b-bot-3", 3],
      ],
    );
    assert.equal(refs[2].savedAt, null);
  });
});

describe("lineagesOf", () => {
  it("groups one chat's versions, oldest first, titled by the chat", () => {
    const [l, ...rest] = lineagesOf(refsOf(rebuiltTwice), rebuiltTwice.chats);
    assert.equal(rest.length, 0);
    assert.equal(l.chatId, "c-bot");
    assert.equal(l.title, "Line-following robot");
    assert.equal(l.chat, rebuiltTwice.chats[0]);
    assert.deepEqual(l.refs.map((r) => r.version), [1, 2, 3]);
    assert.equal(l.latest.buildId, "b-bot-3");
  });
  it("falls back to the build's title when the chat is gone, then to \"Build\"", () => {
    const [l] = lineagesOf(refsOf(rebuiltTwice), []);
    assert.equal(l.chat, null);
    assert.equal(l.title, "Line Follower");
    const [gone] = lineagesOf(refsOf(purged), []);
    assert.equal(gone.title, "Build");
  });
  it("keeps the chat title while the build is gone", () => {
    assert.equal(lineagesOf(refsOf(purged), purged.chats)[0].title, "Weather station");
  });
  it("is empty for a hand-made project", () => {
    assert.deepEqual(lineagesOf(refsOf(legacyHand), legacyHand.chats), []);
  });
});

describe("productsOfProject (COR-42, COR-108)", () => {
  const brief = (list) =>
    list.map((x) => ({ id: x.id, name: x.name, state: x.state, version: x.version, dropped: x.dropped, from: x.built?.ref.buildId ?? null }));

  it("lists all four products of a 4-product build", () => {
    assert.deepEqual(brief(productsFor(four)), [
      { id: "prd_drone001", name: "Survey Drone", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone002", name: "Remote Controller", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone003", name: "Battery Charger", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
      { id: "prd_drone004", name: "Landing Pad", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-drone" },
    ]);
    assert.equal(productsFor(four)[1].built.product.id, "remote-controller");
  });
  it("gives a legacy hand-made project its one product, as p1", () => {
    assert.deepEqual(productsFor(legacyHand), [
      {
        id: "p1",
        name: "Desk Lamp",
        description: "A lamp that dims itself after sunset.",
        built: null,
        state: "hand",
        version: null,
        dropped: null,
      },
    ]);
  });
  it("joins a legacy row to its origin build by name", () => {
    assert.deepEqual(brief(productsFor(mintedSell)), [
      { id: "p1", name: "Smart Plant Pot", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-pot" },
    ]);
  });
  it("keeps the typed product hand-made after a build joins", () => {
    assert.deepEqual(brief(productsFor(handJoined)), [
      { id: "p1", name: "Rain Gauge", state: "hand", version: null, dropped: null, from: null },
      { id: "prd_gard0001", name: "Garden Hub", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-garden" },
      { id: "prd_gard0002", name: "Soil Sensor", state: "built", version: { current: 1, count: 1 }, dropped: null, from: "b-garden" },
    ]);
  });
  it("keeps every product of a purged build, not linked", () => {
    const list = productsFor(purged);
    assert.deepEqual(list.map((x) => [x.name, x.state, x.built, x.version]), [
      ["Pocket Weather Station", "build-gone", null, null],
      ["Display Dock", "build-gone", null, null],
    ]);
  });
  it("reads a legacy row as build-gone when none of its builds is here", () => {
    const p = project({ id: "p-old", name: "Old", productName: "Kite", buildId: "b-old", createdAt: T, products: [{ id: "p1", name: "Kite", description: "" }] });
    assert.equal(productsOfProject(p, buildsOf(p, [])).at(0).state, "build-gone");
  });
  it("reads a renamed legacy row as unmatched", () => {
    const p = { ...mintedSell.project, products: [{ id: "p1", name: "Self-watering Pot", description: "" }] };
    assert.equal(productsOfProject(p, buildsOf(p, mintedSell.builds)).at(0).state, "unmatched");
  });
  it("never lets a name join take a product a stored source holds", () => {
    const p = {
      ...four.project,
      products: [...four.project.products, { id: "p9", name: "Landing Pad", description: "" }],
    };
    const list = productsOfProject(p, buildsOf(p, four.builds));
    assert.equal(list.at(3).state, "built");
    assert.equal(list.at(4).state, "unmatched");
  });
  it("keeps a product the rebuild dropped, marked, at the last version that had it", () => {
    assert.deepEqual(brief(productsFor(dropsOne)), [
      { id: "prd_car00001", name: "RC Car Controller", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
      { id: "prd_car00002", name: "Remote Controller", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
      { id: "prd_car00003", name: "Battery Charger", state: "built", version: { current: 1, count: 2 }, dropped: { lastIn: 1, current: 2 }, from: "b-car-1" },
      { id: "prd_car00004", name: "Spare Battery Pack", state: "built", version: { current: 2, count: 2 }, dropped: null, from: "b-car-2" },
    ]);
  });
  it("shows a chat rebuilt twice at version 3 of 3", () => {
    assert.deepEqual(productsFor(rebuiltTwice).map((x) => [x.name, x.version, x.dropped]), [
      ["Line Follower", { current: 3, count: 3 }, null],
      ["Charging Dock", { current: 3, count: 3 }, null],
    ]);
  });
});

describe("versionsOf (COR-106)", () => {
  it("says what a rebuild added, dropped and changed", () => {
    const [car] = versionsFor(dropsOne);
    assert.deepEqual(car.map(plain), [
      {
        version: 2,
        current: true,
        buildId: "b-car-2",
        savedAt: T + 4 * DAY + 5 * MIN,
        pieces: { ready: 15, total: 15, retry: false },
        products: [
          { rowId: "prd_car00001", productId: "primary", name: "RC Car Controller" },
          { rowId: "prd_car00002", productId: "remote-controller", name: "Remote Controller" },
          { rowId: "prd_car00004", productId: "spare-battery-pack", name: "Spare Battery Pack" },
        ],
        diff: { added: ["prd_car00004"], dropped: ["prd_car00003"], changed: ["prd_car00002"] },
      },
      {
        version: 1,
        current: false,
        buildId: "b-car-1",
        savedAt: T + 5 * MIN,
        pieces: { ready: 15, total: 15, retry: false },
        products: [
          { rowId: "prd_car00001", productId: "primary", name: "RC Car Controller" },
          { rowId: "prd_car00002", productId: "remote-controller", name: "Remote Controller" },
          { rowId: "prd_car00003", productId: "battery-charger", name: "Battery Charger" },
        ],
        diff: null,
      },
    ]);
    assert.equal(car[0].lineage, "Car");
    assert.equal(car[0].chatId, "c-car");
    assert.equal(car[0].job, dropsOne.builds[1]);
  });
  it("lists a chat rebuilt twice newest first, each against the version before", () => {
    const [bot] = versionsFor(rebuiltTwice);
    assert.deepEqual(
      bot.map((v) => [v.version, v.current, v.diff]),
      [
        [3, true, { added: [], dropped: [], changed: ["prd_bot00002"] }],
        [2, false, { added: ["prd_bot00002"], dropped: [], changed: ["prd_bot00001"] }],
        [1, false, null],
      ],
    );
    assert.deepEqual(bot[2].products, [{ rowId: "prd_bot00001", productId: "primary", name: "Line Follower" }]);
  });
  it("lists no products for a version whose build is gone", () => {
    const [[v]] = versionsFor(purged);
    assert.deepEqual(plain(v), {
      version: 1,
      current: true,
      buildId: "b-purged",
      savedAt: T - 10 * DAY,
      pieces: null,
      products: [],
      diff: null,
    });
    assert.equal(v.job, null);
    assert.equal(v.lineage, "Weather station");
  });
  it("can't diff against a version whose build is gone", () => {
    const fx = { ...dropsOne, builds: [dropsOne.builds[1]] };
    const [car] = versionsFor(fx);
    assert.equal(car[0].diff, null);
    assert.equal(car[0].products.length, 3);
  });
  it("ties a joined build's products to their rows and leaves the typed one out", () => {
    const [[v]] = versionsFor(handJoined);
    assert.deepEqual(v.products, [
      { rowId: "prd_gard0001", productId: "primary", name: "Garden Hub" },
      { rowId: "prd_gard0002", productId: "soil-sensor", name: "Soil Sensor" },
    ]);
  });
  it("ties legacy rows by name", () => {
    const [[v]] = versionsFor(mintedSell);
    assert.deepEqual(v.products, [{ rowId: "p1", productId: "primary", name: "Smart Plant Pot" }]);
    assert.equal(v.savedAt, mintedSell.project.createdAt);
  });
  it("gives a 4-product build one version with its four products", () => {
    const [[v]] = versionsFor(four);
    assert.equal(v.products.length, 4);
    assert.deepEqual(v.pieces, { ready: 20, total: 20, retry: false });
  });
  it("is empty for a hand-made project", () => {
    assert.deepEqual(versionsFor(legacyHand), []);
  });
});

describe("piecesOf", () => {
  it("counts every product's pieces, skipped ones left out, and says when one needs a retry", () => {
    const job = build({
      id: "b-p",
      chatId: "c-p",
      title: "P",
      createdAt: T,
      items: items("ready", { code: "failed", wiring: "skipped" }),
      companions: [companion({ id: "dock", name: "Dock" })],
    });
    assert.deepEqual(piecesOf(job), { ready: 8, total: 9, retry: true });
  });
});

describe("pendingVersionsOf (COR-18)", () => {
  const b4 = build({ id: "b-bot-4", chatId: "c-bot", title: "Line Follower", createdAt: T + 3 * DAY, items: items("building") });
  it("finds the unsaved newer build of a lineage as its next version", () => {
    const all = [...rebuiltTwice.builds, b4];
    const pending = pendingVersionsOf(buildsOf(rebuiltTwice.project, all), all);
    assert.deepEqual(
      pending.map(({ chatId, job, version, status }) => ({ chatId, id: job.id, version, status })),
      [{ chatId: "c-bot", id: "b-bot-4", version: 4, status: "running" }],
    );
  });
  it("ignores a build saved elsewhere and one older than the latest version", () => {
    const elsewhere = { ...b4, projectId: "p-other" };
    const older = build({ id: "b-bot-0", chatId: "c-bot", title: "Line Follower", createdAt: T + DAY + 1 });
    const all = [...rebuiltTwice.builds, elsewhere, older];
    assert.deepEqual(pendingVersionsOf(buildsOf(rebuiltTwice.project, all), all), []);
  });
  it("is empty when nothing newer waits", () => {
    assert.deepEqual(pendingVersionsOf(refsOf(four), four.builds), []);
  });
  it("counts a build saved into a project that no longer exists — Save would bring it here", () => {
    const orphan = { ...b4, projectId: "p-deleted" };
    const all = [...rebuiltTwice.builds, orphan];
    const refs = buildsOf(rebuiltTwice.project, all);
    const live = [rebuiltTwice.project, four.project];
    assert.deepEqual(pendingVersionsOf(refs, all, live).map((w) => [w.job.id, w.version]), [["b-bot-4", 4]]);
    // Saved into a project that is still here: that project's, not this one's.
    assert.deepEqual(pendingVersionsOf(refs, all, [...live, project({ id: "p-deleted", name: "Other" })]), []);
    // Without the project list nothing can be told gone, so nothing is claimed.
    assert.deepEqual(pendingVersionsOf(refs, all), []);
  });
});

describe("lineageProjectOf (COR-89)", () => {
  const b3 = build({ id: "b-car-3", chatId: "c-car", title: "RC Car Controller", createdAt: T + 6 * DAY });
  it("returns the live project another build of the chat became", () => {
    assert.equal(lineageProjectOf(b3, [...dropsOne.builds, b3], [dropsOne.project, four.project]), dropsOne.project);
  });
  it("returns null once that project is deleted, and for a chat's first build", () => {
    assert.equal(lineageProjectOf(b3, [...dropsOne.builds, b3], [four.project]), null);
    const first = build({ id: "b-new", chatId: "c-new", title: "New", createdAt: T });
    assert.equal(lineageProjectOf(first, [first, ...dropsOne.builds], [dropsOne.project]), null);
  });
});

describe("projectLogOf (COR-52)", () => {
  it("logs a hand-made project's creation", () => {
    assert.deepEqual(projectLogOf(legacyHand.project, null), [{ kind: "created", at: T - 30 * DAY }]);
    assert.deepEqual(projectLogOf(handJoined.project, null), [{ kind: "created", at: T }]);
  });
  it("logs nothing for a built, unminted project — its saves are versions", () => {
    assert.deepEqual(projectLogOf(four.project, null), []);
    assert.deepEqual(projectLogOf(rebuiltTwice.project, null), []);
  });
  it("logs the mint and the showcase, Showcased first at the same moment", () => {
    assert.deepEqual(projectLogOf(mintedSell.project, mintedSell.draft.state), [
      { kind: "showcased", at: MINT },
      { kind: "minted", at: MINT, intent: "sell", network: "baseSepolia" },
    ]);
  });
  it("logs a mint whenever mintedAt is set — one with no intent mints into Private, as projectStatus reads it", () => {
    const noIntent = { ...mintedSell.draft.state, intent: null };
    assert.deepEqual(projectLogOf(mintedSell.project, noIntent), [
      { kind: "showcased", at: MINT },
      { kind: "minted", at: MINT, intent: "save", network: "baseSepolia" },
    ]);
    // Every intent, and none: the log's word is the status chip's word.
    for (const intent of ["sell", "give", "save", null]) {
      const draft = { ...mintedSell.draft, state: { ...mintedSell.draft.state, intent } };
      const minted = projectLogOf(mintedSell.project, draft.state).find((e) => e.kind === "minted");
      const [line] = logLinesOf([minted]);
      assert.equal(line.title.split(" · ")[1], STATUS_WORD[projectStatus(mintedSell.project, draft)], String(intent));
    }
  });
  it("drops the showcase once it stops, and never shows one on a Draft", () => {
    const stopped = { ...mintedSell.project, showcasedAt: null };
    assert.deepEqual(projectLogOf(stopped, mintedSell.draft.state).map((e) => e.kind), ["minted"]);
    const draft = { ...four.project, showcasedAt: T + DAY };
    assert.deepEqual(projectLogOf(draft, null), []);
  });
});

describe("coverOf (COR-96)", () => {
  it("takes the newest saved version's primary image", () => {
    assert.equal(coverOf(four.project, refsOf(four)), "https://img.test/b-drone.png");
    assert.equal(coverOf(dropsOne.project, refsOf(dropsOne)), "https://img.test/b-car-2.png");
    assert.equal(coverOf(rebuiltTwice.project, refsOf(rebuiltTwice)), "https://img.test/b-bot-3.png");
  });
  it("falls back to any product image", () => {
    const job = build({
      id: "b-noimg",
      chatId: "c-n",
      title: "N",
      createdAt: T,
      image: "",
      companions: [companion({ id: "dock", name: "Dock", image: "https://img.test/dock.png" })],
    });
    const p = project({ id: "p-n", name: "N", buildId: "b-noimg", createdAt: T });
    assert.equal(coverOf(p, buildsOf(p, [job])), "https://img.test/dock.png");
  });
  it("is null with no image to show", () => {
    assert.equal(coverOf(legacyHand.project, refsOf(legacyHand)), null);
    assert.equal(coverOf(purged.project, refsOf(purged)), null);
  });
  it("takes the maker's pick first — even a product a later version dropped", () => {
    const p = { ...dropsOne.project, cover: { buildId: "b-car-1", productId: "battery-charger" } };
    assert.equal(coverOf(p, buildsOf(p, dropsOne.builds)), "https://img.test/battery-charger.png");
  });
  it("falls back to the default once the pick is cleared, gone, imageless or not this project's", () => {
    const fallback = "https://img.test/b-car-2.png";
    const at = (cover, builds = dropsOne.builds) => {
      const p = { ...dropsOne.project, cover };
      return coverOf(p, buildsOf(p, builds));
    };
    assert.equal(at(null), fallback);
    assert.equal(at(undefined), fallback);
    // Its build left this browser.
    assert.equal(at({ buildId: "b-car-1", productId: "battery-charger" }, [dropsOne.builds[1]]), fallback);
    // Its product has no image.
    const bare = { ...dropsOne.builds[0], companions: dropsOne.builds[0].companions.map((c) => ({ ...c, conceptImageUrl: "" })) };
    assert.equal(at({ buildId: "b-car-1", productId: "battery-charger" }, [bare, dropsOne.builds[1]]), fallback);
    // A product id the build doesn't have, and a build that isn't this project's.
    assert.equal(at({ buildId: "b-car-2", productId: "battery-charger" }), fallback);
    assert.equal(at({ buildId: "b-drone", productId: "primary" }, [...dropsOne.builds, ...four.builds]), fallback);
  });
});

describe("resumeStepOf (COR-12)", () => {
  it("resumes the editor step last opened, else PCB — never the Brief", () => {
    assert.equal(resumeStepOf(legacyHand.project), "pcb");
    assert.equal(resumeStepOf({ ...legacyHand.project, lastOpened: { step: "wiring", at: T } }), "wiring");
    assert.equal(resumeStepOf({ ...legacyHand.project, lastOpened: { step: "brief", at: T } }), "pcb");
  });
});

describe("conceptOf", () => {
  const concept = (title) => ({ title, summary: "", description: "", parts: [{ name: "ESP32", role: "", category: "Microcontroller" }] });
  const job = dropsOne.builds[1];
  const turns = [
    { id: "t1", role: "assistant", prompt: "car", kind: "fresh", status: "ready", imageUrl: job.conceptImageUrl, usedForBuild: job.id, concept: concept("Car"), ts: T },
    {
      id: "t2",
      role: "assistant",
      prompt: "remote",
      kind: "fresh",
      status: "ready",
      companionOf: "remote-controller",
      imageUrl: job.companions[0].conceptImageUrl,
      concept: concept("Remote"),
      ts: T + 1,
    },
  ];
  const c = chat("c-car", "Car", T, turns);
  it("finds the primary's concept by the turn that started the build", () => {
    assert.equal(conceptOf(c, job, productsOf(job)[0])?.title, "Car");
  });
  it("finds a companion's concept by its drawing", () => {
    assert.equal(conceptOf(c, job, productsOf(job)[1])?.title, "Remote");
  });
  it("finds nothing once the chat is gone", () => {
    assert.equal(conceptOf(null, job, productsOf(job)[0]), undefined);
  });
});
