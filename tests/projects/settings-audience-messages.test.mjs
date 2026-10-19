// Settings › Audience in Messages (spec 2026-10-19-settings-design.md §5.10, D13): who can
// message you (Anyone · People you work with or who own a copy or hold a share · No one new),
// quiet mode holding back new requests, hidden words on Requests, a reply that no longer
// accepts, and a reported message kept with its report.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_MESSAGES, ME } from "../../.tmp-test/lib/messages/types.js";
import { normalizeMessages } from "../../.tmp-test/lib/messages/normalize.js";
import {
  addReport,
  canStart,
  countsFor,
  createDirect,
  edit,
  hiddenRequestCount,
  listFor,
  patchMember,
  remove,
  reportEvidenceOf,
  requestHidden,
  send,
  setAllowNew,
  startRefusalOf,
} from "../../.tmp-test/lib/messages/rules.js";
import { personOf, workTieOf, MAKER_NAME } from "../../.tmp-test/lib/messages/people.js";

const LAMP = { kind: "project", projectId: "proj_lamp", name: "Smart Lamp" };
const POST = { kind: "post", slug: "solar-rover", title: "Solar Rover" };
const YOU = { id: ME, name: MAKER_NAME };
const LEO = { id: "buyer-leo", name: "Leo" };
const T0 = Date.UTC(2026, 9, 19, 10, 0);
const draft = (text) => ({ text, files: [], cards: [] });
const noTeam = () => [];
const nameOf = (pid) => personOf(pid, { teams: [], creators: [] }).name;

/** Leo writes to you first, about a post: a request. */
function leoAsks(data = EMPTY_MESSAGES, text = "Hi, can I get a kit?") {
  const made = createDirect(data, { id: "cnv_leo", subject: POST, from: LEO, to: YOU, folder: "requests", now: T0 });
  const sent = send(made.data, { conversationId: "cnv_leo", from: LEO.id, draft: draft(text), context: { kind: "post" }, now: T0, id: "m_leo", contextId: "x_leo" });
  assert.equal(sent.ok, true);
  return sent.value.data;
}

const tiedTo = (people) => ({ tied: (a, b) => (b === ME && people.includes(a)) || (a === ME && people.includes(b)) });

test("the stored rule takes No one new; anything else unknown is dropped", () => {
  const data = normalizeMessages({ v: 1, conversations: [], entries: [], blocks: [], reports: [], settings: { me: { allowNew: "nobody" }, x: { allowNew: "friends" } } });
  assert.deepEqual(data.settings, { me: { allowNew: "nobody" } });
});

test("People you work with or who own a copy or hold a share: a tie lets a post start in, a stranger is refused", () => {
  const strict = setAllowNew(EMPTY_MESSAGES, ME, "known");
  assert.deepEqual(canStart(strict, LEO.id, ME, { kind: "post" }), { ok: false, reason: "knownOnly" });
  assert.deepEqual(canStart(strict, LEO.id, ME, { kind: "post" }, tiedTo([LEO.id])), { ok: true, folder: "inbox" });
  // A question about your listing still reaches you.
  assert.deepEqual(canStart(strict, LEO.id, ME, { kind: "listing" }), { ok: true, folder: "inbox" });
});

test("a tie lands in the Inbox even under Anyone", () => {
  assert.deepEqual(canStart(EMPTY_MESSAGES, LEO.id, ME, { kind: "post" }), { ok: true, folder: "requests" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, LEO.id, ME, { kind: "post" }, tiedTo([LEO.id])), { ok: true, folder: "inbox" });
});

