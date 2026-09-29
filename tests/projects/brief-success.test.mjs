// C7c + T26 — the Brief (COM-21, COM-56, COR-105; Phase 2 P2-SAVE-12, P2-MINT-6, P2-VIDEO-16/17,
// P2-LISTING-22). The copy helpers are pure (compiled by A1's tsconfig); the wiring checks read the
// component sources.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  LISTED_LINE,
  LISTING_HOME_NOTE,
  VIEW_ON_MARKETPLACE,
  liveSubline,
  pendingCardLine,
  pendingSubline,
  showcaseGateLine,
} from "../../.tmp-test/lib/brief/success-copy.js";
import { commitCtaLabel } from "../../.tmp-test/lib/wallet/mint.js";

const briefPath = (name) => new URL(`../../src/components/brief/${name}`, import.meta.url);
const read = (name) => readFileSync(briefPath(name), "utf8");
const CLAIMS = /Innovations|claim it|is up\b/i;

/** The body of `const <name> = …` up to the next top-level marker. */
function slice(src, from, to) {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + from.length);
  assert.ok(a >= 0 && b > a, `${from} … ${to} not found`);
  return src.slice(a, b);
}

test("no success line claims a post or a claimable drop, for any intent (COM-21)", () => {
  for (const intent of ["sell", "give", "save"]) {
    for (const hasClip of [true, false]) assert.doesNotMatch(liveSubline(intent, hasClip), CLAIMS);
  }
  assert.doesNotMatch(pendingSubline(), CLAIMS);
  assert.doesNotMatch(pendingCardLine(2), CLAIMS);
  assert.equal(liveSubline("give", true), "Your videos are final and the drop is open.");
  assert.equal(liveSubline("save", false), "Stored in your library. Pick it up any time.");
});

