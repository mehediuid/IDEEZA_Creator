// Settings › Language › Voice typing: which language the mic listens for.
import { test } from "node:test";
import assert from "node:assert/strict";

const { resolveVoiceLang, voiceLangLabel, VOICE_CHOICES, APP_VOICE_LANG } = await import("../../.tmp-test/lib/settings/voice.js");
const { VOICE_LANGS } = await import("../../.tmp-test/lib/settings/prefs.js");

test("auto listens in the app's language (English, US)", () => {
  assert.equal(APP_VOICE_LANG, "en-US");
  assert.equal(resolveVoiceLang("auto"), "en-US");
});

test("a chosen language is what the recogniser gets", () => {
  assert.equal(resolveVoiceLang("bn-BD"), "bn-BD");
  assert.equal(resolveVoiceLang("ar-SA"), "ar-SA");
});

test("anything unknown falls back to the app's language", () => {
  assert.equal(resolveVoiceLang("xx-YY"), "en-US");
  assert.equal(resolveVoiceLang(undefined), "en-US");
});

test("every stored language is offered, auto first and named for people", () => {
  assert.deepEqual(VOICE_CHOICES.map((c) => c.value), [...VOICE_LANGS]);
  assert.equal(voiceLangLabel("auto"), "Same as the app (English)");
  for (const c of VOICE_CHOICES.slice(1)) {
    assert.ok(c.label.length > 0 && c.label !== c.value, `${c.value} has a name`);
  }
});
