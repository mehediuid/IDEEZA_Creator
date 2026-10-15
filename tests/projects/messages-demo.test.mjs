// The demo conversations a first visit finds (lib/messages/demo-seed.ts): three about
// Innovations posts, Mira's listing question when there is a project, where each lands,
// what is unread, and that a browser which has them gets nothing more.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MESSAGES, ME } from "../../.tmp-test/lib/messages/types.js";
import { seedDemoMessages, DEMO_PREFIX } from "../../.tmp-test/lib/messages/demo-seed.js";
import { countsFor, createDirect, directKeyOf, entriesOf, isUnread, listFor, send } from "../../.tmp-test/lib/messages/rules.js";

const NOW = Date.UTC(2026, 9, 13, 12, 0);
const POSTS = [
  { slug: "ar-caption-glasses", title: "AR caption glasses", creator: { id: "c2", name: "Sora Min" } },
  { slug: "desk-occupancy-tracker", title: "Desk occupancy tracker", creator: { id: "c3", name: "Diego Alvarez" } },
  { slug: "hexapod-walking-robot", title: "Hexapod walking robot", creator: { id: "c1", name: "Naim Rahman" } },
  { slug: "e-ink-smartwatch", title: "E-ink smartwatch", creator: { id: "c3", name: "Diego Alvarez" } },
];
const input = (project) => ({ now: NOW, posts: POSTS, project, makerName: "You", buyerName: () => "Mira" });
const noTeams = () => [];
const byKey = (data, key) => data.conversations.find((c) => c.id === `${DEMO_PREFIX}${key}`);
const list = (data, tab) =>
  listFor(data, ME, { tab, filter: "all", teamIdsOf: noTeams, nameOf: (id) => id }).map((r) => r.conversation.id.slice(DEMO_PREFIX.length));

test("a first visit with a project: three post conversations and Mira's listing question", () => {
  const data = seedDemoMessages(EMPTY_MESSAGES, input({ id: "proj_lamp", name: "Smart Lamp" }));
  assert.equal(data.conversations.length, 4);
  assert.deepEqual(list(data, "inbox"), ["mira", "diego", "sora"]);
  assert.deepEqual(list(data, "requests"), ["naim"]);
  assert.deepEqual(countsFor(data, ME, noTeams), { unread: 2, requests: 1 });
  assert.equal(isUnread(data, byKey(data, "sora"), ME), false, "your last line reads it");
  assert.equal(isUnread(data, byKey(data, "diego"), ME), true, "Diego answered after you");

  const mira = byKey(data, "mira");
  assert.deepEqual(mira.subject, { kind: "project", projectId: "proj_lamp", name: "Smart Lamp" });
  assert.deepEqual(mira.participants, [{ id: "buyer-mira", name: "Mira" }, { id: ME, name: "You" }]);
  const [context, question] = entriesOf(data, mira.id);
  assert.deepEqual(context.context, { kind: "listing" });
  assert.match(question.text, /^Hi! Does Smart Lamp work without Wi-Fi/);

  const sora = byKey(data, "sora");
  assert.equal(sora.key, directKeyOf({ kind: "post", slug: "ar-caption-glasses", title: "AR caption glasses" }, ME, "feed:c2"));
  assert.deepEqual(entriesOf(data, sora.id).map((e) => (e.kind === "context" ? "context" : e.from)), ["context", ME, "feed:c2", ME]);
  assert.ok(entriesOf(data, sora.id).every((e) => e.at < NOW));
});

test("no project in this browser: the three post conversations only", () => {
  const data = seedDemoMessages(EMPTY_MESSAGES, input(null));
  assert.deepEqual(data.conversations.map((c) => c.id.slice(DEMO_PREFIX.length)).sort(), ["diego", "naim", "sora"]);
});

test("seeded once: a browser that holds them gets nothing more, even with a project now", () => {
  const once = seedDemoMessages(EMPTY_MESSAGES, input(null));
  assert.equal(seedDemoMessages(once, input({ id: "proj_lamp", name: "Smart Lamp" })), null);
});

test("a conversation you already have about the same post is kept, not doubled", () => {
  const subject = { kind: "post", slug: "ar-caption-glasses", title: "AR caption glasses" };
  const made = createDirect(EMPTY_MESSAGES, {
    id: "cnv_mine",
    subject,
    from: { id: ME, name: "You" },
    to: { id: "feed:c2", name: "Sora Min" },
    folder: "inbox",
    now: NOW - 1000,
  });
  const sent = send(made.data, {
    conversationId: "cnv_mine",
    from: ME,
    draft: { text: "Hello Sora", files: [], cards: [] },
    context: { kind: "post" },
    now: NOW - 1000,
    id: "msg_mine",
    contextId: "ctx_mine",
  });
  const data = seedDemoMessages(sent.value.data, input(null));
  assert.equal(data.conversations.filter((c) => c.subject.kind === "post" && c.subject.slug === "ar-caption-glasses").length, 1);
  assert.equal(byKey(data, "sora"), undefined);
  assert.ok(byKey(data, "diego") && byKey(data, "naim"));
});

test("a post that isn't in the feed is skipped", () => {
  const data = seedDemoMessages(EMPTY_MESSAGES, { ...input(null), posts: POSTS.slice(1) });
  assert.deepEqual(data.conversations.map((c) => c.id.slice(DEMO_PREFIX.length)).sort(), ["diego", "naim"]);
  assert.equal(seedDemoMessages(EMPTY_MESSAGES, { ...input(null), posts: [] }), null);
});
