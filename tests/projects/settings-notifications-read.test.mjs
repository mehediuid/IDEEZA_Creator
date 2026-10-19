// Settings › Notification: the bell's read state (spec §5.6). Read keys live in
// `ideeza:notifications:read`; a notice is also read when its source says so (opened in
// Messages, seen in the Blog, whose own seen keys are kept as they are).
import { test } from "node:test";
import assert from "node:assert/strict";

const { NOTICE_READ_KEY, READ_KEYS_MAX, decodeReadKeys, addReadKeys, isNoticeRead, unreadIdsOf } = await import(
  "../../.tmp-test/lib/notifications/read.js"
);

const notice = (id, x = {}) => ({ id, kind: "product", tag: "Ready to review", title: "t", href: "/", at: 1, ...x });

test("the read keys live under their own key and read back safely", () => {
  assert.equal(NOTICE_READ_KEY, "ideeza:notifications:read");
  for (const raw of [undefined, null, "x", 4, {}]) assert.deepEqual(decodeReadKeys(raw), []);
  assert.deepEqual(decodeReadKeys(["a", 3, "", "b", "a"]), ["a", "b"]);
});

test("adding keys keeps the old ones, drops repeats and the oldest past the limit", () => {
  assert.deepEqual(addReadKeys(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
  const full = Array.from({ length: READ_KEYS_MAX }, (_, i) => `k${i}`);
  const next = addReadKeys(full, ["new"]);
  assert.equal(next.length, READ_KEYS_MAX);
  assert.equal(next[0], "k1");
  assert.equal(next[next.length - 1], "new");
  assert.equal(addReadKeys(["a"], []).length, 1);
});

test("a notice is read in the bell, or at its source", () => {
  const keys = new Set(["a"]);
  assert.equal(isNoticeRead(notice("a"), keys), true);
  assert.equal(isNoticeRead(notice("b"), keys), false);
  assert.equal(isNoticeRead(notice("b", { read: true }), keys), true);
});

test("Mark all as read: the ids of every unread notice", () => {
  const list = [notice("a"), notice("b"), notice("c", { read: true })];
  assert.deepEqual(unreadIdsOf(list, new Set(["a"])), ["b"]);
});
