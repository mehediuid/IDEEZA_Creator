// A .zip writer with no dependency (Settings › Personal Data, spec §5.12):
// every file is "stored" (method 0, no compression), which every unzip tool,
// Finder and Windows Explorer open. Names are UTF-8 (general-purpose flag bit
// 11), so a Bangla project name survives. No ZIP64: the archive is refused
// past 65,535 files or 4 GB, which a browser could not hold anyway.
// Pure; relative imports only (node:test loads it).

export type ZipEntry = { name: string; data: Uint8Array | string; modified?: Date };

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (IEEE 802.3), as zip stores it. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** The MS-DOS date and time zip headers carry: local clock, two-second steps, from 1980. */
export function dosDateTime(d: Date): { date: number; time: number } {
  if (d.getFullYear() < 1980) return { date: (1 << 5) | 1, time: 0 };
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  return { date, time };
}

const UTF8 = 0x0800;
const VERSION = 20;
const MAX_U32 = 0xffffffff;

function safeName(name: string): string {
  const parts = name.split("/");
  if (!name || name.startsWith("/") || name.includes("\\") || parts.some((p) => p === ".." || p === "." || p === "")) {
    throw new Error(`Not a relative path inside the archive: ${name}`);
  }
  return name;
}

/** The archive's bytes. `now` dates every entry without its own `modified`. */
export function makeZip(entries: readonly ZipEntry[], now: Date = new Date()): Uint8Array {
  if (entries.length > 0xffff) throw new Error("Too many files for one zip.");
  const enc = new TextEncoder();
  const seen = new Set<string>();
  const items = entries.map((e) => {
    const name = safeName(e.name);
    if (seen.has(name)) throw new Error(`The same name is used twice: ${name}`);
    seen.add(name);
    const nameBytes = enc.encode(name);
    const data = typeof e.data === "string" ? enc.encode(e.data) : e.data;
    return { nameBytes, data, crc: crc32(data), ...dosDateTime(e.modified ?? now) };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const it of items) {
    localSize += 30 + it.nameBytes.length + it.data.length;
    centralSize += 46 + it.nameBytes.length;
  }
  if (localSize + centralSize + 22 > MAX_U32) throw new Error("The archive is over 4 GB.");

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];
  for (const it of items) {
    offsets.push(at);
    view.setUint32(at, 0x04034b50, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, UTF8, true);
    view.setUint16(at + 8, 0, true);
    view.setUint16(at + 10, it.time, true);
    view.setUint16(at + 12, it.date, true);
    view.setUint32(at + 14, it.crc, true);
    view.setUint32(at + 18, it.data.length, true);
    view.setUint32(at + 22, it.data.length, true);
    view.setUint16(at + 26, it.nameBytes.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(it.nameBytes, at + 30);
    out.set(it.data, at + 30 + it.nameBytes.length);
    at += 30 + it.nameBytes.length + it.data.length;
  }
  const centralAt = at;
  items.forEach((it, i) => {
    view.setUint32(at, 0x02014b50, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, VERSION, true);
    view.setUint16(at + 8, UTF8, true);
    view.setUint16(at + 10, 0, true);
    view.setUint16(at + 12, it.time, true);
    view.setUint16(at + 14, it.date, true);
    view.setUint32(at + 16, it.crc, true);
    view.setUint32(at + 20, it.data.length, true);
    view.setUint32(at + 24, it.data.length, true);
    view.setUint16(at + 28, it.nameBytes.length, true);
    // Extra field, comment, disk number, internal and external attributes: all zero.
    view.setUint32(at + 42, offsets[i], true);
    out.set(it.nameBytes, at + 46);
    at += 46 + it.nameBytes.length;
  });
  view.setUint32(at, 0x06054b50, true);
  view.setUint16(at + 8, items.length, true);
  view.setUint16(at + 10, items.length, true);
  view.setUint32(at + 12, at - centralAt, true);
  view.setUint32(at + 16, centralAt, true);
  return out;
}
