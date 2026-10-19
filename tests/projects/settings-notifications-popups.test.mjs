// Settings › Notifications › Pop-ups (V5): the stored choice (popupsPaused; an old weekly summary
// reads as once a day), the once-a-day summary, asking for browser pop-ups once when a build
// starts, and which new notices pop up outside a hidden tab.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  dayKeyOf,
  decodeSummaryMark,
  summaryDue,
  dailySummary,
  summaryLine,
  shouldAskAtBuild,
  freshNotices,
  browserPopupAllowed,
} = await import("../../.tmp-test/lib/notifications/popups.js");
const { popupModePatch } = await import("../../.tmp-test/lib/notifications/filter.js");
const { DEFAULT_SETTINGS, normalizeSettings, patchSettings } = await import("../../.tmp-test/lib/settings/prefs.js");

const HOUR = 3_600_000;
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();
const notice = (x = {}) => ({ id: "n1", kind: "product", tag: "Ready to review", title: "Lamp is ready", href: "/chat/c1", at: at(13, 9), ...x });
const prefs = (patch) => patchSettings(DEFAULT_SETTINGS, "notifications", patch);
const daily = prefs(popupModePatch("daily"));
const kindOff = (s, kind) =>
  patchSettings(s, "notifications", { channels: { ...s.notifications.channels, [kind]: { web: false, email: false, mobile: false } } });

test("popupsPaused: off by default, kept when saved, a non-boolean falls back", () => {
  assert.equal(DEFAULT_SETTINGS.notifications.popupsPaused, false);
  assert.equal(normalizeSettings({ notifications: { popupsPaused: true } }).notifications.popupsPaused, true);
  assert.equal(normalizeSettings({ notifications: { popupsPaused: "yes" } }).notifications.popupsPaused, false);
  assert.equal(normalizeSettings(null).notifications.popupsPaused, false);
});

test("an old weekly summary reads as once a day; the rest of the record is kept", () => {
  const s = normalizeSettings({ notifications: { digest: "weekly", bidThreshold: 25 } });
  assert.equal(s.notifications.digest, "daily");
  assert.equal(s.notifications.bidThreshold, 25);
  assert.equal(normalizeSettings({ notifications: { digest: "instant" } }).notifications.digest, "instant");
});

test("the summary mark: a local day and when it was shown, anything else is no mark", () => {
  assert.equal(dayKeyOf(at(14, 0, 5)), "2026-10-14");
  assert.equal(dayKeyOf(at(13, 23, 59)), "2026-10-13");
  assert.deepEqual(decodeSummaryMark({ day: "2026-10-13", at: at(13, 9) }), { day: "2026-10-13", at: at(13, 9) });
  assert.equal(decodeSummaryMark({ day: "13 Oct", at: 1 }), null);
  assert.equal(decodeSummaryMark({ day: "2026-10-13" }), null);
  assert.equal(decodeSummaryMark("x"), null);
});

test("the summary is due once a day, on the first look after the day turns, never in quiet hours", () => {
  const mark = { day: "2026-10-13", at: at(13, 9) };
  assert.equal(summaryDue(daily, mark, at(14, 8)), true);
  assert.equal(summaryDue(daily, null, at(14, 8)), true, "the first one");
  assert.equal(summaryDue(daily, { day: "2026-10-14", at: at(14, 7) }, at(14, 8)), false, "already shown today");
  assert.equal(summaryDue(DEFAULT_SETTINGS, mark, at(14, 8)), false, "right away has no summary");
  assert.equal(summaryDue(prefs(popupModePatch("paused")), mark, at(14, 8)), false, "paused");
  const quiet = patchSettings(daily, "notifications", { quietHours: { on: true, from: "22:00", to: "09:00", urgentBreaksThrough: false } });
  assert.equal(summaryDue(quiet, mark, at(14, 8)), false, "waits for quiet hours to end");
  assert.equal(summaryDue(quiet, mark, at(14, 10)), true);
});

