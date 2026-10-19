// Settings › Language & region › Voice typing: which language the mic listens
// for. Automatic follows the browser's own languages, mapped onto the list.
import { test } from "node:test";
import assert from "node:assert/strict";

const { resolveVoiceLang, voiceLangFor, voiceLangLabel, VOICE_CHOICES, FALLBACK_VOICE_LANG } = await import(
  "../../.tmp-test/lib/settings/voice.js"
);
const { VOICE_LANGS } = await import("../../.tmp-test/lib/settings/prefs.js");

test("automatic: the first browser language the list has, by exact tag or by language", () => {
  assert.equal(voiceLangFor(["bn-BD"]), "bn-BD");
  assert.equal(voiceLangFor(["bn"]), "bn-BD", "Bangla on its own is Bangladesh's");
  assert.equal(voiceLangFor(["en-GB", "en"]), "en-GB");
  assert.equal(voiceLangFor(["en-AU"]), "en-US", "an English the list lacks is the first English");
  assert.equal(voiceLangFor(["ko-KR", "fr-CA"]), "fr-FR", "a language the list lacks is skipped");
  assert.equal(voiceLangFor(["ko-KR"]), FALLBACK_VOICE_LANG);
  assert.equal(voiceLangFor([]), "en-US");
});

test("auto resolves through the browser's languages; a chosen language is what the recogniser gets", () => {
  assert.equal(resolveVoiceLang("auto", ["bn-BD", "en-US"]), "bn-BD");
  assert.equal(resolveVoiceLang("ar-SA", ["bn-BD"]), "ar-SA");
  assert.equal(resolveVoiceLang("xx-YY", ["hi-IN"]), "hi-IN", "anything unknown reads as auto");
  assert.equal(resolveVoiceLang(undefined, []), "en-US");
});

test("every stored language is offered, auto first and named for people", () => {
  assert.deepEqual(VOICE_CHOICES.map((c) => c.value), [...VOICE_LANGS]);
  assert.equal(voiceLangLabel("auto"), "Same as your browser");
  assert.equal(voiceLangLabel("bn-BD"), "Bangla (Bangladesh)");
  for (const c of VOICE_CHOICES.slice(1)) {
    assert.ok(c.label.length > 0 && c.label !== c.value, `${c.value} has a name`);
  }
});
