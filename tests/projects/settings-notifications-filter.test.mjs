// Settings › Notifications: what the preferences do to the bell (V5). The bell never deletes a
// record: a kind switched off, a muted project, a bid under the threshold or a notice that uses a
// hidden word is still listed, but makes no pop-up and adds nothing to the count. Messages and
// team conversations count on the Messages badge only. Quiet hours hold the count and the pop-ups
// (sales only when let through); Once a day groups the bell by day; Paused stops every pop-up.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  isHeard,
  countsOnBell,
  bellNotices,
  unreadCount,
  quietWindowStart,
  toastAllowed,
  groupNotices,
  popupModeOf,
  popupModePatch,
  usesHiddenWord,
  maskNotice,
  WORD_HIDDEN,
  RECENT_MS,
  BELL_MAX,
} = await import("../../.tmp-test/lib/notifications/filter.js");
const { DEFAULT_SETTINGS, patchSettings } = await import("../../.tmp-test/lib/settings/prefs.js");

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();

const notice = (x = {}) => ({ id: "n1", kind: "product", tag: "Ready to review", title: "Lamp is ready", href: "/chat/c1", at: at(13, 9), ...x });
const prefs = (patch) => patchSettings(DEFAULT_SETTINGS, "notifications", patch);
const kindOff = (kind) =>
  prefs({ channels: { ...DEFAULT_SETTINGS.notifications.channels, [kind]: { web: false, email: false, mobile: false } } });
const words = (...w) => patchSettings(DEFAULT_SETTINGS, "blocking", { hiddenWords: w });

test("a kind switched off is still listed in the bell, but isn't heard: no count, no pop-up", () => {
  const now = at(13, 12);
  const s = kindOff("product");
  const list = [notice({ id: "build" }), notice({ id: "credits", kind: "coin" })];
  assert.equal(isHeard(list[0], DEFAULT_SETTINGS), true);
  assert.equal(isHeard(list[0], s), false);
  assert.equal(isHeard(list[1], s), true, "another kind is untouched");
  assert.deepEqual(bellNotices(list, new Set(), now).map((n) => n.id), ["build", "credits"], "the bell lists both");
  assert.equal(unreadCount(list, new Set(), s, now), 1);
  assert.equal(toastAllowed(list[0], s, now), false);
  const emailOn = prefs({ channels: { ...DEFAULT_SETTINGS.notifications.channels, product: { web: false, email: true, mobile: true } } });
  assert.equal(isHeard(list[0], emailOn), false, "email and mobile decide nothing in the app");
});

test("a muted project's notices are listed but quiet; the rest are heard", () => {
  const now = at(13, 12);
  const s = prefs({ mutedProjects: ["p1"] });
  const list = [notice({ id: "a", projectId: "p1" }), notice({ id: "b", projectId: "p2" }), notice({ id: "c" })];
  assert.deepEqual(bellNotices(list, new Set(), now).map((n) => n.id).sort(), ["a", "b", "c"]);
  assert.deepEqual(list.filter((n) => isHeard(n, s)).map((n) => n.id), ["b", "c"]);
  assert.equal(unreadCount(list, new Set(), s, now), 2);
  assert.equal(toastAllowed(list[0], s, now), false);
});

test("the bid threshold quiets smaller bids, never a sale; no threshold hears every bid", () => {
  const s = prefs({ bidThreshold: 50 });
  assert.equal(isHeard(notice({ kind: "marketplace", bid: { usd: 20 } }), s), false);
  assert.equal(isHeard(notice({ kind: "marketplace", bid: { usd: 50 } }), s), true, "of $50 or more");
  assert.equal(isHeard(notice({ kind: "marketplace", bid: { usd: 3750 } }), s), true, "1 test ETH at the demo rate");
  assert.equal(isHeard(notice({ kind: "marketplace", bid: { usd: null } }), s), true, "an amount that can't be read is better heard");
  assert.equal(isHeard(notice({ kind: "marketplace", urgent: true }), s), true, "a sale is not a bid");
  assert.equal(isHeard(notice({ kind: "marketplace", bid: { usd: 1 } }), DEFAULT_SETTINGS), true);
});

