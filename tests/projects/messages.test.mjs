// Messages (spec 2026-10-13-messages-design.md): conversations between the demo people, who may
// start one and where it lands, sending, edit/delete windows, blocks, unread, the list, links,
// the scam hint and the support-request migration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MESSAGES, ME, EDIT_WINDOW_MS, TEXT_MAX } from "../../.tmp-test/lib/messages/types.js";
import { normalizeMessages } from "../../.tmp-test/lib/messages/normalize.js";
import {
  block,
  canEdit,
  canStart,
  countsFor,
  createDirect,
  createTeam,
  dayLabelOf,
  directKeyOf,
  draftError,
  edit,
  entriesOf,
  fileError,
  isUnread,
  latestContextOf,
  listFor,
  markRead,
  patchMember,
  remove,
  send,
  setAllowNew,
  shortTimeOf,
  subjectsFor,
  unblock,
  visibleTo,
} from "../../.tmp-test/lib/messages/rules.js";
import { isRisky } from "../../.tmp-test/lib/messages/risk.js";
import { parseStart, startHref, conversationHref, aboutIn } from "../../.tmp-test/lib/messages/links.js";
import { actingChoices, contextLineOf, personOf, relationOf, sideOf, MAKER_NAME } from "../../.tmp-test/lib/messages/people.js";
import { migrateSupport } from "../../.tmp-test/lib/messages/migrate.js";

const LAMP = { kind: "project", projectId: "proj_lamp", name: "Smart Lamp" };
const POST = { kind: "post", slug: "solar-rover", title: "Solar Rover" };
const MIRA = { id: "buyer-mira", name: "Mira" };
const YOU = { id: ME, name: MAKER_NAME };
const T0 = Date.UTC(2026, 9, 13, 10, 0);
const draft = (text, extra = {}) => ({ text, files: [], cards: [], ...extra });

let n = 0;
const id = (p) => `${p}${++n}`;

function miraAsks(data = EMPTY_MESSAGES, text = "Does it ship with firmware?") {
  const made = createDirect(data, { id: id("cnv_"), subject: LAMP, from: MIRA, to: YOU, folder: "inbox", now: T0 });
  const sent = send(made.data, {
    conversationId: made.conversation.id,
    from: MIRA.id,
    draft: draft(text),
    context: { kind: "listing" },
    now: T0,
    id: id("msg_"),
    contextId: id("ctx_"),
  });
  assert.equal(sent.ok, true);
  return { data: sent.value.data, c: made.conversation };
}

const noTeam = () => [];
const nameOf = (pid) => personOf(pid, { teams: [], creators: [] }).name;

test("a direct conversation is two people and one subject, whoever starts it", () => {
  assert.equal(directKeyOf(LAMP, ME, "buyer-mira"), directKeyOf(LAMP, "buyer-mira", ME));
  assert.notEqual(directKeyOf(LAMP, ME, "buyer-mira"), directKeyOf(POST, ME, "buyer-mira"));
  const { data, c } = miraAsks();
  const again = createDirect(data, { id: "cnv_other", subject: LAMP, from: YOU, to: MIRA, folder: "inbox", now: T0 + 5 });
  assert.equal(again.conversation.id, c.id);
  assert.equal(again.data.conversations.length, 1);
});

test("a listing, a purchase or a team is known and lands in the Inbox; a post from a stranger is a request", () => {
  assert.deepEqual(canStart(EMPTY_MESSAGES, "buyer-mira", ME, { kind: "listing" }), { ok: true, folder: "inbox" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, ME, "buyer-mira", { kind: "purchase", saleId: "s1" }), { ok: true, folder: "inbox" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, ME, "feed:c1", { kind: "post" }), { ok: true, folder: "requests" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, ME, ME, { kind: "listing" }), { ok: false, reason: "self" });
});

