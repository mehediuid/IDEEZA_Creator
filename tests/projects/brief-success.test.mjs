// C7c + T26 — the Brief (COM-21, COM-56, COR-105; Phase 2 P2-SAVE-12, P2-MINT-6, P2-VIDEO-16/17,
// P2-LISTING-22), as Earn's mint flow since Build and Earn P1-2. The copy helpers are pure (compiled
// by A1's tsconfig); the wiring checks read the component sources.
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
const readSrc = (path) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");
const CLAIMS = /Innovations|claim it|is up\b|drop is (open|live)/i;

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
  assert.equal(liveSubline("give", true), "Your videos are final. It's free to use and build on.");
  assert.equal(liveSubline("give", false), "It's free to use and build on.");
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
  const src = read("step-success.tsx");
  for (const claim of [
    "Your post is up on Innovations",
    "post it to Innovations",
    "The Innovations post goes up",
    "Your Innovations post goes up",
    "Your community can claim it",
    "Listing is minted",
    "Drop is live",
  ]) {
    assert.ok(!src.includes(claim), `still says "${claim}"`);
  }
});

test("Showcase comes from the shared copy, asks can(), runs the gate and writes the project's flag (COM-56, P2-VIDEO-16)", () => {
  const src = read("step-success.tsx");
  assert.match(src, /SUCCESS_SHOWCASE\.action/);
  assert.match(src, /SUCCESS_SHOWCASE\.done/);
  assert.match(src, /can\(\{ kind: "local-owner" \}, "project\.showcase"/);
  assert.match(src, /setShowcase\(project\.id, next, undefined, post\)/, "the share carries its post");
  assert.match(src, /readiness\.showcase/);
  // Always the share dialog: the videos, then the story and status (owner, 2026-10-12).
  assert.match(src, /onClick=\{\(\) => setGateOpen\(true\)\}/);
  assert.match(src, /<ShareDialog/);
  assert.match(src, /showcaseGateLine\(/);
  assert.doesNotMatch(src, /shareToNewsfeed/, "Showcase is read from showcasedAt, never from the Brief's tick");
  // The storyboard scene cards are gone; ready posters open the video.
  assert.doesNotMatch(src, /SceneCard|state\.scenes/);
  assert.match(src, /VideoPlayerDialog/);
  assert.match(src, /<MintProofCard/);
});

test("the Brief hands the success step the project it minted", () => {
  assert.match(read("brief-app.tsx"), /<StepSuccess[\s\S]*?projectId=\{scope\}/);
});

test("Choose reads the project back from its engineering record and never edits it (P1-2, P2-SAVE-12)", () => {
  const src = read("step-choose.tsx");
  for (const gone of ["<input", "<textarea", "SelectMenu", "Choose Project", "Rename", "productDescription", "otherProducts"]) {
    assert.ok(!src.includes(gone), `Choose still has "${gone}"`);
  }
  // The project page owns the words; Choose links there.
  assert.match(src, /project\.description\.trim\(\) \|\| "No description yet\."/);
  assert.match(src, /Edit on the project page/);
  // The three choices, in the spec's order, with their chips (C9: the private one's).
  const ids = [...src.matchAll(/id: "(save|give|sell)",/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["save", "give", "sell"]);
  assert.match(src, /label: "Keep private"/);
  assert.match(src, /label: "Give to the community"/);
  assert.match(src, /requirement: "Free signature · no KYC"/);
  assert.doesNotMatch(src, /No wallet · no KYC/);

  // The flow writes nothing to the project's words: no product merge, no name sync.
  const app = read("brief-app.tsx");
  for (const gone of ["mergeProductEdits", "productName", "productDescription", "otherProducts", "createProject", "attachBuild", "seedDraft"]) {
    assert.ok(!app.includes(gone), `the flow still touches ${gone}`);
  }
  // Every draft write keeps the stored fields the flow doesn't own.
  assert.match(app, /mintDraftJson\(window\.localStorage\.getItem\(key\), state, step\)/);
});

test("a build's old Brief address redirects to the mint flow; it opens per useBriefOpens (P1-2, R2-8)", () => {
  const route = readSrc("app/(create)/projects/[id]/earn/mint/page.tsx");
  assert.match(route, /<MintPage id=\{id\} \/>/);
  const page = read("mint-page.tsx");
  assert.match(page, /useBriefOpens\(project\)/);
  assert.match(page, /<ProjectNotFound id=\{id\} \/>/);
  assert.match(page, /earnHref\(project\.id, "sell"\)/, "minted without a Brief: the way out is Earn › Sell");

  const build = readSrc("app/(create)/build/[jobId]/brief/page.tsx");
  assert.doesNotMatch(build, /BriefApp/);
  assert.match(build, /holderId \? earnMintHref\(holderId\) : `\/build\/\$\{jobId\}\?save=1`/);
  // A legacy build-keyed draft carries its intent once, then is removed.
  assert.match(build, /adoptBuildIntent\(/);
  assert.match(build, /storage\.removeItem\(buildKey\)/);

  const workspace = readSrc("components/manual/project-workspace.tsx");
  assert.doesNotMatch(workspace, /BriefApp|useBriefOpens/);

  // Back from Choose is Earn › Sell.
  assert.match(read("brief-app.tsx"), /const leave = \(\) => router\.push\(earnHref\(projectId, "sell"\)\);/);
});

test("the editors end with Finish, never the mint flow's Choose; no Save step (owner 2026-10-19, autosave D1/D2)", () => {
  // In an open editor Finish runs EditorSave (the saved dialog); the step's own address is the
  // project page, where Publish keeps it private, gives it or sells it.
  const workspace = readSrc("components/manual/project-workspace.tsx");
  assert.doesNotMatch(workspace, /earnMintHref/);
  assert.match(workspace, /if \(ready && projectId && isBrief\) router\.replace\(`\/projects\/\$\{encodeURIComponent\(projectId\)\}`\);/);
  assert.match(workspace, /<EditorSave project=\{project\} unnamed=\{!row\.name\.trim\(\)\}>/);
  const nav = readSrc("components/manual/use-step-nav.tsx");
  assert.match(nav, /if \(step === "brief"\) return `\/projects\/\$\{encodeURIComponent\(project\.id\)\}`;/);
  assert.match(nav, /if \(step === "brief" && save\) \{\s*save\(\);\s*return;\s*\}/);
  // The flow ends on Product Preview (Wiring is a mode of Assembly now): its forward pill is Finish.
  assert.match(readSrc("components/preview/preview-app.tsx"), /onClick=\{\(\) => goStep\("brief"\)\}[\s\S]{0,400}Finish/);
  // D1: the rail lists the modules only.
  const data = readSrc("lib/pcb/data.tsx");
  assert.doesNotMatch(data, /key: 'brief'/);
  assert.doesNotMatch(nav, /brief: "brief"/);
  for (const src of [readSrc("components/preview/preview-app.tsx"), data]) {
    assert.doesNotMatch(src, /Continue to Brief|'Add Brief'|'Save project'/);
  }
});

test("one save status for every editor; Ctrl+S saves now; no fake toggle, no toolbar Save (owner 2026-10-19, autosave D3–D8)", () => {
  // D3: every editor's write reports to lib/manual/save-status.ts.
  for (const [file, source] of [
    ["components/code/dev-editor.tsx", "code.files"],
    ["components/code/blockly-impl.tsx", "code.blocks"],
    ["components/3d/three-app.tsx", "3d.shapes"],
    ["components/3d/sketch-mode.tsx", "3d.sketches"],
    ["components/3d/ai-generate-modal.tsx", "3d.ai"],
    ["components/assembly/assembly-store.tsx", "assembly"],
    ["lib/pcb/store.tsx", "pcb"],
  ]) {
    assert.match(readSrc(file), new RegExp(`(reportSave|writeReported)\\("${source.replace(".", "\\.")}"`), `${file} reports its writes`);
  }
  for (const file of ["components/code/dev-editor.tsx", "components/3d/three-app.tsx", "components/3d/sketch-mode.tsx"]) {
    assert.doesNotMatch(readSrc(file), /localStorage\.setItem\([^)]*\)\s*;\s*\}\s*catch\s*\{\}/, `${file} no longer swallows a refused write`);
  }
  // The top bar: status chip, linked project name, the status.
  const bar = readSrc("components/pcb/top-bar.tsx");
  assert.match(bar, /<EditorSaveStatus project=\{activeProject\} \/>/);
  assert.match(bar, /href=\{`\/projects\/\$\{encodeURIComponent\(activeProject\.id\)\}`\}/);
  // D4: Ctrl+S in every editor, and File › Save, save everything now.
  const editor = readSrc("components/manual/editor-save.tsx");
  assert.match(editor, /window\.addEventListener\("keydown", onKey, true\)/);
  assert.match(editor, /e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*saveNow\(\);/);
  assert.match(readSrc("lib/pcb/store.tsx"), /actions\.flashToast\(saveNow\(\) \? "Saved" : "Save failed"\)/);
  // D5: the auto-save toggle that did nothing is gone.
  assert.doesNotMatch(readSrc("components/pcb/settings-dialogs.tsx"), /autoSave|Every 5 minutes/);
  // D6: Save left the PCB and schematic toolbars (homed: autosave, the status, Ctrl+S, File › Save).
  const toolbar = readSrc("components/pcb/toolbar.tsx");
  assert.doesNotMatch(toolbar, /function SaveTool|<SaveTool/);
  assert.match(toolbar, /"save", "tSaveAll", "board", "cube",/);
  // D8: Home's Build manually has no Save stage.
  const home = readSrc("components/dashboard/build-manually-info.tsx");
  assert.doesNotMatch(home, /label: "Save"/);
  assert.match(home, /Everything saves as you\s+go, as a draft only you can see\./);
});

test("Save says it where the maker pressed it: the saved dialog, no ?saved= hop (owner 2026-10-19, D1–D6)", () => {
  // The editors' Finish: save everything now, stamp the project, await the store write, then the dialog.
  const editor = readSrc("components/manual/editor-save.tsx");
  assert.match(editor, /if \(!saveNow\(\)\) \{/);
  assert.match(editor, /updateProject\(project\.id, \{\}\);/);
  assert.match(editor, /<SavedDialog[\s\S]*kind="editor"[\s\S]*stayLabel="Keep editing"/);
  assert.match(editor, /<SaveFailedDialog/);
  assert.match(editor, /requestProductRename\(\)/);
  // The AI flow: the save step turns into the same dialog instead of going to the project page.
  const step = readSrc("components/create/save-step.tsx");
  assert.doesNotMatch(step, /router\.push|\?saved=/);
  assert.match(step, /stayLabel=\{getChat\(job\.chatId\) \? "Back to chat" : "Back to the build"\}/);
  // One dialog: View project (primary, no ?saved=), the way back, Back to Home; never Publish.
  const dialog = readSrc("components/projects/saved-dialog.tsx");
  assert.match(dialog, /router\.push\(`\/projects\/\$\{encodeURIComponent\(project\.id\)\}`\)/);
  assert.match(dialog, /router\.push\("\/"\)/);
  assert.doesNotMatch(dialog, />\s*Publish\s*</);
  // D6: the project page has no arrival banner any more.
  assert.equal(existsSync(new URL("../../src/components/projects/details/saved-banner.tsx", import.meta.url)), false);
  assert.doesNotMatch(readSrc("components/projects/details/project-page.tsx"), /SavedBanner/);
  // D5: the editor logo is the way Home.
  assert.match(readSrc("components/pcb/top-bar.tsx"), /<Link href="\/" aria-label="Home" className="ix-pill"/);
});

test("the video step left the Brief: the review shows the gate and opens the products' videos for a missing one (P1-2, P2-VIDEO-17)", () => {
  for (const gone of ["step-2-video.tsx", "ar-record-panel.tsx", "review-modal.tsx", "regenerate-confirm.tsx", "step-1-idea.tsx", "step-3-mint.tsx", "brief-rail.tsx"]) {
    assert.equal(existsSync(briefPath(gone)), false, `${gone} is deleted`);
  }
  const app = read("brief-app.tsx");
  const review = read("step-review.tsx");
  for (const src of [app, review, read("step-details.tsx")]) {
    assert.doesNotMatch(src, /startProductVideo\(|<VideoForm\b|createJob\(|markMinted\(|generateStoryboard|mediaType|videoPrompt/);
  }
  assert.match(review, /export const MAKE_VIDEOS = "Make videos";/);
  // A missing video opens the products' videos over the review — the maker never leaves the mint (owner, 2026-10-12).
  assert.match(review, /<MakeVideosButton projectId=\{project\.id\} label=\{MAKE_VIDEOS\}/);
  assert.doesNotMatch(review, /\?tab=media/);
  assert.match(review, /<VideoRow key=\{row\.productId\} row=\{row\} \/>/);
  // The gate the review reads is the Brief's own: Sell, Give, or a private mint posted to Innovations.
  assert.match(app, /const purpose = gatePurposeOf\(state\.intent, state\.shareToNewsfeed\);/);
  assert.match(app, /readiness: readinessOf\(factsOf\(state, \{ videos, jobs, now: videoNow \}\), purpose \?\? "sell"\)/);
});

test("one violet control per step: only the frame's primary CTA is filled violet", () => {
  for (const name of ["step-choose.tsx", "step-details.tsx", "step-review.tsx"]) {
    const src = read(name);
    assert.doesNotMatch(src, /bg-bg-brand(?![-\w])/, `${name} draws its own violet fill`);
    assert.equal([...src.matchAll(/primaryCta\(/g)].length, 1, `${name} has one primary CTA`);
  }
});

test("the details: one Minting type field, never for a Save; the listing form for a Sell (P2-MINT-6, P2-LISTING-22)", () => {
  const src = read("step-details.tsx");
  const save = slice(src, '{intent === "save" && (', "Continue to review");
  assert.doesNotMatch(save, /MintTypeField/);
  assert.match(save, /Saved with a free signature|SAVE_SIGNATURE_LINE/);
  const sell = slice(src, '{intent === "sell" && (', '{intent === "give" && (');
  assert.match(sell, /<ListingFields\s+mode="brief"/);
  assert.doesNotMatch(sell, /MintTypeField/, "Minting type is ListingFields' field 4, never rendered twice");
  const give = slice(src, '{intent === "give" && (', '{intent === "save" && (');
  assert.match(give, /<MintTypeField/);
  // The license is a Give's term, and a Sell's: it lists at once, and listing needs one (the ladder's L3).
  assert.match(give, /label="License"/);
  assert.match(sell, /label="License"/);
  assert.doesNotMatch(save, /label="License"/);
  // The review checks a Sell at the list level, with the steps the flow gates itself handled.
  const review0 = read("step-review.tsx");
  assert.match(review0, /const LIST_HANDLED = \["ownership", "videos", "license", "minted", "payout"\] as const;/);
  assert.match(review0, /selling \? "list" : "mint",/);
  assert.match(review0, /\{ handled: selling \? LIST_HANDLED : MINT_HANDLED \}/);
  // The gas checkbox is gone; the CTA is commitCtaLabel's, on the review.
  const review = read("step-review.tsx");
  for (const step of [src, review]) assert.doesNotMatch(step, /I understand a network gas fee is added at mint/);
  assert.match(review, /commitCtaLabel\(intent, type, \{ last: true,/);
  assert.match(read("brief-app.tsx"), /const type: MintType = state\.intent === "save" \? "lazy" : state\.mintType;/);
  assert.equal(commitCtaLabel("save", "lazy", { last: true, fromPreview: true, innovations: false }), "Sign and save");
  assert.equal(commitCtaLabel("sell", "lazy", { last: true, fromPreview: false, innovations: false }), "Sign and list");
  assert.equal(commitCtaLabel("give", "instant", { last: true, fromPreview: false, innovations: false }), "Pay and give");
});

test("a Sell commit writes the MintRecord, then the listing, then the draft's mintedAt; a refused listing un-mints (P2-LISTING-22, §3.9)", () => {
  const app = read("brief-app.tsx");
  const commit = slice(app, "const commit = async () => {", "const goBack = () => {");
  assert.doesNotMatch(commit, /setTimeout/, "the 1.4 s timer is gone: the wallet request is the wait");
  assert.match(commit, /await request\(req,/);
  const writes = slice(commit, "const writeAll = (", "let result: RequestResult | null = null;");
  const order = [
    "createListing(",
    "setMint(cur.id, record)",
    "writeListings(listings)",
    "bumpMinted(network, collection)",
    "writeDraft(scope, { ...s, mintedAt: carryOn ? (s.mintedAt ?? at) : at }",
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
  // A fresh mint stamps the proof's time; a minted project carried on keeps its first one.
  assert.match(writes, /mintedAt: carryOn \? \(s\.mintedAt \?\? at\) : at\b/);
  // Shared at the mint once every video is ready (a private mint never waits for them; owner, 2026-10-12).
  assert.match(writes, /if \(s\.shareToNewsfeed && shareReady && cur\.showcasedAt == null\) \{\s*setShowcase\(cur\.id, true, at, \{ story: s\.story\.trim\(\) \}\);/);
  assert.doesNotMatch(writes, /Date\.now\(\)/, "the writes take the proof's time, never a second clock read");
  assert.match(app, /commit: \(proof\) => writeAll\(proof\.at, proof\)/);
  // The store writes the time it is handed; a press with none is stamped now.
  const store = readFileSync(new URL("../../src/lib/manual/projects.tsx", import.meta.url), "utf8");
  assert.match(store, /\(id: string, on: boolean, at\?: number, post\?: SharePost\) =>\s*updateProject\(id, \{ showcasedAt: on \? \(at \?\? Date\.now\(\)\) : null, \.\.\.\(post \? \{ post \} : null\) \}\)/);
});
