// Settings › Profile and Personal Information: the public profile fields they
// add (handle, skills, top specialities, social accounts, spoken languages, a
// hand-set time zone), the handle's rules, and the v1 → v2 migration.
import { test } from "node:test";
import assert from "node:assert/strict";

const {
  EMPTY_PROFILE,
  normalizeProfile,
  SKILLS_MAX,
  SPECIALITIES_MAX,
  LANGUAGES_MAX,
  socialUrlOf,
  socialNameOf,
} = await import("../../.tmp-test/lib/people/fields.js");
const { cleanHandle, handleFormatProblem, HANDLE_MIN, HANDLE_MAX } = await import("../../.tmp-test/lib/people/handle.js");
const { ME, SAMPLE_HANDLES, directory, handleProblem, personByHandle, profileHrefOf } = await import("../../.tmp-test/lib/people/ids.js");
const { zoneOffsetOf, zoneLabelOf, timeZoneChoices, zoneChoiceOf, zonePatchOf } = await import("../../.tmp-test/lib/people/time-zones.js");
const { spokenLanguageOptions } = await import("../../.tmp-test/lib/people/languages.js");

test("a v1 profile keeps every word it had and gains the new fields empty", () => {
  const v1 = {
    v: 1,
    name: "Rafiq Ahmed",
    latinName: "",
    headline: "Solar sensors",
    pins: ["p1"],
    since: 1700000000000,
    bio: "I build things.",
    location: "Dhaka, Bangladesh",
    timeZone: "Asia/Dhaka",
    links: ["https://rafiq.dev"],
    openTo: "both",
  };
  const f = normalizeProfile(v1);
  assert.equal(f.v, 2);
  for (const k of Object.keys(v1)) if (k !== "v") assert.deepEqual(f[k], v1[k], k);
  assert.equal(f.handle, "");
  assert.deepEqual(f.skills, []);
  assert.deepEqual(f.specialities, []);
  assert.deepEqual(f.social, { facebook: "", x: "", instagram: "", linkedin: "" });
  assert.deepEqual(f.languages, []);
  assert.equal(f.timeZoneManual, false);
  assert.equal(EMPTY_PROFILE.v, 2);
});

test("handle: lower-cased, 3–30 of a–z 0–9 and -, starting and ending with a letter or number", () => {
  assert.equal(cleanHandle("  Rafiq-Builds "), "rafiq-builds");
  assert.equal(HANDLE_MIN, 3);
  assert.equal(HANDLE_MAX, 30);
  assert.equal(handleFormatProblem("rafiq"), null);
  assert.equal(handleFormatProblem("r2d"), null);
  assert.match(handleFormatProblem("ra"), /at least 3/);
  assert.match(handleFormatProblem("r".repeat(31)), /30/);
  assert.match(handleFormatProblem("rafiq_ahmed"), /letters, numbers and hyphens/);
  assert.match(handleFormatProblem("-rafiq"), /Start and end/);
  assert.match(handleFormatProblem("rafiq-"), /Start and end/);
  assert.equal(normalizeProfile({ handle: "Rafiq" }).handle, "rafiq");
  assert.equal(normalizeProfile({ handle: "no way" }).handle, "");
});

test("handle: a sample creator's handle is taken; me is not a handle anyone can pick", () => {
  assert.ok(SAMPLE_HANDLES.includes("naim-rahman"));
  assert.ok(!SAMPLE_HANDLES.includes("me"));
  assert.match(handleProblem("naim-rahman"), /Another creator/);
  assert.match(handleProblem("Naim-Rahman"), /Another creator/);
  assert.equal(handleProblem("rafiq"), null);
  assert.match(handleProblem("me"), /at least 3/);
});

test("your handle opens you, and me stays an alias that always does", () => {
  const dir = directory({ name: "Rafiq", latinName: "", handle: "rafiq" });
  assert.equal(dir[0].handle, "rafiq");
  assert.equal(personByHandle(dir, "rafiq")?.id, ME);
  assert.equal(personByHandle(dir, "RAFIQ")?.id, ME);
  assert.equal(personByHandle(dir, "me")?.id, ME);
  assert.equal(personByHandle(dir, "naim-rahman")?.id, "feed:c1");
  const none = directory({ name: "Rafiq", latinName: "" });
  assert.equal(none[0].handle, "me");
  assert.equal(personByHandle(none, "me")?.id, ME);
});

test("a handle that collides with a sample creator is ignored, and their handles never move", () => {
  const dir = directory({ name: "Rafiq", latinName: "", handle: "naim-rahman" });
  assert.equal(dir[0].handle, "me");
  assert.equal(personByHandle(dir, "naim-rahman")?.id, "feed:c1");
  const plain = directory({ name: "", latinName: "" });
  assert.deepEqual(dir.slice(1).map((p) => p.handle), plain.slice(1).map((p) => p.handle));
});

test("profileHrefOf puts your handle in your links", () => {
  assert.equal(profileHrefOf("me"), "/creators/me");
  assert.equal(profileHrefOf("me", "messages", "rafiq"), "/creators/rafiq");
  assert.equal(profileHrefOf("you", "innovations", "rafiq"), "/creators/rafiq");
  assert.equal(profileHrefOf("me", "messages", "naim-rahman"), "/creators/me");
  assert.equal(profileHrefOf("me", "messages", "bad handle"), "/creators/me");
  assert.equal(profileHrefOf("c1", "innovations", "rafiq"), "/creators/naim-rahman");
});

