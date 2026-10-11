// The product video's storyboard (owner, 2026-10-12: the Figma "Generate Video" →
// "Review your storyboard" flow): three scenes, read strictly from the model, drafted
// from the maker's own words when it doesn't answer, and spoken lines as on-screen text.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCENE_SPANS,
  draftStoryboard,
  linesOfStoryboard,
  parseStoryboard,
  sanitizeStoryboard,
  storyboardRequestOf,
} from "../../.tmp-test/lib/video/storyboard.js";

const INPUT = { productName: "RC Car", description: "A small four-wheel car you drive with a handheld remote.", videoPrompt: "", audioPrompt: "" };
const scene = (visual, speech = "") => ({ visual, background: "Rain", music: "Lo-fi", speech });

test("three scenes over the clip's own spans", () => {
  assert.deepEqual([...SCENE_SPANS], ["0–3s", "3–6s", "6–10s"]);
});

test("parseStoryboard reads the model's JSON — fenced or not — and refuses anything off shape", () => {
  const json = JSON.stringify({ scenes: [scene("A"), scene("B", "Go"), scene("C")] });
  assert.equal(parseStoryboard(json)?.length, 3);
  assert.equal(parseStoryboard("```json\n" + json + "\n```")?.[1].speech, "Go");
  assert.equal(parseStoryboard("Sure! " + json)?.[2].visual, "C");
  assert.equal(parseStoryboard(JSON.stringify({ scenes: [scene("A"), scene("B")] })), null, "two scenes are not a storyboard");
  assert.equal(parseStoryboard(JSON.stringify({ scenes: [scene("A"), scene(""), scene("C")] })), null, "every scene shows something");
  assert.equal(parseStoryboard("The API key budget is out"), null);
});

test("draftStoryboard writes from the product and the maker's words only", () => {
  const sb = draftStoryboard(INPUT);
  assert.equal(sb.by, "draft");
  assert.equal(sb.scenes.length, 3);
  assert.match(sb.scenes[0].visual, /RC Car/);
  assert.equal(sb.scenes[0].speech, "RC Car");
  assert.equal(sb.scenes[2].speech, "Built with IDEEZA");
  const asked = draftStoryboard({ ...INPUT, videoPrompt: "Racing across a wet track at night", audioPrompt: "Engine whine, crowd" });
  assert.match(asked.scenes[0].visual, /Racing across a wet track at night/);
  assert.ok(asked.scenes.every((s) => s.background === "Engine whine, crowd"), "the maker's sound under every scene");
});

test("storyboardRequestOf says what was left to AI", () => {
  const req = storyboardRequestOf(INPUT);
  assert.match(req, /Product: RC Car/);
  assert.match(req, /Video idea: \(left to you/);
  assert.match(req, /Sound idea: \(left to you/);
});

test("linesOfStoryboard: each scene's speech is its on-screen line; a silent scene keeps the default", () => {
  const sb = { by: "ai", scenes: [scene("A", "Meet RC Car"), scene("B"), scene("C", "x".repeat(80))] };
  const lines = linesOfStoryboard(sb, ["RC Car", "A small car", "Built with IDEEZA"]);
  assert.equal(lines[0], "Meet RC Car");
  assert.equal(lines[1], "A small car");
  assert.equal(lines[2].length, 60);
  assert.ok(lines[2].endsWith("…"));
});

test("sanitizeStoryboard keeps a stored storyboard and drops a broken one", () => {
  const sb = { by: "ai", scenes: [scene("A"), scene("B"), scene("C")] };
  assert.deepEqual(sanitizeStoryboard(JSON.parse(JSON.stringify(sb))), sb);
  assert.equal(sanitizeStoryboard({ scenes: [scene("A")] }), null);
  assert.equal(sanitizeStoryboard(null), null);
});
