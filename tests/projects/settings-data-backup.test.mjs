// Settings › AI & your data: reading back the zip Download makes (stored or
// re-zipped with deflate), the backup inside it, and what a restore would
// write and replace.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { makeZip } = await import("../../.tmp-test/lib/data/zip.js");
const { listZip, readEntry, readZipFiles, ZipReadError } = await import("../../.tmp-test/lib/data/zip-read.js");
const {
  BACKUP_PATH,
  BACKUP_VERSION,
  isAppKey,
  backupKeys,
  encodeValue,
  decodeValue,
  parseBackup,
  findBackup,
  restorePlan,
} = await import("../../.tmp-test/lib/data/backup-format.js");

const enc = new TextEncoder();
const dec = new TextDecoder();

test("a zip Download wrote reads back, names and bytes intact", async () => {
  const zip = makeZip([
    { name: "index.html", data: "<p>hi</p>" },
    { name: "products/প্রকল্প.json", data: '{"a":1}' },
    { name: "profile/photo.jpg", data: new Uint8Array([0, 1, 2, 255]) },
  ]);
  const files = await readZipFiles(zip);
  assert.deepEqual([...files.keys()], ["index.html", "products/প্রকল্প.json", "profile/photo.jpg"]);
  assert.equal(dec.decode(files.get("products/প্রকল্প.json")), '{"a":1}');
  assert.deepEqual([...files.get("profile/photo.jpg")], [0, 1, 2, 255]);
});

