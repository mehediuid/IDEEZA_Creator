// Settings › Notification: what the preferences do to the notices (spec §5.6) — a kind's web
// toggle, the bid threshold, muted projects, quiet hours (urgent breaks through), the digest's
// grouping, and which notices the bell lists and counts.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  passesPrefs,
  filterNotices,
  bellNotices,
  unreadCount,
  quietWindowStart,
  toastAllowed,
  groupNotices,
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

test("a kind whose web notification is off is hidden; email and mobile don't matter in the app", () => {
  assert.equal(passesPrefs(notice(), DEFAULT_SETTINGS), true);
  assert.equal(passesPrefs(notice(), kindOff("product")), false);
  assert.equal(passesPrefs(notice({ kind: "coin" }), kindOff("product")), true);
  const emailOn = prefs({ channels: { ...DEFAULT_SETTINGS.notifications.channels, product: { web: true, email: true, mobile: false } } });
  assert.equal(passesPrefs(notice(), emailOn), true);
});

test("the bid threshold hides bids and offers under it; a coin without a dollar value always shows", () => {
  const s = prefs({ bidThreshold: 50 });
  assert.equal(passesPrefs(notice({ kind: "marketplace", bid: { usd: 20 } }), s), false);
  assert.equal(passesPrefs(notice({ kind: "marketplace", bid: { usd: 50 } }), s), true, "of $50 or more");
  assert.equal(passesPrefs(notice({ kind: "marketplace", bid: { usd: 80 } }), s), true);
  assert.equal(passesPrefs(notice({ kind: "marketplace", bid: { usd: null } }), s), true);
  assert.equal(passesPrefs(notice({ kind: "marketplace", urgent: true }), s), true, "a sale is not a bid");
  assert.equal(passesPrefs(notice({ kind: "marketplace", bid: { usd: 1 } }), DEFAULT_SETTINGS), true, "null: every bid");
});

test("a muted project's notices are hidden; the rest stay", () => {
  const s = prefs({ mutedProjects: ["p1"] });
  const list = [notice({ id: "a", projectId: "p1" }), notice({ id: "b", projectId: "p2" }), notice({ id: "c" })];
  assert.deepEqual(filterNotices(list, s).map((n) => n.id), ["b", "c"]);
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

const quiet = (x = {}) => prefs({ quietHours: { on: true, from: "22:00", to: "07:00", urgentBreaksThrough: true, ...x } });

test("quiet hours: the window that holds now, across midnight", () => {
  assert.equal(quietWindowStart(quiet(), at(13, 23, 30)), at(13, 22));
  assert.equal(quietWindowStart(quiet(), at(14, 2)), at(13, 22), "after midnight: it began yesterday");
  assert.equal(quietWindowStart(quiet(), at(14, 7)), null, "ends at 07:00");
  assert.equal(quietWindowStart(quiet(), at(13, 12)), null);
  assert.equal(quietWindowStart(quiet({ from: "13:00", to: "15:00" }), at(13, 14)), at(13, 13), "a daytime window");
  assert.equal(quietWindowStart(prefs({}), at(13, 23)), null, "off");
});

test("quiet hours: no count growth inside the window, except urgent when it breaks through", () => {
  const now = at(13, 23, 30);
  const before = notice({ id: "before", at: at(13, 21) });
  const during = notice({ id: "during", at: at(13, 22, 30) });
  const sale = notice({ id: "sale", kind: "marketplace", urgent: true, at: at(13, 22, 40) });
  const list = [before, during, sale];
  assert.equal(unreadCount(list, new Set(), quiet(), now), 2, "what came before, and the sale");
  assert.equal(unreadCount(list, new Set(), quiet({ urgentBreaksThrough: false }), now), 1);
  assert.equal(unreadCount(list, new Set(), quiet(), at(14, 8)), 3, "the window over: everything counts");
  assert.equal(unreadCount(list, new Set(), DEFAULT_SETTINGS, now), 3);
});

test("toasts: right away only, never during quiet hours unless urgent, never for a hidden notice", () => {
  const noon = at(13, 12);
  const night = at(13, 23);
  assert.equal(toastAllowed(notice(), DEFAULT_SETTINGS, noon), true);
  assert.equal(toastAllowed(notice(), prefs({ digest: "daily" }), noon), false);
  assert.equal(toastAllowed(notice(), prefs({ digest: "weekly" }), noon), false);
  assert.equal(toastAllowed(notice(), quiet(), night), false);
  assert.equal(toastAllowed(notice(), quiet(), noon), true);
  assert.equal(toastAllowed(notice({ urgent: true, kind: "marketplace" }), quiet(), night), true);
  assert.equal(toastAllowed(notice({ urgent: true, kind: "marketplace" }), quiet({ urgentBreaksThrough: false }), night), false);
  assert.equal(toastAllowed(notice(), kindOff("product"), noon), false);
  assert.equal(toastAllowed(notice({ projectId: "p1" }), prefs({ mutedProjects: ["p1"] }), noon), false);
});

test("digest: right away is one list; a daily summary groups by day, a weekly one by week", () => {
  const now = at(14, 12); // Wednesday 14 Oct 2026
  const list = [
    notice({ id: "today", at: at(14, 9) }),
    notice({ id: "yesterday", at: at(13, 20) }),
    notice({ id: "monday", at: at(12, 8) }),
    notice({ id: "last-week", at: at(8, 8) }),
    notice({ id: "older", at: at(1, 8) }),
  ];
  assert.deepEqual(groupNotices(list, "instant", now).map((g) => [g.label, g.notices.length]), [[null, 5]]);
  assert.deepEqual(
    groupNotices(list, "daily", now).map((g) => [g.label, g.notices.map((n) => n.id)]),
    [
      ["Today", ["today"]],
      ["Yesterday", ["yesterday"]],
      ["Mon, Oct 12", ["monday"]],
      ["Thu, Oct 8", ["last-week"]],
      ["Thu, Oct 1", ["older"]],
    ],
  );
  assert.deepEqual(
    groupNotices(list, "weekly", now).map((g) => [g.label, g.notices.map((n) => n.id)]),
    [
      ["This week", ["today", "yesterday", "monday"]],
      ["Last week", ["last-week"]],
      ["Week of Sep 28", ["older"]],
    ],
  );
});