test("No one new: only someone you already have a conversation with may start another", () => {
  const closed = setAllowNew(EMPTY_MESSAGES, ME, "nobody");
  assert.deepEqual(canStart(closed, LEO.id, ME, { kind: "listing" }), { ok: false, reason: "closed" });
  assert.deepEqual(canStart(closed, LEO.id, ME, { kind: "post" }, tiedTo([LEO.id])), { ok: false, reason: "closed" });
  // Leo's request that you never accepted doesn't count; one you accepted does.
  const asked = setAllowNew(leoAsks(), ME, "nobody");
  assert.equal(canStart(asked, LEO.id, ME, { kind: "listing" }).ok, false);
  const accepted = patchMember(asked, "cnv_leo", ME, { folder: "inbox" });
  assert.deepEqual(canStart(accepted, LEO.id, ME, { kind: "listing" }), { ok: true, folder: "inbox" });
  // A deleted request doesn't either.
  const declined = patchMember(accepted, "cnv_leo", ME, { declined: true });
  assert.equal(canStart(declined, LEO.id, ME, { kind: "listing" }).ok, false);
});

test("quiet mode: no new request reaches you; a known start still does", () => {
  const quiet = { quiet: (p) => p === ME };
  assert.deepEqual(canStart(EMPTY_MESSAGES, LEO.id, ME, { kind: "post" }, quiet), { ok: false, reason: "quiet" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, LEO.id, ME, { kind: "listing" }, quiet), { ok: true, folder: "inbox" });
  assert.deepEqual(canStart(EMPTY_MESSAGES, LEO.id, ME, { kind: "post" }, { ...quiet, ...tiedTo([LEO.id]) }), { ok: true, folder: "inbox" });
  // Someone else's quiet mode is theirs.
  assert.deepEqual(canStart(EMPTY_MESSAGES, ME, LEO.id, { kind: "post" }, quiet), { ok: true, folder: "requests" });
});

test("refusals say why, and never call you 'You' to someone else", () => {
  assert.equal(startRefusalOf("closed", "Mira"), "Mira only takes messages from people they already talk to.");
  assert.equal(startRefusalOf("quiet", "Mira"), "Mira has paused new message requests for now.");
  assert.equal(startRefusalOf("knownOnly", "Mira"), "Mira only takes messages from people they work with or who own a copy or hold a share.");
  assert.equal(startRefusalOf("knownOnly", MAKER_NAME), "This creator only takes messages from people they work with or who own a copy or hold a share.");
  assert.equal(startRefusalOf("blocked", MAKER_NAME), "You can't message this creator.");
});

test("replying to a request doesn't accept it: it stays in Requests until Accept", () => {
  const data = leoAsks();
  const reply = send(data, { conversationId: "cnv_leo", from: ME, draft: draft("Which kit?"), context: null, now: T0 + 60_000, id: "m_me", contextId: "x_me" });
  assert.equal(reply.ok, true);
  const c = reply.value.data.conversations[0];
  assert.equal(c.state[ME].folder, "requests");
  assert.equal(listFor(reply.value.data, ME, { tab: "requests", filter: "all", teamIdsOf: noTeam, nameOf }).length, 1);
  assert.equal(listFor(reply.value.data, ME, { tab: "inbox", filter: "all", teamIdsOf: noTeam, nameOf }).length, 0);
  // Nothing changes for Leo either.
  assert.equal(c.state[LEO.id].folder, data.conversations[0].state[LEO.id].folder);
  const accepted = patchMember(reply.value.data, "cnv_leo", ME, { folder: "inbox" });
  assert.equal(listFor(accepted, ME, { tab: "inbox", filter: "all", teamIdsOf: noTeam, nameOf }).length, 1);
});

test("hidden words: a request that uses one leaves Requests and its count, and can be shown again", () => {
  const data = leoAsks(EMPTY_MESSAGES, "Want a free #KIT?");
  const c = data.conversations[0];
  assert.equal(requestHidden(data, c, ME, ["kit"]), true);
  assert.equal(requestHidden(data, c, ME, ["#kit"]), true);
  assert.equal(requestHidden(data, c, ME, ["kits"]), false);
  assert.equal(requestHidden(data, c, LEO.id, ["kit"]), false, "the writer still sees it");
  const base = { tab: "requests", filter: "all", teamIdsOf: noTeam, nameOf, hiddenWords: ["kit"] };
  assert.equal(listFor(data, ME, base).length, 0);
  const shown = listFor(data, ME, { ...base, showHidden: true });
  assert.equal(shown.length, 1);
  assert.equal(shown[0].wordHidden, true);
  assert.deepEqual(countsFor(data, ME, noTeam, ["kit"]), { unread: 0, requests: 0 });
  assert.deepEqual(countsFor(data, ME, noTeam), { unread: 0, requests: 1 });
  assert.equal(hiddenRequestCount(data, ME, ["kit"]), 1);
  // Once accepted it is an Inbox conversation and words no longer hide it.
  const accepted = patchMember(data, "cnv_leo", ME, { folder: "inbox" });
  assert.equal(requestHidden(accepted, accepted.conversations[0], ME, ["kit"]), false);
  assert.equal(listFor(accepted, ME, { ...base, tab: "inbox" }).length, 1);
});