test("the summary counts what was heard and is still unread since the last one, kind by kind", () => {
  const mark = { day: "2026-10-13", at: at(13, 9) };
  const now = at(14, 8);
  const list = [
    notice({ id: "sale", kind: "marketplace", at: at(13, 20) }),
    notice({ id: "bid", kind: "marketplace", at: at(13, 21) }),
    notice({ id: "msg", kind: "message", at: at(13, 22) }),
    notice({ id: "build", at: at(13, 23) }),
    notice({ id: "old", at: at(13, 8) }),
    notice({ id: "read", at: at(13, 23), read: true }),
    notice({ id: "marked", at: at(13, 23) }),
    notice({ id: "muted", at: at(13, 23), projectId: "p1" }),
  ];
  const s = patchSettings(daily, "notifications", { mutedProjects: ["p1"] });
  const sum = dailySummary(list, new Set(["marked"]), s, mark, now);
  assert.equal(sum.total, 4);
  assert.deepEqual(sum.parts.map((p) => [p.label, p.count]), [
    ["Sales and bids", 2],
    ["Builds and videos", 1],
    ["Messages and requests", 1],
  ]);
  assert.equal(summaryLine(sum), "4 new since your last summary: Sales and bids 2, Builds and videos 1, Messages and requests 1.");
  const first = dailySummary(list, new Set(), s, null, now);
  assert.equal(first.since, "day");
  assert.match(summaryLine(first), /^\d+ new in the last day: /);
  assert.equal(dailySummary(list, new Set(), kindOff(s, "marketplace"), mark, now).parts[0].label, "Builds and videos", "a kind switched off isn't summed");
  assert.equal(dailySummary([], new Set(), s, mark, now).total, 0);
});

test("browser pop-ups are asked for once, at a build, only while builds can pop up", () => {
  assert.equal(shouldAskAtBuild("default", false, DEFAULT_SETTINGS), true);
  assert.equal(shouldAskAtBuild("default", true, DEFAULT_SETTINGS), false, "asked before: never again");
  assert.equal(shouldAskAtBuild("granted", false, DEFAULT_SETTINGS), false);
  assert.equal(shouldAskAtBuild("denied", false, DEFAULT_SETTINGS), false);
  assert.equal(shouldAskAtBuild("unsupported", false, DEFAULT_SETTINGS), false);
  assert.equal(shouldAskAtBuild("default", false, prefs(popupModePatch("paused"))), false, "pop-ups paused");
  assert.equal(shouldAskAtBuild("default", false, prefs(popupModePatch("daily"))), false, "once a day");
  assert.equal(shouldAskAtBuild("default", false, kindOff(DEFAULT_SETTINGS, "product")), false, "builds switched off");
});

test("fresh notices: not seen before in this tab, and unread", () => {
  const list = [notice({ id: "a" }), notice({ id: "b" }), notice({ id: "c", read: true }), notice({ id: "d" })];
  assert.deepEqual(freshNotices(list, new Set(["a"]), new Set(["d"])).map((n) => n.id), ["b"]);
});

test("a browser pop-up shows only with the tab hidden, permission granted and the notice allowed to pop up", () => {
  const n = notice();
  const noon = at(13, 12);
  const ok = { hidden: true, permission: "granted" };
  assert.equal(browserPopupAllowed(n, DEFAULT_SETTINGS, noon, ok), true);
  assert.equal(browserPopupAllowed(n, DEFAULT_SETTINGS, noon, { ...ok, hidden: false }), false, "the tab is in view: the page shows it");
  assert.equal(browserPopupAllowed(n, DEFAULT_SETTINGS, noon, { ...ok, permission: "denied" }), false);
  assert.equal(browserPopupAllowed(n, DEFAULT_SETTINGS, noon, { ...ok, permission: "default" }), false);
  assert.equal(browserPopupAllowed(n, kindOff(DEFAULT_SETTINGS, "product"), noon, ok), false);
  assert.equal(browserPopupAllowed(n, prefs(popupModePatch("paused")), noon, ok), false);
  assert.equal(browserPopupAllowed(notice({ kind: "message" }), DEFAULT_SETTINGS, noon, ok), true, "a message pops up outside the tab");
  const night = at(13, 23);
  const quiet = prefs({ quietHours: { on: true, from: "22:00", to: "07:00", urgentBreaksThrough: false } });
  assert.equal(browserPopupAllowed(n, quiet, night, ok), false);
  assert.equal(browserPopupAllowed(n, quiet, noon + HOUR, ok), true);
});
