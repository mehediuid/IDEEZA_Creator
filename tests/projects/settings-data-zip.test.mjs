// Settings › AI & your data › Download: the stored (uncompressed) zip writer and its CRC-32.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { crc32, makeZip, dosDateTime } = await import("../../.tmp-test/lib/data/zip.js");

const enc = new TextEncoder();
const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

test("CRC-32 matches the standard check values", () => {
  assert.equal(crc32(new Uint8Array()), 0);
  assert.equal(crc32(enc.encode("a")), 0xe8b7be43);
  assert.equal(crc32(enc.encode("123456789")), 0xcbf43926);
  assert.equal(crc32(enc.encode("The quick brown fox jumps over the lazy dog")), 0x414fa339);
});

test("DOS date and time pack the local clock, two-second steps", () => {
  const { date, time } = dosDateTime(new Date(2026, 9, 19, 14, 5, 31));
  assert.equal(date, ((2026 - 1980) << 9) | (10 << 5) | 19);
  assert.equal(time, (14 << 11) | (5 << 5) | 15);
  // Before 1980 there is no DOS date: it clamps to 1 Jan 1980.
  assert.equal(dosDateTime(new Date(1970, 0, 1)).date, (0 << 9) | (1 << 5) | 1);
});

test("one stored file: local header, data, central directory, end record", () => {
  const when = new Date(2026, 9, 19, 14, 5, 30);
  const zip = makeZip([{ name: "hello.txt", data: "hi" }], when);
  const name = enc.encode("hello.txt");
  // Local file header.
  assert.equal(u32(zip, 0), 0x04034b50);
  assert.equal(u16(zip, 4), 20);
  assert.equal(u16(zip, 6), 0x0800, "UTF-8 names");
  assert.equal(u16(zip, 8), 0, "stored, no compression");
  const { date, time } = dosDateTime(when);
  assert.equal(u16(zip, 10), time);
  assert.equal(u16(zip, 12), date);
  assert.equal(u32(zip, 14), crc32(enc.encode("hi")));
  assert.equal(u32(zip, 18), 2);
  assert.equal(u32(zip, 22), 2);
  assert.equal(u16(zip, 26), name.length);
  assert.equal(u16(zip, 28), 0);
  assert.deepEqual([...zip.slice(30, 30 + name.length)], [...name]);
  const dataAt = 30 + name.length;
  assert.equal(new TextDecoder().decode(zip.slice(dataAt, dataAt + 2)), "hi");
  // Central directory.
  const cd = dataAt + 2;
  assert.equal(u32(zip, cd), 0x02014b50);
  assert.equal(u16(zip, cd + 8), 0x0800);
  assert.equal(u16(zip, cd + 10), 0);
  assert.equal(u32(zip, cd + 16), crc32(enc.encode("hi")));
  assert.equal(u16(zip, cd + 28), name.length);
  assert.equal(u32(zip, cd + 42), 0, "the local header's offset");
  // End of central directory.
  const end = zip.length - 22;
  assert.equal(u32(zip, end), 0x06054b50);
  assert.equal(u16(zip, end + 8), 1);
  assert.equal(u16(zip, end + 10), 1);
  assert.equal(u32(zip, end + 12), 46 + name.length);
  assert.equal(u32(zip, end + 16), cd);
  assert.equal(u16(zip, end + 20), 0);
  assert.equal(zip.length, 30 + name.length + 2 + 46 + name.length + 22);
});

test("unicode names are written as UTF-8 bytes, and offsets follow each entry", () => {
  const files = [
    { name: "profile/নাম.json", data: "{}" },
    { name: "blog/Café ☕/index.html", data: enc.encode("<p>ok</p>") },
  ];
  const zip = makeZip(files, new Date(2026, 0, 1));
  const first = enc.encode(files[0].name);
  assert.equal(u16(zip, 26), first.length);
  assert.deepEqual([...zip.slice(30, 30 + first.length)], [...first]);
  const second = 30 + first.length + 2;
  assert.equal(u32(zip, second), 0x04034b50);
  const end = zip.length - 22;
  assert.equal(u16(zip, end + 10), 2);
  const cd = u32(zip, end + 16);
  assert.equal(u32(zip, cd + 42), 0);
  const secondCd = cd + 46 + first.length;
  assert.equal(u32(zip, secondCd), 0x02014b50);
  assert.equal(u32(zip, secondCd + 42), second);
});

test("an empty zip is just the end record", () => {
  const zip = makeZip([]);
  assert.equal(zip.length, 22);
  assert.equal(u32(zip, 0), 0x06054b50);
});

test("a name used twice, an absolute path or a .. step is refused", () => {
  assert.throws(() => makeZip([{ name: "a.txt", data: "1" }, { name: "a.txt", data: "2" }]), /twice/);
  assert.throws(() => makeZip([{ name: "/etc/a", data: "1" }]), /path/);
  assert.throws(() => makeZip([{ name: "a/../../b", data: "1" }]), /path/);
});

test("the archive opens in the system unzip with every byte intact", (t) => {
  let hasUnzip = true;
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
  } catch {
    hasUnzip = false;
  }
  if (!hasUnzip) return t.skip("no unzip on this machine");
  const dir = mkdtempSync(join(tmpdir(), "ideeza-zip-"));
  try {
    const bin = new Uint8Array(256).map((_, i) => i);
    const zip = makeZip([
      { name: "index.html", data: "<h1>Your information</h1>" },
      { name: "profile/photo.bin", data: bin },
      { name: "নাম/ok.txt", data: "ঠিক আছে" },
    ]);
    writeFileSync(join(dir, "x.zip"), zip);
    const test = execFileSync("unzip", ["-t", join(dir, "x.zip")]).toString();
    assert.match(test, /No errors detected/);
    // macOS's own unzip ignores the UTF-8 flag (it reads names as CP437); Finder's engine,
    // ditto, honours it, as Windows Explorer and Info-ZIP builds with Unicode do.
    if (process.platform === "darwin") execFileSync("ditto", ["-x", "-k", join(dir, "x.zip"), join(dir, "out")]);
    else execFileSync("unzip", ["-q", join(dir, "x.zip"), "-d", join(dir, "out")]);
    assert.deepEqual([...readFileSync(join(dir, "out", "profile", "photo.bin"))], [...bin]);
    assert.equal(readFileSync(join(dir, "out", "নাম", "ok.txt"), "utf8"), "ঠিক আছে");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
