// The editors' one save status (lib/manual/save-status.ts, owner 2026-10-19, autosave D3/D4):
// every editor's write reports here; Retry and saving on purpose write again.

import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getSaveSnapshot,
  registerSaveFlusher,
  reportSave,
  resetSaveStatus,
  retryFailedSaves,
  saveNow,
  subscribeSaves,
  summarizeSaves,
} from "../../.tmp-test/lib/manual/save-status.js";

beforeEach(() => resetSaveStatus());

describe("summarizeSaves", () => {
  it("is saved at the last kept write, and lists every refused source", () => {
    const entries = new Map([
      ["pcb", { ok: true, at: 10, retry: null }],
      ["code.files", { ok: false, at: 30, retry: null }],
      ["3d.shapes", { ok: true, at: 20, retry: null }],
    ]);
    assert.deepEqual(summarizeSaves(entries, null), { failed: ["code.files"], at: 20, savedNowAt: null });
    assert.deepEqual(summarizeSaves(new Map(), 5), { failed: [], at: null, savedNowAt: 5 });
  });
});

describe("the store", () => {
  it("a refused write shows until a later write of the same source is kept", () => {
    reportSave("code.files", false, () => true, 1);
    assert.deepEqual(getSaveSnapshot().failed, ["code.files"]);
    reportSave("code.files", true, undefined, 2);
    assert.deepEqual(getSaveSnapshot().failed, []);
    assert.equal(getSaveSnapshot().at, 2);
  });

  it("Retry writes the refused sources again", () => {
    let storageFull = true;
    reportSave("3d.shapes", false, () => !storageFull, 1);
    assert.equal(retryFailedSaves(2), false);
    storageFull = false;
    assert.equal(retryFailedSaves(3), true);
    assert.deepEqual(getSaveSnapshot(), { failed: [], at: 3, savedNowAt: null });
  });

  it("saving on purpose flushes pending writes, retries refused ones, and lights Saved", () => {
    let flushed = 0;
    const off = registerSaveFlusher("pcb", () => {
      flushed += 1;
      reportSave("pcb", true, undefined, 4);
      return true;
    });
    reportSave("wiring", false, () => true, 1);
    assert.equal(saveNow(5), true);
    assert.equal(flushed, 1);
    assert.deepEqual(getSaveSnapshot(), { failed: [], at: 5, savedNowAt: 5 });
    off();
    saveNow(6);
    assert.equal(flushed, 1, "an unregistered flusher is not called");
  });

  it("a save on purpose that can't be kept does not light Saved", () => {
    reportSave("preview.mates", false, () => false, 1);
    assert.equal(saveNow(2), false);
    assert.equal(getSaveSnapshot().savedNowAt, null);
    assert.deepEqual(getSaveSnapshot().failed, ["preview.mates"]);
  });

  it("another product starts afresh, and listeners hear every change", () => {
    let heard = 0;
    const off = subscribeSaves(() => (heard += 1));
    reportSave("code.blocks", false, undefined, 1);
    resetSaveStatus();
    off();
    assert.equal(heard, 2);
    assert.deepEqual(getSaveSnapshot(), { failed: [], at: null, savedNowAt: null });
  });
});
