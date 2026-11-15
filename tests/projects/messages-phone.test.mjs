// The Message tab on the phone (mobile Figma "People · 2026 update", MS-01…51): its addresses,
// a row's unread count, a thread's runs and day breaks, the photos the viewer pages through, a
// reply's quote (the web's send keeps `replyTo` only for a message of the same conversation),
// and the outbox that keeps a message that couldn't go.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MESSAGES, ME } from "../../.tmp-test/lib/messages/types.js";
import { normalizeMessages } from "../../.tmp-test/lib/messages/normalize.js";
import { createDirect, markRead, send } from "../../.tmp-test/lib/messages/rules.js";
import {
  askedListingOf,
  dropOutbox,
  firstNameOf,
  mStartHref,
  mThreadHref,
  normalizeOutbox,
  outboxOf,
  phoneContextLineOf,
  phoneContextSentenceOf,
  phoneHrefOf,
  photosOf,
  putOutbox,
  quoteLineOf,
  quoteOf,
  sameDay,
  startPersonIdOf,
  threadRowsOf,
  unreadCountOf,
} from "../../.tmp-test/lib/messages/phone.js";

const LAMP = { kind: "project", projectId: "proj_lamp", name: "Smart Lamp" };
const MIRA = { id: "buyer-mira", name: "Mira Chen" };
const YOU = { id: ME, name: "You" };
const T0 = new Date(2026, 9, 13, 10, 0).getTime();
const MIN = 60_000;
const draft = (text, extra = {}) => ({ text, files: [], cards: [], ...extra });

function thread() {
  let data = createDirect(EMPTY_MESSAGES, { id: "cnv_1", subject: LAMP, from: MIRA, to: YOU, folder: "inbox", now: T0 }).data;
  const lines = [
    [MIRA.id, 0, "Does it run on a power bank?", { kind: "listing" }],
    [MIRA.id, 2 * MIN, "Any 5 V one?", null],
    [ME, 3 * MIN, "Yes, any 5 V USB bank.", null],
    [MIRA.id, 30 * MIN, "Great, thanks!", null],
  ];
  lines.forEach(([from, ago, text, context], i) => {
    const r = send(data, { conversationId: "cnv_1", from, draft: draft(text), context, now: T0 + ago, id: `m${i + 1}`, contextId: `c${i + 1}` });
    assert.equal(r.ok, true);
    data = r.value.data;
  });
  return data;
}

test("the phone's addresses are the web's under /m", () => {
  assert.equal(phoneHrefOf("/creators/mira-chen"), "/m/creators/mira-chen");
  assert.equal(mThreadHref("cnv_1"), "/m/messages/cnv_1");
  assert.equal(mThreadHref("cnv_1", { kind: "listing" }), "/m/messages/cnv_1?about=listing");
  assert.equal(
    mStartHref({ kind: "direct", to: "buyer-mira", projectId: "p1", about: { kind: "purchase", saleId: "s1" } }),
    "/m/messages/new?to=buyer-mira&project=p1&about=purchase%3As1",
  );
  assert.equal(mStartHref({ kind: "team", projectId: "p1" }), "/m/messages/new?team=p1");
});

test("the phone says Feed where the web says Innovations, and the web's words elsewhere", () => {
  assert.equal(phoneContextLineOf({ kind: "post" }), "Shared to Feed");
  assert.equal(phoneContextSentenceOf({ kind: "post" }), "About the Feed post");
  assert.equal(phoneContextLineOf({ kind: "listing" }), "Asked about the listing");
  assert.equal(phoneContextSentenceOf({ kind: "team" }, { teamRole: "Editor" }), "About the team · Editor");
  assert.equal(phoneContextLineOf(null), "");
});

test("a row counts the messages from others since you last read it", () => {
  const data = thread();
  const c = data.conversations[0];
  // Your reply at 3 min read what came before it.
  assert.equal(unreadCountOf(data, c, ME), 1);
  assert.equal(unreadCountOf(data, c, MIRA.id), 0);
  const unread = { ...data, conversations: [{ ...c, state: { ...c.state, [ME]: { ...c.state[ME], lastReadAt: 0 } } }] };
  assert.equal(unreadCountOf(unread, unread.conversations[0], ME), 3);
  const read = markRead(unread, c.id, ME, T0 + 30 * MIN);
  assert.equal(unreadCountOf(read, read.conversations[0], ME), 0);
});

test("a conversation that began at a listing reads as asked about it", () => {
  const data = thread();
  assert.equal(askedListingOf(data, "cnv_1"), true);
  assert.equal(askedListingOf(data, "cnv_other"), false);
  assert.equal(firstNameOf("Mira Chen"), "Mira");
  assert.equal(firstNameOf("  "), "  ");
});

