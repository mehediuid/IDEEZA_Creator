// Brief module — a real QR encoder, in-house.
//
// Step 4 prints a code that points at the minted listing, so the code has to
// actually scan: a picture of a QR grid would be a stub with a camera pointed
// at it. This is byte mode, error-correction level M, versions 1–10 (213 bytes
// of URL, well past anything the app produces).
//
// One fixed mask (pattern 0) is used and the format bits are written to match
// it. Mask selection by penalty score only affects how easily a scanner locks
// on, never validity, so it is deliberately left out rather than half-done.

// [ecCodewordsPerBlock, group1Blocks, group1DataCodewords, group2Blocks, group2DataCodewords]
const EC_M: readonly [number, number, number, number, number][] = [
  [10, 1, 16, 0, 0], // v1
  [16, 1, 28, 0, 0], // v2
  [26, 1, 44, 0, 0], // v3
  [18, 2, 32, 0, 0], // v4
  [24, 2, 43, 0, 0], // v5
  [16, 4, 27, 0, 0], // v6
  [18, 4, 31, 0, 0], // v7
  [22, 2, 38, 2, 39], // v8
  [22, 3, 36, 2, 37], // v9
  [26, 4, 43, 1, 44], // v10
];

// Byte-mode payload each version holds at ECC M (data codewords minus the
// mode + character-count header).
const BYTE_CAPACITY = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

// Row/column centres of the alignment patterns, per version.
const ALIGNMENT: readonly number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const MASK = 0; // (x + y) % 2 === 0
const ECC_M_FORMAT_BITS = 0b00; // L=01, M=00, Q=11, H=10

// ---------------------------------------------------------------- GF(256) --
// Arithmetic for the Reed–Solomon codewords, over the QR field (generator
// polynomial x^8 + x^4 + x^3 + x^2 + 1 = 0x11d, primitive element 2).
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

// Generator polynomial for `degree` error-correction codewords.
function rsGenerator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: Uint8Array, degree: number): Uint8Array {
  const gen = rsGenerator(degree);
  const rem = new Uint8Array(degree);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[degree - 1] = 0;
    for (let i = 0; i < degree; i++) rem[i] ^= gfMul(gen[i + 1], factor);
  }
  return rem;
}

// ---------------------------------------------------------------- encoding --
function toUtf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i) as number;
    if (code > 0xffff) i++; // surrogate pair consumed
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return out;
}

function pickVersion(byteLength: number): number {
  for (let v = 1; v <= 10; v++) {
    if (byteLength <= BYTE_CAPACITY[v - 1]) return v;
  }
  throw new Error(
    `QR: ${byteLength} bytes exceeds the ${BYTE_CAPACITY[9]}-byte capacity of version 10 (ECC M)`,
  );
}

function dataCodewordCount(version: number): number {
  const [, b1, d1, b2, d2] = EC_M[version - 1];
  return b1 * d1 + b2 * d2;
}

// Mode indicator + character count + payload + terminator + pad codewords.
function buildDataCodewords(bytes: number[], version: number): Uint8Array {
  const capacity = dataCodewordCount(version) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4); // byte mode
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  for (let i = 0; i < 4 && bits.length < capacity; i++) bits.push(0); // terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    out.push(byte);
  }
  for (let pad = 0xec; out.length < capacity / 8; pad ^= 0xec ^ 0x11) out.push(pad);
  return Uint8Array.from(out);
}

// Split into blocks, append each block's EC codewords, then interleave both.
function interleave(data: Uint8Array, version: number): Uint8Array {
  const [ecLen, b1, d1, b2, d2] = EC_M[version - 1];
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  const add = (count: number, size: number) => {
    for (let i = 0; i < count; i++) {
      const block = data.subarray(offset, offset + size);
      offset += size;
      dataBlocks.push(block);
      ecBlocks.push(rsRemainder(block, ecLen));
    }
  };
  add(b1, d1);
  add(b2, d2);

  const out: number[] = [];
  const maxData = Math.max(d1, d2);
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return Uint8Array.from(out);
}

// ------------------------------------------------------------- the matrix --
type Grid = { size: number; m: Uint8Array[]; fn: Uint8Array[] };

function newGrid(size: number): Grid {
  const m: Uint8Array[] = [];
  const fn: Uint8Array[] = [];
  for (let i = 0; i < size; i++) {
    m.push(new Uint8Array(size));
    fn.push(new Uint8Array(size));
  }
  return { size, m, fn };
}