test("a reported message is kept with the report: its sender's later delete or edit doesn't change it", () => {
  const data = leoAsks(EMPTY_MESSAGES, "Send 50 USDT to my wallet first");
  const withFile = {
    ...data,
    entries: data.entries.map((e) => (e.id === "m_leo" ? { ...e, files: [{ key: "file_1", name: "a.png", type: "image/png", size: 10 }] } : e)),
  };
  const reported = addReport(withFile, { id: "rep_1", by: ME, conversationId: "cnv_leo", entryId: "m_leo", reason: "scam", note: "", at: T0 + 1000 });
  const ev = reportEvidenceOf(reported, "m_leo", ME);
  assert.equal(ev.text, "Send 50 USDT to my wallet first");
  assert.equal(ev.from, LEO.id);
  assert.deepEqual(ev.files.map((f) => f.key), ["file_1"]);
  assert.equal(reportEvidenceOf(reported, "m_leo", LEO.id), null, "only the reporter reads it");

  const edited = edit(reported, { entryId: "m_leo", by: LEO.id, text: "Never mind", now: T0 + 2000 });
  assert.equal(reportEvidenceOf(edited.value, "m_leo", ME).text, "Send 50 USDT to my wallet first");

  const gone = remove(edited.value, { entryId: "m_leo", by: LEO.id, now: T0 + 3000 });
  assert.equal(gone.ok, true);
  assert.deepEqual(gone.value.fileKeys, [], "the reported photo stays in storage");
  assert.equal(reportEvidenceOf(gone.value.data, "m_leo", ME).text, "Send 50 USDT to my wallet first");

  // The evidence survives a reload.
  const again = normalizeMessages(JSON.parse(JSON.stringify(gone.value.data)));
  assert.equal(reportEvidenceOf(again, "m_leo", ME).text, "Send 50 USDT to my wallet first");
  assert.equal(again.reports[0].evidence.files[0].key, "file_1");
});

test("an unreported message still loses its files on delete", () => {
  const data = leoAsks();
  const withFile = { ...data, entries: data.entries.map((e) => (e.id === "m_leo" ? { ...e, files: [{ key: "file_2", name: "b.png", type: "image/png", size: 10 }] } : e)) };
  const gone = remove(withFile, { entryId: "m_leo", by: LEO.id, now: T0 + 1 });
  assert.deepEqual(gone.value.fileKeys, ["file_2"]);
});

test("how someone works with you: on a team first, then a share, then a copy", () => {
  const sales = [
    { projectId: "proj_lamp", buyerId: "buyer-mira", at: T0, item: { nft: "physical", productName: "Lamp" } },
    { projectId: "proj_lamp", buyerId: "buyer-sam", at: T0, item: { nft: "main", sharePct: 10 } },
    { projectId: "proj_lamp", buyerId: "buyer-sam", at: T0 + 1, item: { nft: "virtual", productName: "Lamp" } },
  ];
  const teams = [{ projectId: "proj_lamp", projectName: "Smart Lamp", members: [{ id: "ctb_rafi", name: "Rafi", role: "Editor" }] }];
  assert.equal(workTieOf("ctb_rafi", { sales, teams }), "team");
  assert.equal(workTieOf("buyer-sam", { sales, teams }), "share");
  assert.equal(workTieOf("buyer-mira", { sales, teams }), "copy");
  assert.equal(workTieOf("buyer-leo", { sales, teams }), null);
  assert.equal(workTieOf(ME, { sales, teams }), null);
});