test("someone who only takes known people refuses a stranger; someone they wrote to is known", () => {
  const strict = setAllowNew(EMPTY_MESSAGES, "feed:c1", "known");
  assert.deepEqual(canStart(strict, ME, "feed:c1", { kind: "post" }), { ok: false, reason: "knownOnly" });
  // feed:c1 has written to you before (about another post): you're known to them.
  const c = createDirect(strict, { id: "cnv_x", subject: POST, from: { id: "feed:c1", name: "Nadia" }, to: YOU, folder: "requests", now: T0 });
  const sent = send(c.data, { conversationId: "cnv_x", from: "feed:c1", draft: draft("Hi"), context: { kind: "post" }, now: T0, id: "m", contextId: "x" });
  assert.deepEqual(canStart(sent.value.data, ME, "feed:c1", { kind: "post" }), { ok: true, folder: "inbox" });
});

test("a block stops both directions of a start and of a send", () => {
  const { data, c } = miraAsks();
  const blocked = block(data, ME, "buyer-mira", T0);
  assert.deepEqual(canStart(blocked, "buyer-mira", ME, { kind: "listing" }), { ok: false, reason: "blocked" });
  assert.deepEqual(canStart(blocked, ME, "buyer-mira", { kind: "listing" }), { ok: false, reason: "blocked" });
  const r = send(blocked, { conversationId: c.id, from: "buyer-mira", draft: draft("hello?"), context: null, now: T0 + 1, id: "m2", contextId: "c2" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "You can't reply to this conversation.");
  assert.equal(block(blocked, ME, "buyer-mira", T0).blocks.length, 1);
  assert.equal(unblock(blocked, ME, "buyer-mira").blocks.length, 0);
});

test("send writes a context entry only when the context changes", () => {
  const { data, c } = miraAsks();
  assert.deepEqual(latestContextOf(data, c.id), { kind: "listing" });
  const same = send(data, { conversationId: c.id, from: MIRA.id, draft: draft("Also, the case?"), context: { kind: "listing" }, now: T0 + 60_000, id: "m3", contextId: "c3" });
  assert.equal(entriesOf(same.value.data, c.id).filter((e) => e.kind === "context").length, 1);
  const bought = send(same.value.data, {
    conversationId: c.id,
    from: MIRA.id,
    draft: draft("Bought it!"),
    context: { kind: "purchase", saleId: "sale_1" },
    now: T0 + 120_000,
    id: "m4",
    contextId: "c4",
  });
  const kinds = entriesOf(bought.value.data, c.id).map((e) => e.kind);
  assert.deepEqual(kinds, ["context", "message", "message", "context", "message"]);
  assert.deepEqual(latestContextOf(bought.value.data, c.id), { kind: "purchase", saleId: "sale_1" });
});

test("drafts: trimmed text up to the limit, or a file or a card", () => {
  assert.equal(draftError(draft("   ")), "Write a message or attach something.");
  assert.equal(draftError(draft("x".repeat(TEXT_MAX))), null);
  assert.match(draftError(draft("x".repeat(TEXT_MAX + 1))), /at most 2,000 characters/);
  assert.equal(draftError(draft("", { cards: [{ kind: "project", projectId: "p", name: "P" }] })), null);
  assert.equal(fileError({ name: "a.pdf", type: "application/pdf", size: 1000 }), null);
  assert.match(fileError({ name: "board.zip", type: "application/zip", size: 1000 }), /isn't a photo or a PDF/);
  assert.match(fileError({ name: "huge.png", type: "image/png", size: 11 * 1024 * 1024 }), /over 10 MB/);
});

test("own messages can be edited or deleted for 15 minutes, never someone else's", () => {
  const { data, c } = miraAsks();
  const msg = entriesOf(data, c.id).find((e) => e.kind === "message");
  assert.equal(canEdit(msg, MIRA.id, T0 + EDIT_WINDOW_MS), true);
  assert.equal(canEdit(msg, MIRA.id, T0 + EDIT_WINDOW_MS + 1), false);
  assert.equal(canEdit(msg, ME, T0), false);
  const edited = edit(data, { entryId: msg.id, by: MIRA.id, text: "Does it ship with the firmware flashed?", now: T0 + 1000 });
  const after = entriesOf(edited.value, c.id).find((e) => e.id === msg.id);
  assert.equal(after.text, "Does it ship with the firmware flashed?");
  assert.equal(after.editedAt, T0 + 1000);
  const gone = remove(edited.value, { entryId: msg.id, by: MIRA.id, now: T0 + 2000 });
  const deleted = entriesOf(gone.value.data, c.id).find((e) => e.id === msg.id);
  assert.equal(deleted.text, "");
  assert.equal(deleted.deletedAt, T0 + 2000);
  assert.equal(remove(gone.value.data, { entryId: msg.id, by: MIRA.id, now: T0 + 3000 }).ok, false);
  assert.equal(edit(data, { entryId: msg.id, by: ME, text: "hijack", now: T0 }).ok, false);
});

test("unread follows lastReadAt; the badge skips muted and archived; Requests count apart", () => {
  const { data, c } = miraAsks();
  assert.equal(isUnread(data, c, ME), true);
  assert.equal(isUnread(data, c, MIRA.id), false);
  assert.deepEqual(countsFor(data, ME, noTeam), { unread: 1, requests: 0 });
  assert.deepEqual(countsFor(markRead(data, c.id, ME, T0 + 1), ME, noTeam), { unread: 0, requests: 0 });
  assert.deepEqual(countsFor(patchMember(data, c.id, ME, { muted: true }), ME, noTeam), { unread: 0, requests: 0 });
  assert.deepEqual(countsFor(patchMember(data, c.id, ME, { archived: true }), ME, noTeam), { unread: 0, requests: 0 });
  const req = createDirect(EMPTY_MESSAGES, { id: "cnv_r", subject: POST, from: YOU, to: { id: "feed:c1", name: "Nadia" }, folder: "requests", now: T0 });
  const sent = send(req.data, { conversationId: "cnv_r", from: ME, draft: draft("Love the rover"), context: { kind: "post" }, now: T0, id: "m", contextId: "x" });
  assert.deepEqual(countsFor(sent.value.data, "feed:c1", noTeam), { unread: 0, requests: 1 });
});

test("a new message brings an archived conversation back; replying keeps a request in Requests (Settings §5.10)", () => {
  const { data, c } = miraAsks();
  const archived = patchMember(data, c.id, ME, { archived: true });
  const back = send(archived, { conversationId: c.id, from: MIRA.id, draft: draft("Hello again"), context: null, now: T0 + 5, id: "m9", contextId: "c9" });
  assert.equal(back.value.data.conversations[0].state[ME].archived, false);
  const req = createDirect(EMPTY_MESSAGES, { id: "cnv_r", subject: POST, from: YOU, to: { id: "feed:c1", name: "Nadia" }, folder: "requests", now: T0 });
  const reply = send(req.data, { conversationId: "cnv_r", from: "feed:c1", draft: draft("Thanks!"), context: null, now: T0 + 9, id: "m", contextId: "x" });
  assert.equal(reply.value.data.conversations[0].state["feed:c1"].folder, "requests");
});

test("a deleted request disappears for its recipient only", () => {
  const req = createDirect(EMPTY_MESSAGES, { id: "cnv_r", subject: POST, from: YOU, to: { id: "feed:c1", name: "Nadia" }, folder: "requests", now: T0 });
  const declined = patchMember(req.data, "cnv_r", "feed:c1", { declined: true });
  const c = declined.conversations[0];
  assert.equal(visibleTo(c, "feed:c1"), false);
  assert.equal(visibleTo(c, ME), true);
});

test("the team conversation is you and the project's current team", () => {
  const made = createTeam(EMPTY_MESSAGES, { id: "cnv_t", projectId: "proj_lamp", projectName: "Smart Lamp", creatorName: MAKER_NAME, now: T0 });
  const teamIdsOf = (pid) => (pid === "proj_lamp" ? ["ctb_rafi"] : []);
  const sent = send(made.data, { conversationId: "cnv_t", from: "ctb_rafi", draft: draft("PCB v2 is up"), context: null, now: T0 + 1, id: "m", contextId: "x", teamIds: ["ctb_rafi"] });
  assert.equal(sent.ok, true);
  const outsider = send(made.data, { conversationId: "cnv_t", from: "ctb_gone", draft: draft("hi"), context: null, now: T0 + 1, id: "m", contextId: "x", teamIds: ["ctb_rafi"] });
  assert.equal(outsider.ok, false);
  const rows = listFor(sent.value.data, ME, { tab: "inbox", filter: "all", teamIdsOf, nameOf: () => "Rafi" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].preview, "Rafi: PCB v2 is up");
  assert.equal(listFor(sent.value.data, "ctb_gone", { tab: "inbox", filter: "all", teamIdsOf, nameOf }).length, 0);
});

test("the list: newest first, tab, filters, project and search", () => {
  let { data } = miraAsks();
  const leo = createDirect(data, { id: "cnv_leo", subject: { ...LAMP, projectId: "proj_plant", name: "Plant Monitor" }, from: { id: "buyer-leo", name: "Leo" }, to: YOU, folder: "inbox", now: T0 + 10 });
  data = send(leo.data, { conversationId: "cnv_leo", from: "buyer-leo", draft: draft("Ship to Dhaka?"), context: { kind: "listing" }, now: T0 + 10, id: "ml", contextId: "cl" }).value.data;
  const base = { tab: "inbox", filter: "all", teamIdsOf: noTeam, nameOf };
  assert.deepEqual(listFor(data, ME, base).map((r) => r.other.id), ["buyer-leo", "buyer-mira"]);
  assert.equal(listFor(data, ME, { ...base, q: "dhaka" }).length, 1);
  assert.equal(listFor(data, ME, { ...base, q: "smart lamp" })[0].other.id, "buyer-mira");
  assert.equal(listFor(data, ME, { ...base, subjectKey: "p:proj_plant" }).length, 1);
  const read = markRead(data, "cnv_leo", ME, T0 + 11);
  assert.deepEqual(listFor(read, ME, { ...base, filter: "unread" }).map((r) => r.other.id), ["buyer-mira"]);
  assert.equal(listFor(data, MIRA.id, base)[0].preview, "You: Does it ship with firmware?");
  assert.deepEqual(subjectsFor(data, ME, noTeam, () => ME).map((s) => s.name), ["Plant Monitor", "Smart Lamp"]);
});

test("normalize drops broken rows and entries of unknown conversations", () => {
  const { data } = miraAsks();
  const raw = JSON.parse(JSON.stringify(data));
  raw.conversations.push({ id: "bad" });
  raw.entries.push({ id: "orphan", conversationId: "nope", kind: "message", from: ME, at: 1, text: "x" });
  raw.blocks.push({ by: ME });
  const norm = normalizeMessages(raw);
  assert.equal(norm.conversations.length, 1);
  assert.equal(norm.entries.length, data.entries.length);
  assert.equal(norm.blocks.length, 0);
  assert.deepEqual(normalizeMessages("nonsense"), EMPTY_MESSAGES);
  assert.deepEqual(normalizeMessages(data), data);
});

test("the scam hint catches wallets, seed phrases and paying outside", () => {
  assert.equal(isRisky("Send 0.5 ETH to 0x52908400098527886E0F7030069857D2E4169EE7 and I'll ship"), true);
  assert.equal(isRisky("Share your seed phrase so I can verify"), true);
  assert.equal(isRisky("Can you pay me directly instead?"), true);
  assert.equal(isRisky("Let's do a bank transfer"), true);
  assert.equal(isRisky("Message me on WhatsApp for a better price"), true);
  assert.equal(isRisky("The firmware update is on the product page."), false);
  assert.equal(isRisky("Which wallet should I use to buy on IDEEZA?"), false);
});

test("links round-trip every entry point", () => {
  const direct = { kind: "direct", to: ME, projectId: "proj_lamp", about: { kind: "purchase", saleId: "sale_1" } };
  const href = startHref(direct, "buyer-mira");
  assert.equal(href, "/messages/new?to=me&project=proj_lamp&about=purchase%3Asale_1&as=buyer-mira");
  assert.deepEqual(parseStart(new URL(href, "http://x").searchParams), direct);
  const post = { kind: "post", to: "feed:c1", slug: "solar-rover" };
  assert.deepEqual(parseStart(new URL(startHref(post), "http://x").searchParams), post);
  const team = { kind: "team", projectId: "proj_lamp" };
  assert.deepEqual(parseStart(new URL(startHref(team, ME), "http://x").searchParams), team);
  assert.equal(parseStart(new URLSearchParams("to=me&project=p")), null);
  assert.equal(conversationHref("cnv_1", { about: { kind: "listing" } }), "/messages/cnv_1?about=listing");
  assert.equal(aboutIn("purchase:"), null);
});

test("people: names and the Acting as list, with nobody named as a kind of person", () => {
  const teams = [{ projectId: "proj_lamp", projectName: "Smart Lamp", members: [{ id: "ctb_rafi", name: "Rafi Ahmed", role: "Editor" }] }];
  const src = { teams, creators: [{ id: "c1", name: "Nadia Islam" }] };
  assert.equal(personOf(ME, src).name, "You");
  assert.equal(personOf("buyer-leo", src).name, "Leo");
  assert.equal(personOf("buyer-leo", src).initials, "L");
  assert.equal(personOf("ctb_rafi", src).initials, "RA");
  assert.equal(personOf("feed:c1", src).name, "Nadia Islam");
  assert.equal(personOf("ctb_gone", src, [{ id: "ctb_gone", name: "Old Friend" }]).name, "Old Friend");
  const withNadia = createDirect(EMPTY_MESSAGES, { id: "c", subject: POST, from: YOU, to: { id: "feed:c1", name: "Nadia Islam" }, folder: "requests", now: T0 }).data;
  const choices = actingChoices(src, withNadia);
  assert.deepEqual(choices.map((c) => c.id), [ME, "buyer-mira", "buyer-leo", "buyer-sam", "ctb_rafi", "feed:c1"]);
  assert.deepEqual(choices.map((c) => c.label), ["You", "Mira", "Leo", "Sam", "Rafi Ahmed · Smart Lamp team", "Nadia Islam · from Innovations"]);
  assert.equal(choices[1].who, "Mira (demo creator)");
  assert.equal(choices.some((c) => /buyer|customer|maker/i.test(`${c.label} ${c.who} ${c.group}`)), false);
  const sale = { id: "s", at: T0, item: { nft: "physical", productName: "Smart Lamp" } };
  assert.match(contextLineOf({ kind: "purchase", saleId: "s" }, { sale }), /^Physical copy of Smart Lamp · bought Oct 13, 2026$/);
});

test("relationships: what the other creator did with this project, seen from your side", () => {
  const teams = [{ projectId: "proj_lamp", projectName: "Smart Lamp", members: [{ id: "ctb_rafi", name: "Rafi Ahmed", role: "Editor" }] }];
  const sales = [
    { projectId: "proj_lamp", buyerId: "buyer-mira", at: T0, item: { nft: "virtual", productName: "VoxLamp" } },
    { projectId: "proj_lamp", buyerId: "buyer-sam", at: T0, item: { nft: "main", sharePct: 5 } },
    { projectId: "proj_lamp", buyerId: "buyer-sam", at: T0 + 1, item: { nft: "main", sharePct: 5 } },
    { projectId: "proj_lamp", buyerId: "buyer-sam", at: T0 + 2, item: { nft: "physical", productName: "VoxLamp" } },
    { projectId: "proj_lamp", buyerId: "buyer-leo", at: T0, item: { nft: "physical", productName: "VoxLamp" } },
    { projectId: "proj_lamp", buyerId: "buyer-leo", at: T0 + 1, item: { nft: "virtual", productName: "Smart Lamp" } },
  ];
  const ownerOf = (s) => (s.kind === "project" ? ME : "feed:c1");
  const ctx = { sales, teams, ownerOf };
  // You, reading about your own project:
  assert.deepEqual(relationOf(ME, "buyer-mira", LAMP, ctx), { short: "owns a copy", long: "Owns a Virtual copy of VoxLamp" });
  assert.deepEqual(relationOf(ME, "buyer-sam", LAMP, ctx), { short: "holds 10%", long: "Holds 10% of Smart Lamp" });
  assert.deepEqual(relationOf(ME, "buyer-leo", LAMP, ctx), { short: "owns 2 copies", long: "Owns 2 copies from Smart Lamp" });
  assert.deepEqual(relationOf(ME, "ctb_rafi", LAMP, ctx), { short: "Editor", long: "Editor on Smart Lamp" });
  assert.deepEqual(relationOf(ME, "buyer-sam", { ...LAMP, projectId: "other" }, ctx), { short: null, long: null });
  assert.deepEqual(relationOf(ME, "buyer-sam", { ...LAMP, projectId: "other" }, ctx, { askedListing: true }), { short: null, long: "Asked about your listing" });
  // The other side reads you as the one who made it, never as a kind of person:
  assert.deepEqual(relationOf("buyer-mira", ME, LAMP, ctx), { short: "their project", long: "Made Smart Lamp" });
  assert.deepEqual(relationOf("ctb_rafi", ME, LAMP, ctx, { askedListing: true }), { short: "their project", long: "Made Smart Lamp" });
  // A post is its creator's:
  assert.deepEqual(relationOf(ME, "feed:c1", POST, ctx), { short: "their post", long: "Posted Solar Rover" });
  assert.deepEqual(relationOf("feed:c1", ME, POST, ctx), { short: null, long: null });
  assert.equal(sideOf(LAMP, ME, ownerOf), "mine");
  assert.equal(sideOf(LAMP, "buyer-mira", ownerOf), "theirs");
  assert.equal(sideOf(POST, ME, ownerOf), "theirs");
});

test("the list splits into your projects and other creators' projects", () => {
  let { data } = miraAsks();
  const post = createDirect(data, { id: "cnv_post", subject: POST, from: YOU, to: { id: "feed:c1", name: "Nadia" }, folder: "requests", now: T0 + 20 });
  data = send(post.data, { conversationId: "cnv_post", from: ME, draft: draft("Love the rover"), context: { kind: "post" }, now: T0 + 20, id: "mp", contextId: "cp" }).value.data;
  const ownerOf = (s) => (s.kind === "project" ? ME : "feed:c1");
  const base = { tab: "inbox", filter: "all", teamIdsOf: noTeam, nameOf, ownerOf };
  assert.deepEqual(listFor(data, ME, { ...base, side: "mine" }).map((r) => r.conversation.subject.kind), ["project"]);
  assert.deepEqual(listFor(data, ME, { ...base, side: "theirs" }).map((r) => r.conversation.subject.kind), ["post"]);
  assert.equal(listFor(data, ME, base).length, 2);
  assert.deepEqual(subjectsFor(data, ME, noTeam, ownerOf).map((s) => [s.name, s.side]), [["Smart Lamp", "mine"], ["Solar Rover", "theirs"]]);
});

test("support requests migrate once, as the buyer's first message after a purchase context", () => {
  const support = [{ id: "sup_1", saleId: "sale_1", projectId: "proj_lamp", buyerId: "buyer-mira", message: "The LED flickers", at: T0 }];
  const o = { buyerName: () => "Mira", projectName: () => "Smart Lamp", makerName: MAKER_NAME, newId: id };
  const once = migrateSupport(EMPTY_MESSAGES, support, o);
  assert.equal(once.conversations.length, 1);
  const es = entriesOf(once, once.conversations[0].id);
  assert.deepEqual(es.map((e) => e.kind), ["context", "message"]);
  assert.equal(es[1].sourceId, "sup_1");
  assert.equal(es[1].from, "buyer-mira");
  assert.equal(isUnread(once, once.conversations[0], ME), true);
  assert.equal(migrateSupport(once, support, o), null);
});

test("time labels", () => {
  const now = new Date(2026, 9, 13, 15, 0).getTime();
  assert.equal(shortTimeOf(now - 30_000, now), "now");
  assert.equal(shortTimeOf(now - 5 * 60_000, now), "5m");
  assert.equal(shortTimeOf(now - 2 * 3_600_000, now), "2h");
  assert.equal(shortTimeOf(new Date(2026, 9, 12, 9, 0).getTime(), now), "Mon");
  assert.equal(shortTimeOf(new Date(2026, 8, 2).getTime(), now), "2 Sep");
  assert.equal(shortTimeOf(new Date(2025, 8, 2).getTime(), now), "2 Sep 2025");
  assert.equal(dayLabelOf(now, now), "Today");
  assert.equal(dayLabelOf(new Date(2026, 9, 12, 9).getTime(), now), "Yesterday");
});