function setFn(g: Grid, x: number, y: number, dark: boolean) {
  if (x < 0 || y < 0 || x >= g.size || y >= g.size) return;
  g.m[y][x] = dark ? 1 : 0;
  g.fn[y][x] = 1;
}

const bitAt = (value: number, i: number) => ((value >>> i) & 1) !== 0;

// Finder plus its separator ring: the 5-wide dark/light/dark rings, with the
// ring at Chebyshev distance 4 left light as the separator.
function drawFinder(g: Grid, cx: number, cy: number) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFn(g, cx + dx, cy + dy, dist !== 2 && dist !== 4);
    }
  }
}

function drawAlignment(g: Grid, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFn(g, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFormatBits(g: Grid) {
  const data = (ECC_M_FORMAT_BITS << 3) | MASK;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = (((data << 10) | rem) ^ 0x5412) & 0x7fff;

  for (let i = 0; i <= 5; i++) setFn(g, 8, i, bitAt(bits, i));
  setFn(g, 8, 7, bitAt(bits, 6));
  setFn(g, 8, 8, bitAt(bits, 7));
  setFn(g, 7, 8, bitAt(bits, 8));
  for (let i = 9; i < 15; i++) setFn(g, 14 - i, 8, bitAt(bits, i));

  for (let i = 0; i < 8; i++) setFn(g, g.size - 1 - i, 8, bitAt(bits, i));
  for (let i = 8; i < 15; i++) setFn(g, 8, g.size - 15 + i, bitAt(bits, i));
  setFn(g, 8, g.size - 8, true); // the dark module
}

function drawVersionBits(g: Grid, version: number) {
  if (version < 7) return;
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i++) {
    const dark = bitAt(bits, i);
    const a = g.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFn(g, a, b, dark);
    setFn(g, b, a, dark);
  }
}

function drawFunctionPatterns(g: Grid, version: number) {
  // Timing patterns first — finders and alignment overwrite where they meet.
  for (let i = 0; i < g.size; i++) {
    setFn(g, 6, i, i % 2 === 0);
    setFn(g, i, 6, i % 2 === 0);
  }
  drawFinder(g, 3, 3);
  drawFinder(g, g.size - 4, 3);
  drawFinder(g, 3, g.size - 4);

  const centres = ALIGNMENT[version - 1];
  const last = centres.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      // The three finder corners have no alignment pattern.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0))
        continue;
      drawAlignment(g, centres[i], centres[j]);
    }
  }

  drawFormatBits(g);
  drawVersionBits(g, version);
}

// Zigzag up/down two-column strips, right to left, skipping the vertical timing
// column. Bits past the payload are the remainder bits and stay light.
function drawCodewords(g: Grid, codewords: Uint8Array) {
  let i = 0;
  for (let right = g.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < g.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? g.size - 1 - vert : vert;
        if (!g.fn[y][x] && i < codewords.length * 8) {
          g.m[y][x] = bitAt(codewords[i >>> 3], 7 - (i & 7)) ? 1 : 0;
          i++;
        }
      }
    }
  }
}

function applyMask(g: Grid) {
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) {
      if (!g.fn[y][x] && (x + y) % 2 === 0) g.m[y][x] ^= 1;
    }
  }
}

/** The QR modules for `text` — `true` is a dark module, indexed [row][col]. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = toUtf8Bytes(text);
  const version = pickVersion(bytes.length);
  const codewords = interleave(buildDataCodewords(bytes, version), version);

  const g = newGrid(21 + 4 * (version - 1));
  drawFunctionPatterns(g, version);
  drawCodewords(g, codewords);
  applyMask(g);

  return g.m.map((row) => Array.from(row, (v) => v === 1));
}

/** Modules of quiet zone around the symbol — the spec's minimum. */
const QUIET = 4;

/**
 * One SVG path covering every dark module, plus the 4-module quiet zone the
 * spec requires (so the returned `size` can be used as the viewBox directly and
 * the code scans without the caller adding padding).
 */
export function qrSvgPath(
  text: string,
  moduleSize = 4,
): { path: string; size: number } {
  const matrix = qrMatrix(text);
  const size = (matrix.length + QUIET * 2) * moduleSize;
  let path = "";
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix.length; x++) {
      if (!matrix[y][x]) continue;
      const px = (x + QUIET) * moduleSize;
      const py = (y + QUIET) * moduleSize;
      path += `M${px} ${py}h${moduleSize}v${moduleSize}h${-moduleSize}z`;
    }
  }
  return { path, size };
}
