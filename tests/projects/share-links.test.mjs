// An Innovations post's Share menu (owner, 2026-11-15): the four networks' share-intent addresses.
// Compiled by tests/projects/tsconfig.json:
//   rm -rf .tmp-test && npx tsc -p tests/projects/tsconfig.json && node --test "tests/projects/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARE_NETWORKS, shareIntentUrl } from "../../.tmp-test/lib/innovations/share-links.js";

const URL_ = "https://ideeza.example/innovations/smart-lamp?x=1&y=2";

test("the menu offers the four networks, in order", () => {
  assert.deepEqual(
    SHARE_NETWORKS.map((n) => n.label),
    ["Share on Facebook", "Share on LinkedIn", "Share on X", "Share on WhatsApp"],
  );
});

test("each network gets its public share address, the post's URL encoded once", () => {
  const enc = encodeURIComponent(URL_);
  assert.equal(shareIntentUrl("facebook", URL_, "Smart Lamp"), `https://www.facebook.com/sharer/sharer.php?u=${enc}`);
  assert.equal(shareIntentUrl("linkedin", URL_, "Smart Lamp"), `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`);
  assert.equal(shareIntentUrl("x", URL_, "Smart Lamp & co"), `https://x.com/intent/tweet?url=${enc}&text=Smart%20Lamp%20%26%20co`);
  assert.equal(shareIntentUrl("whatsapp", URL_, "Smart Lamp"), `https://wa.me/?text=${encodeURIComponent(`Smart Lamp ${URL_}`)}`);
  assert.equal(shareIntentUrl("whatsapp", URL_, ""), `https://wa.me/?text=${enc}`);
});