test("a thread is a day break, the context line, then runs of one sender minutes apart", () => {
  const data = thread();
  const rows = threadRowsOf(data.entries.filter((e) => e.conversationId === "cnv_1"));
  assert.deepEqual(
    rows.map((r) => (r.kind === "run" ? `${r.from}:${r.items.length}` : r.kind)),
    ["day", "context", "buyer-mira:2", "me:1", "buyer-mira:1"],
  );
  const nextDay = send(data, { conversationId: "cnv_1", from: ME, draft: draft("Shipped."), context: null, now: T0 + 26 * 60 * MIN, id: "m9", contextId: "c9" });
  const more = threadRowsOf(nextDay.value.data.entries);
  assert.deepEqual(more.slice(-2).map((r) => r.kind), ["day", "run"]);
});

test("the viewer pages through the conversation's photos; a deleted message's are gone", () => {
  const photo = (key) => ({ key, name: `${key}.jpg`, type: "image/jpeg", size: 10 });
  const pdf = { key: "f3", name: "spec.pdf", type: "application/pdf", size: 10 };
  const entries = [
    { id: "a", conversationId: "c", kind: "message", from: ME, at: 1, text: "", files: [photo("f1"), pdf], cards: [] },
    { id: "b", conversationId: "c", kind: "message", from: ME, at: 2, text: "", files: [photo("f2")], cards: [], deletedAt: 3 },
    { id: "d", conversationId: "c", kind: "message", from: ME, at: 4, text: "", files: [photo("f4")], cards: [] },
  ];
  assert.deepEqual(photosOf(entries).map((p) => p.file.key), ["f1", "f4"]);
});

test("a reply keeps a message of the same conversation and quotes one line of it", () => {
  const data = thread();
  const r = send(data, { conversationId: "cnv_1", from: ME, draft: draft("Only on IDEEZA"), context: null, now: T0 + 40 * MIN, id: "r1", contextId: "x1", replyTo: "m2" });
  assert.equal(r.value.entry.replyTo, "m2");
  const stray = send(data, { conversationId: "cnv_1", from: ME, draft: draft("Hi"), context: null, now: T0 + 41 * MIN, id: "r2", contextId: "x2", replyTo: "nope" });
  assert.equal("replyTo" in stray.value.entry, false);
  const read = normalizeMessages(JSON.parse(JSON.stringify(r.value.data)));
  assert.equal(read.entries.find((e) => e.id === "r1").replyTo, "m2");
  assert.deepEqual(quoteOf(read.entries, "m2"), { from: MIRA.id, line: "Any 5 V one?" });
  assert.equal(quoteOf(read.entries, "c1"), null);
  assert.equal(quoteLineOf({ text: "", files: [], cards: [], deletedAt: 1 }), "Message deleted");
  assert.equal(quoteLineOf({ text: "", files: [{ key: "k", name: "a.png", type: "image/png", size: 1 }], cards: [] }), "A photo");
  assert.equal(quoteLineOf({ text: "First\nsecond", files: [], cards: [] }), "First");
});

test("the outbox keeps what couldn't go, replaces a retry in place and drops what was sent", () => {
  const item = { id: "o1", conversationId: "cnv_1", text: "Here's the link", files: [], cards: [], context: null, at: 5, reason: "You're offline." };
  const two = putOutbox(putOutbox([], item), { ...item, id: "o2", at: 3, conversationId: "cnv_2" });
  assert.equal(two.length, 2);
  assert.equal(putOutbox(two, { ...item, reason: "Storage full" }).find((i) => i.id === "o1").reason, "Storage full");
  assert.deepEqual(outboxOf(two, "cnv_1").map((i) => i.id), ["o1"]);
  assert.deepEqual(dropOutbox(two, "o1").map((i) => i.id), ["o2"]);
  assert.deepEqual(normalizeOutbox(JSON.parse(JSON.stringify(two))), two);
  assert.deepEqual(normalizeOutbox([{ id: "x" }, "junk", null]), []);
  assert.deepEqual(normalizeOutbox("nope"), []);
});

test("a start link's bare Feed creator id is the person feed:<id>; anything else stays as it is", () => {
  const creators = ["c1", "c2"];
  assert.equal(startPersonIdOf("c2", creators), "feed:c2");
  assert.equal(startPersonIdOf("feed:c2", creators), "feed:c2");
  assert.equal(startPersonIdOf(ME, creators), ME);
  assert.equal(startPersonIdOf("buyer-mira", creators), "buyer-mira");
  assert.equal(startPersonIdOf("ctb_rafi", creators), "ctb_rafi");
});

test("sameDay: the quiet-mode line drops the date only for today", () => {
  const morning = new Date(2026, 10, 12, 9, 0).getTime();
  assert.equal(sameDay(morning, new Date(2026, 10, 12, 23, 59).getTime()), true);
  assert.equal(sameDay(morning, new Date(2026, 10, 13, 0, 1).getTime()), false);
});