test("a zip re-made by another tool (deflate, a folder round it) still reads", async (t) => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "ideeza-zipread-"));
    mkdirSync(join(dir, "copy", "ideeza-backup"), { recursive: true });
    const body = JSON.stringify({ text: "x".repeat(5000) });
    writeFileSync(join(dir, "copy", "ideeza-backup", "backup.json"), body);
    execFileSync("zip", ["-r", "-q", "out.zip", "copy"], { cwd: dir });
    const bytes = new Uint8Array(readFileSync(join(dir, "out.zip")));
    const entries = listZip(bytes);
    const e = entries.find((x) => x.name.endsWith("backup.json"));
    assert.equal(e.method, 8, "zip compressed it");
    assert.equal(dec.decode(await readEntry(bytes, e)), body);
    assert.equal(findBackup(entries.map((x) => x.name)), "copy/ideeza-backup/backup.json");
  } catch (e) {
    if (e?.code === "ENOENT") t.skip("no zip tool on this machine");
    else throw e;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

test("not a zip, a cut-off zip and a changed byte each say what is wrong", async () => {
  assert.throws(() => listZip(enc.encode("hello, this is not a zip file at all")), (e) => e instanceof ZipReadError && e.code === "not-zip");
  const zip = makeZip([{ name: "a.txt", data: "abcdef" }]);
  assert.throws(() => listZip(zip.slice(0, zip.length - 30)), (e) => e instanceof ZipReadError && e.code === "not-zip");
  const bad = zip.slice();
  bad[30 + "a.txt".length] ^= 0xff; // the first byte of a.txt's data
  const [entry] = listZip(bad);
  await assert.rejects(readEntry(bad, entry), (e) => e instanceof ZipReadError && e.code === "damaged");
});

test("only IDEEZA's own keys go in a backup", () => {
  assert.equal(isAppKey("ideeza:manual:projects"), true);
  assert.equal(isAppKey("ideeza-theme"), true);
  assert.equal(isAppKey("other-app:token"), false);
  assert.equal(isAppKey("ideezaX"), false);
  const keys = backupKeys({ "ideeza:settings": "{}", "ideeza-theme": "dark", "next-auth": "x", "ideeza:activity": JSON.stringify({ v: 1, searches: [], watches: [{ id: "w" }] }) });
  assert.deepEqual(Object.keys(keys).sort(), ["ideeza-theme", "ideeza:activity", "ideeza:settings"]);
  assert.equal(JSON.parse(keys["ideeza:activity"]).watches, undefined, "the old watch log never goes in");
});

test("a value's files become zip paths and come back as files", () => {
  const blob = new Blob(["png-bytes"], { type: "image/png" });
  const record = { key: "m1", projectId: "p1", blob, createdAt: 5, nested: { poster: blob } };
  const seen = [];
  const coded = encodeValue(record, (b, field) => {
    seen.push(field);
    return `products/media/${field}.png`;
  });
  assert.deepEqual(seen, ["blob", "poster"]);
  assert.deepEqual(coded.blob, { $blob: { path: "products/media/blob.png", type: "image/png" } });
  assert.equal(coded.createdAt, 5);
  const back = decodeValue(coded, (path, type) => ({ path, type }));
  assert.deepEqual(back.blob, { path: "products/media/blob.png", type: "image/png" });
  assert.deepEqual(back.nested.poster, { path: "products/media/poster.png", type: "image/png" });
});

const doc = (over = {}) =>
  JSON.stringify({
    format: "ideeza-backup",
    version: BACKUP_VERSION,
    madeAt: Date.UTC(2026, 9, 19, 9, 30),
    localStorage: {
      "ideeza:manual:projects": JSON.stringify([{ id: "p1", name: "Lamp", createdAt: 1 }, { id: "p2", name: "Drone", createdAt: 2 }]),
      "ideeza:messages": JSON.stringify({ conversations: [{ id: "c1" }] }),
      "ideeza:settings": "{}",
    },
    indexedDB: [{ name: "ideeza-media", version: 1, stores: [{ name: "files", keyPath: "key", autoIncrement: false, indexes: [], records: [{ value: { key: "m1", blob: { $blob: { path: "products/media/m1.png", type: "image/png" } } } }] }] }],
    ...over,
  });

test("a backup is checked before anything is written", () => {
  assert.equal(parseBackup(doc()).ok, true);
  assert.deepEqual(parseBackup("{not json"), { ok: false, error: "damaged" });
  assert.deepEqual(parseBackup(JSON.stringify({ format: "something-else", version: 1 })), { ok: false, error: "foreign" });
  assert.deepEqual(parseBackup(doc({ version: BACKUP_VERSION + 1 })), { ok: false, error: "newer" });
  assert.deepEqual(parseBackup(doc({ localStorage: { "ideeza:x": 3 } })), { ok: false, error: "damaged" });
  assert.deepEqual(parseBackup(doc({ localStorage: { "evil:key": "x" } })), { ok: false, error: "damaged" }, "a backup only ever writes IDEEZA's keys");
  assert.equal(findBackup(["index.html", BACKUP_PATH]), BACKUP_PATH);
  assert.equal(findBackup(["index.html", "products/index.html"]), null);
});

test("the restore plan: what the backup holds, what it replaces, every key it writes and removes", () => {
  const parsed = parseBackup(doc());
  const current = {
    "ideeza:manual:projects": JSON.stringify([{ id: "p9", name: "Old", createdAt: 1 }]),
    "ideeza:create:credits": "{}",
    "ideeza-theme": "dark",
    "other-app": "keep me",
  };
  const plan = restorePlan(parsed.backup, current);
  assert.equal(plan.madeAt, Date.UTC(2026, 9, 19, 9, 30));
  assert.equal(plan.holds.product, "2 projects");
  assert.equal(plan.replaces.product, "1 project");
  assert.equal(plan.holds.message, "1 conversation");
  assert.equal(plan.files, 1);
  assert.deepEqual(Object.keys(plan.writes).sort(), ["ideeza:manual:projects", "ideeza:messages", "ideeza:settings"]);
  assert.deepEqual(plan.removes.sort(), ["ideeza-theme", "ideeza:create:credits"], "IDEEZA keys the backup doesn't have go; other sites' keys stay");
  assert.equal(plan.empty, false);
  assert.equal(restorePlan(parseBackup(doc({ localStorage: {}, indexedDB: [] })).backup, {}).empty, true);
});
