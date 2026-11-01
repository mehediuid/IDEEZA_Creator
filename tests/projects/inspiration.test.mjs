// Inspiration image (src/lib/create/inspiration.ts): what the picker takes,
// and what the server will store and send to the generator.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INSPIRATION_HEIGHT,
  INSPIRATION_STRENGTH,
  INSPIRATION_WIDTH,
  parseDataUrl,
  pickProblem,
  sniffType,
} from "../../.tmp-test/lib/create/inspiration.js";

test("the picker takes JPG, PNG and WebP up to 15 MB, and says why not otherwise", () => {
  assert.equal(pickProblem({ type: "image/jpeg", size: 3_000_000 }), null);
  assert.equal(pickProblem({ type: "image/webp", size: 10 }), null);
  assert.match(pickProblem({ type: "image/heic", size: 10 }), /JPG, PNG or WebP/);
  assert.match(pickProblem({ type: "application/pdf", size: 10 }), /isn't a picture/);
  assert.match(pickProblem({ type: "image/png", size: 16 * 1024 * 1024 }), /over 15 MB/);
});

test("only an image data URL is read, and its label is split from its bytes", () => {
  assert.deepEqual(parseDataUrl("data:image/jpeg;base64,/9j/4AA="), { type: "image/jpeg", base64: "/9j/4AA=" });
  assert.equal(parseDataUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(parseDataUrl("data:text/html;base64,PGgxPg=="), null);
  assert.equal(parseDataUrl("https://example.com/a.jpg"), null);
  assert.equal(parseDataUrl(42), null);
});

test("the bytes decide the type, not the label", () => {
  assert.equal(sniffType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(sniffType(webp), "image/webp");
  // An HTML page labelled as a JPEG is not stored.
  assert.equal(sniffType(new TextEncoder().encode("<html><script>")), null);
});

test("the picture is cropped to the concept's own 4:3 frame, and the prompt still leads", () => {
  assert.equal(INSPIRATION_WIDTH * 3, INSPIRATION_HEIGHT * 4);
  assert.ok(INSPIRATION_STRENGTH > 0.5 && INSPIRATION_STRENGTH < 1);
});
