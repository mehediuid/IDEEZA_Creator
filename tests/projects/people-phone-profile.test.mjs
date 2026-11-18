// The creator profile on the phone (mobile Figma "People · 2026 update", PR-01…45): the words and
// addresses the phone's profile screens work out from the web's profile data.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageOf,
  compactCount,
  firstNameOf,
  hostPathOf,
  linkRowsOf,
  metaLineOf,
  moreAboutSummaryOf,
  phoneProfileHref,
  phoneProjectHref,
  profileStatsOf,
  specialityLabelOf,
  videoLengthOf,
} from "../../.tmp-test/lib/people/phone-profile.js";

const NO_SOCIAL = { facebook: "", x: "", instagram: "", linkedin: "" };
const EMPTY = { skills: [], specialities: [], languages: [], builtWith: [], worksOn: [], links: [] };

test("a project card opens its details on the phone: yours by id, a sample's by its feed id", () => {
  assert.equal(phoneProjectHref({ projectId: "p_ab 1", key: "mine:p_ab 1" }), "/m/projects/p_ab%201");
  assert.equal(phoneProjectHref({ projectId: null, key: "sample:p3" }), "/m/projects/p3");
  assert.equal(phoneProfileHref("me"), "/m/creators/me");
  assert.equal(phoneProfileHref("naim-rahman"), "/m/creators/naim-rahman");
});

test("the four counts come from shared work only; Appreciations only once there are some", () => {
  assert.deepEqual(profileStatsOf([], 50), []);
  const made = [
    { products: 2, stageId: "prototype" },
    { products: 3, stageId: "pilot-run" },
    { products: 1, stageId: "launched" },
  ];
  assert.deepEqual(profileStatsOf(made, 0), [
    { label: "Projects shared", value: 3 },
    { label: "Products built", value: 6 },
    { label: "In production", value: 2 },
  ]);
  assert.equal(profileStatsOf(made, 1400).at(-1).label, "Appreciations");
});

test("counts, video lengths and ages read as the Figma draws them", () => {
  assert.equal(compactCount(18), "18");
  assert.equal(compactCount(1234), "1.2k");
  assert.equal(compactCount(3200), "3.2k");
  assert.equal(compactCount(12400), "12k");
  assert.equal(compactCount(2_500_000), "2.5m");
  assert.equal(videoLengthOf(42_000), "0:42");
  assert.equal(videoLengthOf(125_400), "2:05");
  const now = Date.UTC(2026, 10, 5);
  const D = 86_400_000;
  assert.equal(ageOf(now - 10_000, now), "now");
  assert.equal(ageOf(now - 5 * 60_000, now), "5 m");
  assert.equal(ageOf(now - 3 * 3_600_000, now), "3 h");
  assert.equal(ageOf(now - 2 * D, now), "2 d");
  assert.equal(ageOf(now - 8 * D, now), "1 w");
  assert.equal(ageOf(now - 21 * D, now), "3 w");
  assert.equal(ageOf(now - 120 * D, now), "4 mo");
  assert.equal(ageOf(now - 400 * D, now), "1 y");
});

test("the line under the headline joins where, their local time and since when", () => {
  const since = Date.UTC(2025, 5, 15);
  assert.equal(
    metaLineOf({ location: "Dhaka, Bangladesh", localTime: "3:40 pm", since }),
    "Dhaka, Bangladesh · 3:40 pm there · Building on IDEEZA since June 2025",
  );
  assert.equal(metaLineOf({ location: null, localTime: "3:40 pm", since }), "Building on IDEEZA since June 2025");
  assert.equal(metaLineOf({ location: null, localTime: null, since: null }), null);
  assert.equal(firstNameOf("Naim Rahman"), "Naim");
  assert.equal(specialityLabelOf({ skill: "Firmware", years: "5+" }), "Firmware · 5+ years");
});

test("links and social become the More about sheet's rows, each address once", () => {
  assert.equal(hostPathOf("https://www.naimbuilds.dev/notes/"), "naimbuilds.dev/notes");
  const rows = linkRowsOf(["https://naimbuilds.dev", "https://naimbuilds.dev"], { ...NO_SOCIAL, x: "https://x.com/naimbuilds", linkedin: "https://www.linkedin.com/in/naim/" });
  assert.deepEqual(rows, [
    { label: "Website", value: "naimbuilds.dev", href: "https://naimbuilds.dev" },
    { label: "X", value: "@naimbuilds", href: "https://x.com/naimbuilds" },
    { label: "LinkedIn", value: "@naim", href: "https://www.linkedin.com/in/naim/" },
  ]);
});

test("More about's summary names the first two groups with something in them, Skills and Links first", () => {
  assert.equal(moreAboutSummaryOf(EMPTY), null);
  assert.equal(moreAboutSummaryOf({ ...EMPTY, skills: ["Firmware"], languages: ["Bangla"], builtWith: ["ESP32"], links: [{ label: "X", value: "@n", href: "https://x.com/n" }] }), "Skills · Links");
  assert.equal(moreAboutSummaryOf({ ...EMPTY, builtWith: ["ESP32"], worksOn: ["IoT"] }), "Built with · Works on");
  assert.equal(moreAboutSummaryOf({ ...EMPTY, specialities: [{ skill: "Firmware", years: "5+" }] }), "Skills");
  assert.equal(moreAboutSummaryOf({ ...EMPTY, languages: ["English"] }), "Languages");
});