test("a Sell has only the live line: it is listed on Explore marketplace (P2-LISTING-22 C)", () => {
  assert.equal(LISTED_LINE, "Your project is listed on Explore marketplace — a testnet demo.");
  assert.equal(liveSubline("sell", true), LISTED_LINE);
  assert.equal(liveSubline("sell", false), LISTED_LINE);
  assert.equal(VIEW_ON_MARKETPLACE, "View on marketplace");
  assert.equal(LISTING_HOME_NOTE, "Change the price or remove the listing from the project's Marketplace block.");
  // The interim "Add it to Explore marketplace from its page" (T10) and the pending variants are gone.
  const src = readFileSync(new URL("../../src/lib/brief/success-copy.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /from its page|the moment its video finishes|as soon as .* finishes/);
});

test("a Save's pending lines count its renders; the Showcase gate line counts its videos (P2-VIDEO-16)", () => {
  assert.equal(pendingCardLine(1), "1 video is still rendering. It lands on the project's Media tab when it finishes.");
  assert.match(pendingCardLine(3), /^3 videos are still rendering\./);
  assert.equal(showcaseGateLine(1, 2), "Every product needs an AI video first — 1 of 2 have one.");
});

test("the step keeps none of the old claims (COM-21)", () => {
  const src = read("step-4-success.tsx");
  for (const claim of [
    "Your post is up on Innovations",
    "post it to Innovations",
    "The Innovations post goes up",
    "Your Innovations post goes up",
    "Your community can claim it",
    "Listing is minted",
  ]) {
    assert.ok(!src.includes(claim), `still says "${claim}"`);
  }
});

test("Showcase comes from the shared copy, asks can(), runs the gate and writes the project's flag (COM-56, P2-VIDEO-16)", () => {
  const src = read("step-4-success.tsx");
  assert.match(src, /SUCCESS_SHOWCASE\.action/);
  assert.match(src, /SUCCESS_SHOWCASE\.done/);
  assert.match(src, /can\(\{ kind: "local-owner" \}, "project\.showcase"/);
  assert.match(src, /setShowcase\(project\.id, next\)/);
  assert.match(src, /readiness\.showcase/);
  assert.match(src, /<ReadinessDialog\s+purpose="showcase"/);
  assert.match(src, /showcaseGateLine\(/);
  assert.doesNotMatch(src, /shareToNewsfeed/, "Showcase is read from showcasedAt, never from the Brief's tick");
  // The storyboard scene cards are gone; ready posters open the video.
  assert.doesNotMatch(src, /SceneCard|state\.scenes/);
  assert.match(src, /VideoPlayerDialog/);
  assert.match(src, /<MintProofCard/);
});

test("the Brief hands the success step the project it minted", () => {
  assert.match(read("brief-app.tsx"), /projectId=\{scopeProjectId\}/);
});

test("Step 1 reads the project back and never asks for it (P2-SAVE-12)", () => {
  const src = read("step-1-idea.tsx");
  for (const gone of ["SelectMenu", "Choose Project", "NewProjectPanel", "NEW PROJECT DETAILS", "Adding to", "DecidedProject", "Rename"]) {
    assert.ok(!src.includes(gone), `Step 1 still has "${gone}"`);
  }
  assert.match(src, /function ProjectRow\(/);
  // Continue's missing chain starts at the product name.
  assert.match(src, /const missing = !productName\.trim\(\)\s*\?\s*"Add a product name to continue\."/);
  // C9: the Save chip.
  assert.match(src, /requirement: "Free signature · no KYC"/);
  assert.doesNotMatch(src, /No wallet · no KYC/);

  const app = read("brief-app.tsx");
  const cont = slice(app, "const continueFromIdea = () => {", "const commit = async () => {");
  for (const gone of ["createProject", "attachBuild", "setBuildProject", "seedDraft", "router.push"]) {
    assert.ok(!cont.includes(gone), `continueFromIdea still calls ${gone}`);
  }
  assert.doesNotMatch(app, /seedFromBuild|projectChoice === "new"|withDefaultProjectChoice/);
  // A legacy build-keyed draft is carried once, then cleared.
  const adopt = slice(app, "function adoptBuildDraft(", "// `from` names the build");
  assert.match(adopt, /carryIntoKeptDraft\(/);
  assert.match(adopt, /clearDraft\(buildDraftScope\(buildId\)\)/);
  // Step 1's detail: "{k} products", plus " · version {n}" on a build (from buildsOf).
  assert.match(app, /`\$\{products\} · version \$\{version\}`/);
});

test("the Brief makes one real video per product, no timer-only jobs (P2-VIDEO-17, errata 56)", () => {
  const app = read("brief-app.tsx");
  const step2 = read("step-2-video.tsx");
  for (const src of [app, step2]) {
    assert.doesNotMatch(src, /createJob\(|markMinted\(|generateStoryboard|Generate storyboard|setTimeout\(\s*\(\)\s*=>\s*\{\s*setGeneratingStoryboard/);
  }
  assert.match(step2, /startProductVideo\(/);
  assert.match(step2, /<VideoForm\b/);
  assert.match(step2, /aria-expanded=\{expanded\}/);
  assert.match(step2, /hierarchy="secondary"[\s\S]{0,600}Generate video\n/);
  assert.match(step2, /Videos · \{ready\} of \{rows\.length\} ready/);
  assert.match(step2, /"1 product still needs a video\."/);
  for (const lock of ["A listing needs a video for every product", "A drop needs a video for every product", "A showcase needs a video for every product"]) {
    assert.ok(step2.includes(lock), `missing the lock "${lock}"`);
  }
  assert.doesNotMatch(step2, /Audio prompt|Auto Generate Audio|Email me when ready/);
  assert.equal(existsSync(briefPath("regenerate-confirm.tsx")), false, "regenerate-confirm.tsx is deleted");
  assert.doesNotMatch(read("review-modal.tsx"), /RegenerateConfirm/);
});

test("the form: one Minting type field, never for a Save; the listing form for a Sell (P2-MINT-6, P2-LISTING-22)", () => {
  const src = read("step-3-mint.tsx");
  const save = slice(src, '{intent === "save" && (', "{/* Money shows");
  assert.doesNotMatch(save, /MintTypeField/);
  assert.match(save, /Saved with a free signature|SAVE_SIGNATURE_LINE/);
  const sell = slice(src, '{intent === "sell" && (', '{intent === "give" && (');
  assert.match(sell, /<ListingFields\s+mode="brief"/);
  assert.doesNotMatch(sell, /MintTypeField/, "Minting type is ListingFields' field 4, never rendered twice");
  const give = slice(src, '{intent === "give" && (', '{intent === "save" && (');
  assert.match(give, /<MintTypeField/);
  // The gas checkbox is gone; the CTA is commitCtaLabel's.
  assert.doesNotMatch(src, /I understand a network gas fee is added at mint/);
  assert.match(src, /commitCtaLabel\(intent, type,/);
  assert.match(src, /const type = intent === "save" \? "lazy" : state\.mintType;/);
  assert.equal(commitCtaLabel("save", "lazy", { last: true, fromPreview: true, innovations: false }), "Sign and save");
  assert.equal(commitCtaLabel("sell", "lazy", { last: true, fromPreview: false, innovations: false }), "Sign and list");
  assert.equal(commitCtaLabel("give", "instant", { last: true, fromPreview: false, innovations: false }), "Pay and give");
});

test("a Sell commit writes the MintRecord, then the listing, then the draft's mintedAt; a refused listing un-mints (P2-LISTING-22, §3.9)", () => {
  const app = read("brief-app.tsx");
  const commit = slice(app, "const commit = async () => {", "const goNext = () => {");
  assert.doesNotMatch(commit, /setTimeout/, "the 1.4 s timer is gone: the wallet request is the wait");
  assert.match(commit, /await request\(req,/);
  const writes = slice(commit, "const writeAll = (", "let result: RequestResult | null = null;");
  const order = [
    "createListing(",
    "setMint(cur.id, record)",
    "writeListings(listings)",
    "bumpMinted(network, collection)",
    "writeDraft(scope, { ...s, mintedAt: at }",
    'markStepCompleted(cur.id, "brief")',
    'setStatus(cur.id, "completed")',
  ];
  let at = -1;
  for (const call of order) {
    const i = writes.indexOf(call);
    assert.ok(i > at, `${call} is out of order`);
    at = i;
  }
  assert.match(writes, /"brief",\s*at,/, "the listing's source is the Brief");
  // Refused: the record is put back, and nothing after it runs.
  const refused = slice(writes, "if (!wrote.ok) {", "if (newMint)");
  assert.match(refused, /if \(prior\) setMint\(cur\.id, prior\);\s*else updateProject\(cur\.id, \{ mint: undefined \}\);/);
  assert.match(refused, /return \{ ok: false, message: refusedCopy\(wrote\.reason\) \}/);
  // A reject or a failure writes nothing and says why (P2-MINT-6).
  assert.match(app, /"Not minted — you rejected it in your wallet\. Nothing was charged\."/);
  assert.match(app, /`Not minted — \$\{reason\} Nothing was charged\.`/);
  // The readiness gate is checked again just before confirming: a rendering video never counts.
  assert.match(commit, /recheck: \(\) => \{[\s\S]*readinessOf\([\s\S]*if \(!fresh\.ok\) return fresh\.blocker;/);
});

test("the mint showcases at the mint time itself: one moment for mintedAt and showcasedAt (COR-105)", () => {
  const app = read("brief-app.tsx");
  const writes = slice(app, "const writeAll = (at: number", "let result: RequestResult | null = null;");
  assert.match(writes, /mintedAt: at\b/);
  assert.match(writes, /if \(s\.shareToNewsfeed && cur\.showcasedAt == null\) setShowcase\(cur\.id, true, at\);/);
  assert.doesNotMatch(writes, /Date\.now\(\)/, "the writes take the proof's time, never a second clock read");
  assert.match(app, /commit: \(proof\) => writeAll\(proof\.at, proof\)/);
  // The store writes the time it is handed; a press with none is stamped now.
  const store = readFileSync(new URL("../../src/lib/manual/projects.tsx", import.meta.url), "utf8");
  assert.match(store, /\(id: string, on: boolean, at\?: number\) =>\s*updateProject\(id, \{ showcasedAt: on \? \(at \?\? Date\.now\(\)\) : null \}\)/);
});
