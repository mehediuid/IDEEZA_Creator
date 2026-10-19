// Settings › Report: every report this browser sent, from the five places a
// report is kept, newest first, each with what, when, why and its status.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  reportsYouMade,
  normalizeSentReports,
  withSentReport,
  STATUS_RECEIVED,
  STATUS_SENT,
  SENT_MAX,
} = await import("../../.tmp-test/lib/data/reports.js");

const T = Date.UTC(2026, 9, 19, 10, 0);

const names = {
  person: (id) => ({ "feed:ava": "Ava Chen", "buyer-mira": "Mira" })[id] ?? null,
  personHref: (id) => (id === "feed:ava" ? "/creators/ava-chen" : null),
  post: (id) => ({ "sample:1": { title: "Plant monitor", href: "/innovations/plant-monitor" } })[id] ?? null,
};

const sources = {
  profiles: [
    { id: "pr1", by: "me", who: "feed:ava", reason: "copied", note: "Same board as mine", at: T - 3000 },
    { id: "pr2", by: "buyer-mira", who: "me", reason: "spam", note: "", at: T - 100 },
  ],
  posts: ["sample:1", "sample:gone"],
  comments: [
    {
      postId: "sample:1",
      comments: [
        { id: "c1", authorId: "u-bob", body: "Buy followers at spam.example", createdAt: T - 9000 },
        { id: "c2", authorId: "you", body: "Nice", createdAt: T - 8000 },
      ],
      reported: ["c1"],
    },
  ],
  messages: {
    conversations: [
      {
        id: "cv1",
        subject: { kind: "project", projectId: "proj_1", name: "Desk lamp" },
        participants: [
          { id: "me", name: "You" },
          { id: "buyer-mira", name: "Mira" },
        ],
      },
    ],
    entries: [{ id: "e1", conversationId: "cv1", kind: "message", from: "buyer-mira", at: T - 5000, text: "Pay me outside IDEEZA" }],
    reports: [
      { id: "mr1", by: "me", conversationId: "cv1", entryId: "e1", reason: "scam", note: "", at: T - 2000 },
      { id: "mr2", by: "buyer-mira", conversationId: "cv1", reason: "spam", note: "", at: T - 1000 },
    ],
  },
  problems: [{ ref: "R-ABC123", kind: "bug", title: "The PCB won't save", at: T - 1500 }],
};

test("only your own reports, newest first; the ones with no date last", () => {
  const rows = reportsYouMade(sources, names);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["problem:R-ABC123", "message:mr1", "profile:pr1", "post:sample:1", "post:sample:gone", "comment:sample:1:c1"],
  );
});

test("a profile report says whom, why and your note; status is the truth: received, not reviewed", () => {
  const r = reportsYouMade(sources, names).find((x) => x.kind === "profile");
  assert.equal(r.what, "Ava Chen's profile");
  assert.equal(r.href, "/creators/ava-chen");
  assert.equal(r.reason, "Copied someone's work");
  assert.equal(r.note, "Same board as mine");
  assert.equal(r.at, T - 3000);
  assert.equal(r.status, STATUS_RECEIVED);
});

test("a message report names the person and quotes the message", () => {
  const r = reportsYouMade(sources, names).find((x) => x.kind === "message");
  assert.equal(r.what, "A message from Mira about Desk lamp");
  assert.equal(r.quote, "Pay me outside IDEEZA");
  assert.equal(r.reason, "Scam or asks to pay outside IDEEZA");
  assert.equal(r.href, "/messages/cv1");
  assert.equal(r.note, null);
});

test("post and comment reports keep no date or reason: they say so, not a made-up one", () => {
  const rows = reportsYouMade(sources, names);
  const post = rows.find((x) => x.id === "post:sample:1");
  assert.equal(post.what, "The post “Plant monitor”");
  assert.equal(post.href, "/innovations/plant-monitor");
  assert.equal(post.at, null);
  assert.equal(post.reason, null);
  const gone = rows.find((x) => x.id === "post:sample:gone");
  assert.equal(gone.what, "A post that is no longer here");
  assert.equal(gone.href, null);
  const comment = rows.find((x) => x.kind === "comment");
  assert.equal(comment.what, "A comment on “Plant monitor”");
  assert.equal(comment.quote, "Buy followers at spam.example");
  assert.equal(comment.href, "/innovations/plant-monitor#comment-c1");
});

test("a problem report carries its reference and is sent, not reviewed by anyone here", () => {
  const r = reportsYouMade(sources, names).find((x) => x.kind === "problem");
  assert.equal(r.ref, "R-ABC123");
  assert.equal(r.what, "Problem report: The PCB won't save");
  assert.equal(r.reason, "Something's broken");
  assert.equal(r.status, STATUS_SENT);
});

test("nothing anywhere is an empty list", () => {
  assert.deepEqual(reportsYouMade({ profiles: [], posts: [], comments: [], messages: { conversations: [], entries: [], reports: [] }, problems: [] }, names), []);
});

test("sent problem references: junk dropped, one line per reference, newest first, capped", () => {
  assert.deepEqual(normalizeSentReports("x"), []);
  const list = normalizeSentReports([{ ref: "R-1", kind: "bug", title: "A", at: 5 }, { ref: 4 }, { ref: "R-2", kind: "nope", title: "B", at: 9 }]);
  assert.deepEqual(list.map((r) => [r.ref, r.kind]), [["R-2", "other"], ["R-1", "bug"]]);
  let l = [];
  for (let i = 0; i < SENT_MAX + 5; i++) l = withSentReport(l, { ref: `R-${i}`, kind: "idea", title: `t${i}`, at: i });
  assert.equal(l.length, SENT_MAX);
  assert.equal(l[0].ref, `R-${SENT_MAX + 4}`);
  const again = withSentReport(l, { ref: `R-${SENT_MAX + 4}`, kind: "idea", title: "same", at: 999999 });
  assert.equal(again.length, SENT_MAX);
});
