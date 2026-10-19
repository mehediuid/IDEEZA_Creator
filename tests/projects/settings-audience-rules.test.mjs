// Settings › Privacy & safety (spec 2026-10-19-settings-design.md §5.10, D9, D13): who may
// comment (Anyone · People you work with · Only me), Take a break, the locked profile, and the
// hidden words — matching, #tags, the 500 limit.
import { test } from "node:test";
import assert from "node:assert/strict";

const { DEFAULT_SETTINGS, patchSettings, HIDDEN_WORDS_MAX } = await import("../../.tmp-test/lib/settings/prefs.js");
const {
  reachAllows,
  stricterReach,
  commentRuleOf,
  canComment,
  seesLockedProfile,
  quietUntilFor,
  QUIET_MS,
  hiddenWordIn,
  hasHiddenWord,
  wordsFromInput,
  addWords,
  wordsRemaining,
} = await import("../../.tmp-test/lib/settings/audience.js");

const NOW = Date.UTC(2026, 9, 19, 12, 0);
const with_ = (patch) => patchSettings(DEFAULT_SETTINGS, "audience", patch);
const stranger = { tie: null, blocked: false };
const teammate = { tie: "team", blocked: false };
const holder = { tie: "share", blocked: false };

test("reach: Anyone lets everyone in, People you work with only your project teams, Only me nobody", () => {
  for (const tie of [null, "team", "share", "copy"]) assert.equal(reachAllows("everyone", tie), true);
  assert.equal(reachAllows("work", "team"), true);
  assert.equal(reachAllows("work", "share"), false);
  assert.equal(reachAllows("work", "copy"), false);
  assert.equal(reachAllows("work", null), false);
  for (const tie of [null, "team", "share", "copy"]) assert.equal(reachAllows("nobody", tie), false);
  assert.equal(stricterReach("everyone", "work"), "work");
  assert.equal(stricterReach("nobody", "work"), "nobody");
});

test("comments: the owner always; a blocked person never; the rule for the rest", () => {
  const s = with_({ comment: "work" });
  assert.equal(canComment(s, { ...stranger, isOwner: true }, NOW), true);
  assert.equal(canComment(s, { ...teammate, isOwner: false }, NOW), true);
  assert.equal(canComment(s, { ...holder, isOwner: false }, NOW), false);
  assert.equal(canComment(DEFAULT_SETTINGS, { ...stranger, isOwner: false }, NOW), true);
  assert.equal(canComment(DEFAULT_SETTINGS, { tie: "team", blocked: true, isOwner: false }, NOW), false);
  assert.equal(canComment(with_({ comment: "nobody" }), { ...teammate, isOwner: false }, NOW), false);
});

test("quiet mode: only people you work with can comment until it ends; Only me stays Only me", () => {
  const quiet = with_({ comment: "everyone", quietUntil: NOW + 1000 });
  assert.equal(commentRuleOf(quiet, NOW), "work");
  assert.equal(canComment(quiet, { ...stranger, isOwner: false }, NOW), false);
  assert.equal(canComment(quiet, { ...teammate, isOwner: false }, NOW), true);
  assert.equal(commentRuleOf(quiet, NOW + 1000), "everyone");
  assert.equal(canComment(quiet, { ...stranger, isOwner: false }, NOW + 1000), true);
  assert.equal(commentRuleOf(with_({ comment: "nobody", quietUntil: NOW + 1000 }), NOW), "nobody");
});

test("quiet mode ends 24 hours or 7 days from now; Off clears it", () => {
  assert.equal(quietUntilFor("24h", NOW), NOW + QUIET_MS["24h"]);
  assert.equal(quietUntilFor("7d", NOW), NOW + 7 * 24 * 60 * 60 * 1000);
  assert.equal(quietUntilFor("off", NOW), null);
});

test("a locked profile: people you don't work with see the locked view; you and your teams don't", () => {
  const locked = with_({ locked: true });
  assert.equal(seesLockedProfile(locked, { tie: null, isOwner: false }), true);
  assert.equal(seesLockedProfile(locked, { tie: "copy", isOwner: false }), true);
  assert.equal(seesLockedProfile(locked, { tie: "team", isOwner: false }), false);
  assert.equal(seesLockedProfile(locked, { tie: null, isOwner: true }), false);
  assert.equal(seesLockedProfile(DEFAULT_SETTINGS, { tie: null, isOwner: false }), false);
});

test("hidden words match whole words in any case, and inside a #tag", () => {
  const words = ["nft", "tree"];
  assert.equal(hiddenWordIn("Buy my NFT now", words), "nft");
  assert.equal(hiddenWordIn("Buy my #NFT now", words), "nft");
  assert.equal(hiddenWordIn("nft.", words), "nft");
  assert.equal(hiddenWordIn("NFTs are fine", words), null, "a whole word, not a part of one");
  assert.equal(hiddenWordIn("a street lamp", words), null);
  assert.equal(hiddenWordIn("", words), null);
  assert.equal(hiddenWordIn("anything", []), null);
});

test("a #tag word matches only the tag", () => {
  assert.equal(hasHiddenWord("Selling #NFT drops", ["#nft"]), true);
  assert.equal(hasHiddenWord("Selling NFT drops", ["#nft"]), false);
  assert.equal(hasHiddenWord("#nfts", ["#nft"]), false);
});

test("phrases, symbols and other scripts", () => {
  assert.equal(hasHiddenWord("Please send   money to me", ["send money"]), true);
  assert.equal(hasHiddenWord("sending money", ["send money"]), false);
  assert.equal(hasHiddenWord("Uses C++ code", ["c++"]), true);
  assert.equal(hasHiddenWord("এটা টাকা চাই", ["টাকা"]), true);
  assert.equal(hasHiddenWord("টাকাটা", ["টাকা"]), false);
});

test("keywords from what you type: commas or new lines, trimmed, lower case, no repeats, no bare #", () => {
  assert.deepEqual(wordsFromInput("tree, #Tree ,NFT\n#nft, , #"), ["tree", "#tree", "nft", "#nft"]);
  assert.deepEqual(wordsFromInput("   "), []);
});

test("adding words keeps the list unique and stops at 500", () => {
  assert.deepEqual(addWords(["nft"], "NFT, hello"), { words: ["nft", "hello"], over: 0 });
  const full = Array.from({ length: HIDDEN_WORDS_MAX - 1 }, (_, i) => `w${i}`);
  const r = addWords(full, "a, b, c");
  assert.equal(r.words.length, HIDDEN_WORDS_MAX);
  assert.equal(r.over, 2);
  assert.equal(wordsRemaining(r.words), 0);
  assert.equal(wordsRemaining(["a", "b"]), 498);
});

test("people you've met: your conversations, your comment threads, people who bought from you; never you", async () => {
  const { peopleMet } = await import("../../.tmp-test/lib/settings/audience.js");
  const met = peopleMet({
    me: "me",
    conversations: [
      { kind: "direct", participants: [{ id: "me" }, { id: "feed:c1" }] },
      { kind: "direct", participants: [{ id: "buyer-leo" }, { id: "feed:c2" }] },
      { kind: "team", participants: [{ id: "me" }] },
    ],
    threads: [
      { yours: true, authorIds: ["me", "feed:k1", "feed:c1"] },
      { yours: false, authorIds: ["feed:k2"] },
    ],
    buyerIds: ["buyer-mira", "buyer-mira"],
  });
  assert.deepEqual(met, [
    { id: "feed:c1", where: ["messages", "comments"] },
    { id: "feed:k1", where: ["comments"] },
    { id: "buyer-mira", where: ["marketplace"] },
  ]);
});