test("messages and team conversations count on the Messages badge, never the bell; they can still pop up", () => {
  const now = at(13, 12);
  const list = [notice({ id: "m", kind: "message" }), notice({ id: "t", kind: "teams" }), notice({ id: "b" })];
  assert.equal(countsOnBell(list[0], DEFAULT_SETTINGS), false);
  assert.equal(countsOnBell(list[1], DEFAULT_SETTINGS), false);
  assert.equal(countsOnBell(list[2], DEFAULT_SETTINGS), true);
  assert.equal(unreadCount(list, new Set(), DEFAULT_SETTINGS, now), 1);
  assert.equal(bellNotices(list, new Set(), now).length, 3, "listed all the same");
  assert.equal(toastAllowed(list[0], DEFAULT_SETTINGS, now), true);
  assert.equal(toastAllowed(list[0], kindOff("message"), now), false);
});

test("hidden words: a notice that uses one is masked in the bell and isn't heard", () => {
  const s = words("spam", "#drop");
  const body = notice({ kind: "comments", title: "Sam commented on Lamp", body: "Buy SPAM now" });
  const title = notice({ kind: "message", title: "New message from Spam Bot", body: "hi" });
  const tag = notice({ kind: "comments", title: "Ana commented on Lamp", body: "see #drop" });
  const clean = notice({ kind: "comments", title: "Ana commented on Lamp", body: "a spammy name is not the word" });
  assert.equal(usesHiddenWord(body, s.blocking.hiddenWords), true, "any case");
  assert.equal(usesHiddenWord(tag, s.blocking.hiddenWords), true, "a #tag");
  assert.equal(usesHiddenWord(clean, s.blocking.hiddenWords), false, "whole words only");
  assert.deepEqual(maskNotice(body, s.blocking.hiddenWords), { ...body, body: WORD_HIDDEN });
  assert.deepEqual(maskNotice(title, s.blocking.hiddenWords), { ...title, title: WORD_HIDDEN, body: undefined });
  assert.equal(maskNotice(clean, s.blocking.hiddenWords), clean, "untouched");
  assert.equal(isHeard(body, s), false);
  assert.equal(toastAllowed(body, s, at(13, 12)), false);
  assert.equal(unreadCount([body, clean], new Set(), s, at(13, 12)), 1);
});

test("the bell lists newest first, keeps read notices for 30 days and unread ones until read, at most 50", () => {
  const now = at(30, 12);
  const list = [
    notice({ id: "old-read", at: now - RECENT_MS - DAY }),
    notice({ id: "old-unread", at: now - RECENT_MS - 2 * DAY }),
    notice({ id: "new", at: now - HOUR }),
    notice({ id: "src-read", at: now - RECENT_MS - DAY, read: true }),
  ];
  const out = bellNotices(list, new Set(["old-read"]), now);
  assert.deepEqual(out.map((n) => n.id), ["new", "old-unread"]);
  const many = Array.from({ length: 70 }, (_, i) => notice({ id: `n${i}`, at: now - i * MIN }));
  assert.equal(bellNotices(many, new Set(), now).length, BELL_MAX);
});

test("the count is the unread notices: read in the bell or at their source don't count", () => {
  const now = at(13, 12);
  const list = [notice({ id: "a" }), notice({ id: "b" }), notice({ id: "c", read: true })];
  assert.equal(unreadCount(list, new Set(), DEFAULT_SETTINGS, now), 2);
  assert.equal(unreadCount(list, new Set(["a"]), DEFAULT_SETTINGS, now), 1);
});

const quiet = (x = {}) => prefs({ quietHours: { on: true, from: "22:00", to: "07:00", urgentBreaksThrough: false, ...x } });

