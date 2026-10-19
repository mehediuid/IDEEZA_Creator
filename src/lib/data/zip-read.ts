// Reads a .zip back (Settings › AI & your data › Restore from a backup): the
// one Download makes (zip.ts, every file stored), and the same files after
// someone unzipped and re-zipped them with Finder, Windows or `zip`, which
// deflate them and may put a folder round them. Deflate is undone with the
// browser's own DecompressionStream, so there is no dependency. Every file's
// CRC-32 is checked; ZIP64, encrypted and other methods are refused.
// Relative imports only (node:test loads it).

import { crc32 } from "./zip";

export type ZipReadErrorCode = "not-zip" | "damaged" | "unsupported";

export class ZipReadError extends Error {
  constructor(readonly code: ZipReadErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ZipReadError";
  }
}

export type ZipListing = {
  name: string;
  /** 0 stored, 8 deflated. */
  method: number;
  crc: number;
  compressedSize: number;
  size: number;
  /** Where the local header starts. */
  offset: number;
};

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

function findEnd(view: DataView): number {
  // The end record is 22 bytes plus a comment of at most 65,535.
  const last = view.byteLength - 22;
  const first = Math.max(0, last - 0xffff);
  for (let at = last; at >= first; at--) {
    if (view.getUint32(at, true) === EOCD && at + 22 + view.getUint16(at + 20, true) === view.byteLength) return at;
  }
  return -1;
}

/** The files in the archive, from its central directory. Folders are left out. */
export function listZip(bytes: Uint8Array): ZipListing[] {
  if (bytes.length < 22) throw new ZipReadError("not-zip");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = findEnd(view);
  if (end < 0) throw new ZipReadError("not-zip");
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) throw new ZipReadError("unsupported", "ZIP64");
  if (start + size > end) throw new ZipReadError("not-zip");
  const utf8 = new TextDecoder("utf-8");
  const latin = new TextDecoder("latin1");
  const out: ZipListing[] = [];
  let at = start;
  for (let i = 0; i < count; i++) {
    if (at + 46 > end || view.getUint32(at, true) !== CENTRAL) throw new ZipReadError("not-zip");
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const compressedSize = view.getUint32(at + 20, true);
    const fileSize = view.getUint32(at + 24, true);
    const nameLen = view.getUint16(at + 28, true);
    const extraLen = view.getUint16(at + 30, true);
    const commentLen = view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const raw = bytes.subarray(at + 46, at + 46 + nameLen);
    const name = (flags & 0x0800 ? utf8 : latin).decode(raw);
    at += 46 + nameLen + extraLen + commentLen;
    if (flags & 0x0001) throw new ZipReadError("unsupported", "encrypted");
    if (name.endsWith("/")) continue;
    if (method !== 0 && method !== 8) throw new ZipReadError("unsupported", `method ${method}`);
    out.push({ name, method, crc, compressedSize, size: fileSize, offset });
  }
  return out;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") throw new ZipReadError("unsupported", "no DecompressionStream");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** One file's bytes, its CRC-32 checked. */
export async function readEntry(bytes: Uint8Array, e: ZipListing): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (e.offset + 30 > bytes.length || view.getUint32(e.offset, true) !== LOCAL) throw new ZipReadError("damaged");
  const dataAt = e.offset + 30 + view.getUint16(e.offset + 26, true) + view.getUint16(e.offset + 28, true);
  if (dataAt + e.compressedSize > bytes.length) throw new ZipReadError("damaged");
  const data = bytes.subarray(dataAt, dataAt + e.compressedSize);
  let out: Uint8Array;
  try {
    out = e.method === 0 ? data : await inflateRaw(data);
  } catch (err) {
    if (err instanceof ZipReadError) throw err;
    throw new ZipReadError("damaged");
  }
  if (out.length !== e.size || crc32(out) !== e.crc) throw new ZipReadError("damaged");
  return out;
}

/** Every file, by name, in archive order. */
export async function readZipFiles(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const e of listZip(bytes)) out.set(e.name, await readEntry(bytes, e));
  return out;
}
