// Help on the phone: the FAQ search (lib/support/faq.ts) and the support thread (lib/support/support-chat.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const { FAQS, searchFaqs } = await import("../../.tmp-test/lib/support/faq.js");
const { normalizeChat, putMessage, CHAT_MAX } = await import("../../.tmp-test/lib/support/support-chat.js");

test("every question is unique and every link is a phone screen", () => {
  assert.equal(new Set(FAQS.map((f) => f.id)).size, FAQS.length);
  for (const f of FAQS) if (f.link) assert.match(f.link.href, /^\/m(\/|$)/);
});

test("an empty search lists everything; every word must match; questions come first", () => {
  assert.equal(searchFaqs(FAQS, "  ").length, FAQS.length);
  const hits = searchFaqs(FAQS, "Credit");
  assert.ok(hits.length > 1);
  assert.equal(hits[0].id, "credits");
  assert.deepEqual(searchFaqs(FAQS, "shipping physical").map((f) => f.id), ["shipping"]);
  assert.equal(searchFaqs(FAQS, "zebra").length, 0);
});

test("the thread keeps good messages, retries a send cut short, and replaces by id", () => {
  const id = "a".repeat(32);
  const list = normalizeChat([{ id, text: "Hi", at: 1, state: "sending" }, { id: "nope", text: "x", at: 1, state: "sent" }, { id: "b".repeat(32), text: " ", at: 2, state: "sent" }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].state, "failed");
  const next = putMessage(list, { ...list[0], state: "sent", ref: "R-AAAAAA" });
  assert.equal(next.length, 1);
  assert.equal(next[0].ref, "R-AAAAAA");
  let long = [];
  for (let i = 0; i < CHAT_MAX + 5; i++) long = putMessage(long, { id: i.toString(16).padStart(32, "0"), text: "m", at: i, state: "sent" });
  assert.equal(long.length, CHAT_MAX);
});
