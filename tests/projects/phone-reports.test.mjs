// Your reports on the phone (web-vs-phone SET-1): a report's Open goes to the phone's own screen,
// never to a web address — a profile to /m/creators, a conversation to /m/messages, a post to its
// Feed clip (on the comment when the report was about one), and a post that isn't on the Feed to
// its project.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clipIdOfPost, phoneReportHrefOf } from "../../.tmp-test/lib/data/phone-reports.js";

const onFeed = () => true;
const offFeed = () => false;

test("a sample post's clip is its feed id; your own project's is the post id", () => {
  assert.equal(clipIdOfPost("sample:p7"), "p7");
  assert.equal(clipIdOfPost("mine:proj_abc"), "mine:proj_abc");
  assert.equal(clipIdOfPost("sample:"), null);
  assert.equal(clipIdOfPost("other:x"), null);
});

test("a profile opens the creator's phone profile", () => {
  const row = { id: "profile:r1", kind: "profile", href: "/creators/ava-chen" };
  assert.equal(phoneReportHrefOf(row, onFeed), "/m/creators/ava-chen");
  assert.equal(phoneReportHrefOf({ ...row, href: null }, onFeed), null, "a profile that is no longer here opens nothing");
});

test("a conversation opens its phone thread", () => {
  const row = { id: "message:r2", kind: "message", href: "/messages/conv%201" };
  assert.equal(phoneReportHrefOf(row, onFeed), "/m/messages/conv%201");
  assert.equal(phoneReportHrefOf({ ...row, href: "/somewhere" }, onFeed), null);
});

test("a post opens its Feed clip, and its project when it isn't on the Feed", () => {
  const sample = { id: "post:sample:p7", kind: "post", href: "/innovations/air-quality" };
  assert.equal(phoneReportHrefOf(sample, onFeed), "/m/clip/p7");
  assert.equal(phoneReportHrefOf(sample, offFeed), "/m/projects/p7");
  const mine = { id: "post:mine:proj_1", kind: "post", href: "/innovations/lamp-proj1" };
  assert.equal(phoneReportHrefOf(mine, onFeed), "/m/clip/mine%3Aproj_1");
  assert.equal(phoneReportHrefOf(mine, offFeed), "/m/projects/proj_1");
  assert.equal(phoneReportHrefOf({ ...sample, href: null }, onFeed), null, "a post that is no longer here opens nothing");
});

test("a comment opens its post's clip on that comment", () => {
  const seen = [];
  const row = { id: "comment:sample:p7:c-12:a", kind: "comment", href: "/innovations/air-quality#comment-c-12:a" };
  assert.equal(
    phoneReportHrefOf(row, (id) => (seen.push(id), true)),
    "/m/clip/p7?comment=c-12%3Aa",
  );
  assert.deepEqual(seen, ["p7"], "the clip asked about is the post's");
  assert.equal(phoneReportHrefOf(row, offFeed), "/m/projects/p7");
  assert.equal(phoneReportHrefOf({ ...row, href: "/innovations/air-quality" }, onFeed), null, "no comment anchor, no address");
});

test("a problem report has nothing to open, and no row ever opens a web address", () => {
  assert.equal(phoneReportHrefOf({ id: "problem:R-1", kind: "problem", href: null }, onFeed), null);
  const rows = [
    { id: "profile:a", kind: "profile", href: "/creators/x" },
    { id: "message:b", kind: "message", href: "/messages/y" },
    { id: "post:sample:p1", kind: "post", href: "/innovations/z" },
    { id: "comment:mine:p2:c1", kind: "comment", href: "/innovations/w#comment-c1" },
  ];
  for (const r of rows) for (const has of [onFeed, offFeed]) assert.match(phoneReportHrefOf(r, has) ?? "", /^\/m\//, r.id);
});
