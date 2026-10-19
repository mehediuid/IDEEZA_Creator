// Settings › Privacy & safety › Hidden words in Bangla (and any script): the matcher compares
// text and words in one form, NFC with the zero-width joiners taken out, so a word typed one
// way still hides a comment or request written the other way. The export names stay stable
// (the bell reads `hiddenWordIn` / `hasHiddenWord` too).
import { test } from "node:test";
import assert from "node:assert/strict";

const { hiddenWordIn, hasHiddenWord, wordsFromInput, addWords, matchForm } = await import("../../.tmp-test/lib/settings/audience.js");

// "বোন": ো as one code point (U+09CB) and as ে + া (U+09C7 U+09BE).
const BON_ONE = "বোন";
const BON_TWO = "বোন";
// "নয়": য় as one code point (U+09DF) and as য + ় (U+09AF U+09BC).
const NOY_ONE = "নয়";
const NOY_TWO = "নয়";
// "র‍্যাব" with a zero-width joiner (U+200D), and "টাকা" with a zero-width non-joiner (U+200C).
const RAB_ZWJ = "র‍্যাব";
const RAB = "র্যাব";
const TAKA_ZWNJ = "টা‌কা";
const TAKA = "টাকা";

test("one form: NFC, zero-width joiners and spaces out", () => {
  assert.equal(matchForm(BON_TWO), matchForm(BON_ONE));
  assert.equal(matchForm(NOY_ONE), matchForm(NOY_TWO));
  assert.equal(matchForm(RAB_ZWJ), RAB.normalize("NFC"));
  assert.equal(matchForm(`a​b⁠c﻿`), "abc");
});

test("a Bangla word matches however its vowel sign or nukta was typed", () => {
  assert.equal(hasHiddenWord(`আমার ${BON_TWO} আসবে`, [BON_ONE]), true);
  assert.equal(hasHiddenWord(`আমার ${BON_ONE} আসবে`, [BON_TWO]), true);
  assert.equal(hiddenWordIn(`এটা ${NOY_ONE}`, [NOY_TWO]), NOY_TWO);
  assert.equal(hasHiddenWord(`এটা ${NOY_TWO}`, [NOY_ONE]), true);
});

test("a zero-width joiner on either side never hides a match", () => {
  assert.equal(hasHiddenWord(`${RAB_ZWJ} এসেছে`, [RAB]), true);
  assert.equal(hasHiddenWord(`${RAB} এসেছে`, [RAB_ZWJ]), true);
  assert.equal(hasHiddenWord(`${TAKA_ZWNJ} দাও`, [TAKA]), true);
  assert.equal(hasHiddenWord(`${TAKA} দাও`, ["#" + TAKA]), false, "a #tag word is only the tag");
  assert.equal(hasHiddenWord(`#${TAKA_ZWNJ} দাও`, ["#" + TAKA]), true);
});

test("still whole words: a longer Bangla word is not a match", () => {
  assert.equal(hasHiddenWord(`${TAKA}টা`, [TAKA]), false);
  assert.equal(hasHiddenWord(`${BON_TWO}ের`, [BON_ONE]), false);
});

test("typed words are kept in the one form, so the same word typed two ways is one word", () => {
  assert.deepEqual(wordsFromInput(`${BON_TWO}, ${BON_ONE}`), [BON_ONE.normalize("NFC")]);
  assert.deepEqual(wordsFromInput(TAKA_ZWNJ), [TAKA]);
  assert.deepEqual(addWords([TAKA], TAKA_ZWNJ), { words: [TAKA], over: 0 });
  assert.deepEqual(wordsFromInput("‍, ‌"), []);
});