test("skills: trimmed, unique ignoring case, at most 16", () => {
  const f = normalizeProfile({ skills: ["  PCB  design ", "pcb design", "", 3, ...Array.from({ length: 20 }, (_, i) => `S${i}`)] });
  assert.equal(f.skills[0], "PCB design");
  assert.equal(f.skills.length, SKILLS_MAX);
  assert.equal(new Set(f.skills.map((s) => s.toLowerCase())).size, SKILLS_MAX);
});

test("specialities: at most 3, each one of your skills, years from the four bands", () => {
  const f = normalizeProfile({
    skills: ["PCB design", "Firmware", "3D modelling", "Soldering"],
    specialities: [
      { skill: "pcb design", years: "3-5" },
      { skill: "Firmware", years: "ten" },
      { skill: "Knitting", years: "1-2" },
      { skill: "PCB design", years: "5+" },
      { skill: "3D modelling", years: "1-2" },
      { skill: "Soldering", years: "0-1" },
    ],
  });
  assert.deepEqual(f.specialities, [
    { skill: "PCB design", years: "3-5" },
    { skill: "Firmware", years: "0-1" },
    { skill: "3D modelling", years: "1-2" },
  ]);
  assert.equal(SPECIALITIES_MAX, 3);
  assert.deepEqual(normalizeProfile({ skills: [], specialities: [{ skill: "PCB design", years: "1-2" }] }).specialities, []);
});

test("social accounts: a profile URL on that network, or a username made into one", () => {
  assert.equal(socialUrlOf("x", "@ideeza"), "https://x.com/ideeza");
  assert.equal(socialUrlOf("x", "https://twitter.com/ideeza"), "https://twitter.com/ideeza");
  assert.equal(socialUrlOf("facebook", "facebook.com/IDEEZA_07"), "https://facebook.com/IDEEZA_07");
  assert.equal(socialUrlOf("instagram", "ideeza.app"), "https://instagram.com/ideeza.app");
  assert.equal(socialUrlOf("linkedin", "ideeza"), "https://www.linkedin.com/in/ideeza");
  assert.equal(socialUrlOf("linkedin", "https://www.linkedin.com/in/ideeza/"), "https://www.linkedin.com/in/ideeza/");
  assert.equal(socialUrlOf("facebook", "https://x.com/ideeza"), null);
  assert.equal(socialUrlOf("x", "https://x.com/"), null);
  assert.equal(socialUrlOf("x", "two words"), null);
  assert.equal(socialUrlOf("x", ""), "");
  assert.equal(socialNameOf("linkedin", "https://www.linkedin.com/in/ideeza/"), "ideeza");
  assert.equal(socialNameOf("facebook", "https://facebook.com/IDEEZA_07"), "IDEEZA_07");
  const f = normalizeProfile({ social: { x: "@ideeza", facebook: "https://x.com/no", tiktok: "@a" } });
  assert.deepEqual(f.social, { facebook: "", x: "https://x.com/ideeza", instagram: "", linkedin: "" });
});

test("spoken languages: trimmed, unique, capped", () => {
  const f = normalizeProfile({ languages: [" Bangla ", "bangla", "English", "", ...Array.from({ length: 20 }, (_, i) => `L${i}`)] });
  assert.deepEqual(f.languages.slice(0, 2), ["Bangla", "English"]);
  assert.equal(f.languages.length, LANGUAGES_MAX);
});

test("a hand-set time zone is kept only with a real zone", () => {
  assert.equal(normalizeProfile({ timeZone: "Asia/Dhaka", timeZoneManual: true }).timeZoneManual, true);
  assert.equal(normalizeProfile({ timeZone: "Mars/Base", timeZoneManual: true }).timeZoneManual, false);
  assert.equal(normalizeProfile({ timeZone: null, timeZoneManual: true }).timeZoneManual, false);
});

test("time zones: an offset label, and this device's zone offered first", () => {
  const at = Date.UTC(2026, 0, 15, 12);
  assert.equal(zoneOffsetOf("Asia/Dhaka", at), "GMT+6");
  assert.equal(zoneOffsetOf("UTC", at), "GMT");
  assert.equal(zoneLabelOf("America/New_York", at), "America/New York (GMT-5)");
  const choices = timeZoneChoices("Asia/Dhaka", at);
  assert.equal(choices[0].value, "device");
  assert.match(choices[0].label, /Asia\/Dhaka/);
  assert.match(choices[0].label, /this device/);
  assert.ok(choices.some((c) => c.value === "Europe/London"));
  assert.ok(choices.length > 300);
});

test("choosing a time zone by hand marks it; choosing this device follows the device again", () => {
  assert.equal(zoneChoiceOf({ timeZone: "Asia/Dhaka", timeZoneManual: true }), "Asia/Dhaka");
  assert.equal(zoneChoiceOf({ timeZone: "Asia/Dhaka", timeZoneManual: false }), "device");
  assert.equal(zoneChoiceOf({ timeZone: null, timeZoneManual: true }), "device");
  assert.deepEqual(zonePatchOf("Europe/Berlin", "Asia/Dhaka"), { timeZone: "Europe/Berlin", timeZoneManual: true });
  assert.deepEqual(zonePatchOf("device", "Asia/Dhaka"), { timeZone: "Asia/Dhaka", timeZoneManual: false });
  const saved = normalizeProfile({ location: "Dhaka", ...zonePatchOf("Europe/Berlin", "Asia/Dhaka") });
  assert.equal(saved.timeZone, "Europe/Berlin");
  assert.equal(saved.timeZoneManual, true);
});

test("spoken languages on offer: named by Intl, Figma's first, no repeats", () => {
  const list = spokenLanguageOptions();
  assert.deepEqual(list.slice(0, 6), ["Bangla", "English", "Hindi", "Arabic", "Thai", "Spanish"]);
  assert.ok(list.length > 20);
  assert.equal(new Set(list).size, list.length);
});