test("quiet hours: the window that holds now, across midnight", () => {
  assert.equal(quietWindowStart(quiet(), at(13, 23, 30)), at(13, 22));
  assert.equal(quietWindowStart(quiet(), at(14, 2)), at(13, 22), "after midnight: it began yesterday");
  assert.equal(quietWindowStart(quiet(), at(14, 7)), null, "ends at 07:00");
  assert.equal(quietWindowStart(quiet(), at(13, 12)), null);
  assert.equal(quietWindowStart(quiet({ from: "13:00", to: "15:00" }), at(13, 14)), at(13, 13), "a daytime window");
  assert.equal(quietWindowStart(prefs({}), at(13, 23)), null, "off");
});

test("quiet hours hold sales back by default; Let sales through lets them count and pop up", () => {
  assert.equal(DEFAULT_SETTINGS.notifications.quietHours.urgentBreaksThrough, false);
  const now = at(13, 23, 30);
  const before = notice({ id: "before", at: at(13, 21) });
  const during = notice({ id: "during", at: at(13, 22, 30) });
  const sale = notice({ id: "sale", kind: "marketplace", urgent: true, at: at(13, 22, 40) });
  const list = [before, during, sale];
  assert.equal(unreadCount(list, new Set(), quiet(), now), 1, "only what came before");
  assert.equal(unreadCount(list, new Set(), quiet({ urgentBreaksThrough: true }), now), 2, "and the sale");
  assert.equal(unreadCount(list, new Set(), quiet(), at(14, 8)), 3, "the window over: everything counts");
  assert.equal(toastAllowed(sale, quiet(), now), false);
  assert.equal(toastAllowed(sale, quiet({ urgentBreaksThrough: true }), now), true);
  assert.equal(toastAllowed(during, quiet({ urgentBreaksThrough: true }), now), false);
  assert.equal(toastAllowed(during, quiet(), at(13, 12)), true, "outside the window");
});

test("pop-ups: Right away, Once a day or Paused, from the digest and popupsPaused", () => {
  assert.equal(popupModeOf(DEFAULT_SETTINGS), "now");
  assert.equal(popupModeOf(prefs({ digest: "daily" })), "daily");
  assert.equal(popupModeOf(prefs({ popupsPaused: true })), "paused");
  assert.equal(popupModeOf(prefs({ digest: "daily", popupsPaused: true })), "paused");
  for (const mode of ["now", "daily", "paused"]) assert.equal(popupModeOf(prefs(popupModePatch(mode))), mode);
  assert.equal(popupModeOf(patchSettings(prefs(popupModePatch("paused")), "notifications", popupModePatch("now"))), "now", "unpausing");
});

test("pop-ups show only right away; Once a day and Paused hold every one but keep the count", () => {
  const noon = at(13, 12);
  const list = [notice()];
  assert.equal(toastAllowed(list[0], DEFAULT_SETTINGS, noon), true);
  assert.equal(toastAllowed(list[0], prefs(popupModePatch("daily")), noon), false);
  assert.equal(toastAllowed(list[0], prefs(popupModePatch("paused")), noon), false);
  assert.equal(unreadCount(list, new Set(), prefs(popupModePatch("paused")), noon), 1);
  assert.equal(unreadCount(list, new Set(), prefs(popupModePatch("daily")), noon), 1);
});

test("the bell: one list right away or paused; a heading per day once a day", () => {
  const now = at(14, 12); // Wednesday 14 Oct 2026
  const list = [
    notice({ id: "today", at: at(14, 9) }),
    notice({ id: "yesterday", at: at(13, 20) }),
    notice({ id: "monday", at: at(12, 8) }),
    notice({ id: "older", at: at(1, 8) }),
  ];
  assert.deepEqual(groupNotices(list, "now", now).map((g) => [g.label, g.notices.length]), [[null, 4]]);
  assert.deepEqual(groupNotices(list, "paused", now).map((g) => [g.label, g.notices.length]), [[null, 4]]);
  assert.deepEqual(
    groupNotices(list, "daily", now).map((g) => [g.label, g.notices.map((n) => n.id)]),
    [
      ["Today", ["today"]],
      ["Yesterday", ["yesterday"]],
      ["Mon, Oct 12", ["monday"]],
      ["Thu, Oct 1", ["older"]],
    ],
  );
});
