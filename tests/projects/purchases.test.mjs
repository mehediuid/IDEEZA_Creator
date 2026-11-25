// What a buyer holds, project by project (owner, 2026-11-16: "anything bought goes to My projects — how many
// copies, the permission; for a Virtual NFT, how many, everything").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("../../src/", import.meta.url).pathname;
const read = (path) => readFileSync(join(SRC, path), "utf8");
const P = await import("../../.tmp-test/lib/market/purchases.js");
const market = await import("../../.tmp-test/lib/market/sample-market.js");
const sales = await import("../../.tmp-test/lib/market/phone-sample-sales.js");

const T = Date.UTC(2026, 10, 16);
const sale = (id, item, at, price = "0.04", buyerId = "buyer-mira", projectId = "proj_a") => ({
  id, listingId: "l", projectId, at, buyerId, buyerAddress: "0x1", sellerAddress: "0x2", item, via: "buyNow", token: "ETH", price,
  fees: { ideezaBps: 250, ideeza: "0.001", network: { coin: "ETH", amount: "0.001" } }, payout: price, royaltiesPct: 10, mint: "lazy",
  mintedAtSale: true, tokenId: null, network: "baseSepolia", collection: "C", benefits: [], txHash: `0x${id}`, demo: true,
});
const copy = (kind, use, serial, productId = "project", productName = "Lamp", trackId = `t_${kind}_${use}`) => ({ nft: kind, trackId, productId, productName, use, tier: "extended", serial });

test("own purchases fold into one project: kind × use × scope, copies with numbers of how many, paid summed", () => {
  const list = [
    sale("s1", copy("physical", "commercial", 7), T, "0.04"),
    sale("s2", copy("physical", "commercial", 8), T + 1, "0.04"),
    sale("s3", copy("virtual", "private", 1, "prd_x", "PlantPal", "t_prod"), T + 2, "0.005"),
    sale("s4", { nft: "main", sharePct: 100 }, T + 3, "0.2"),
    sale("s5", copy("virtual", "private", 2), T + 4, "0.01", "buyer-leo"),
  ];
  const tracks = [{ id: "t_physical_commercial", supply: { total: 50 } }];
  const [p] = P.ownPurchasesOf(list, "buyer-mira", [{ id: "proj_a", name: "Lamp", cover: null }], tracks, "Maya");
  assert.equal(p.creator, "Maya");
  assert.equal(p.count, 4, "two physical copies, one virtual copy, the Main NFT once");
  assert.deepEqual(
    p.lines.map((l) => P.lineTitleOf(l)),
    ["Whole project · 100%", "Physical NFT · Business use", "Virtual NFT · Personal use · PlantPal"],
  );
  const physical = p.lines[1];
  assert.equal(P.copiesLineOf(physical), "2 copies · #7, #8 of 50");
  assert.deepEqual(physical.paid, [{ amount: "0.08", token: "ETH" }]);
  assert.deepEqual(P.cardChipsOf(p), ["Whole project · 100%", "Physical NFT ×2", "Virtual NFT ×1"]);
  assert.deepEqual(P.usesOf(p), ["Personal use", "Business use"]);
  assert.equal(p.lastAt, T + 3, "Leo's purchase is not Mira's");
});

test("sample purchases read their use from the sale and their supply from the use offered", () => {
  const m = market.SAMPLE_MARKETS.find((x) => x.offers.some((o) => o.kind === "physical"));
  const [personal] = market.copyUsesOf(m, "physical");
  const s = sales.makeSampleSale({ id: "ps1", projectId: m.feedId, offer: personal, buyerId: "buyer-mira", buyerAddress: "0x1", serial: 1, txHash: "0xa", at: T });
  const [p] = P.samplePurchasesOf([s], "buyer-mira");
  assert.equal(p.id, m.feedId);
  assert.equal(p.creator, m.post.creator.name);
  assert.equal(p.lines[0].use, "Personal use");
  assert.match(P.copiesLineOf(p.lines[0]), /^1 copy · #1 of \d+$/);
  assert.deepEqual(P.samplePurchasesOf([s], "buyer-leo"), []);
});

test("every use held says what it allows and what it doesn't; one copy is one licence", () => {
  for (const k of ["physical", "virtual"]) {
    for (const u of ["Personal use", "Business use"]) {
      const l = P.LICENCE[k][u];
      assert.ok(l.can.length > 0 && l.cant.length > 0, `${k} ${u}`);
    }
  }
  assert.match(P.LICENCE.physical["Personal use"].can[0], /units each copy allows, for yourself/);
  assert.match(P.LICENCE.physical["Business use"].can[0], /Make and sell the units each copy allows/);
  for (const k of ["physical", "virtual"]) for (const u of ["Personal use", "Business use"]) assert.ok(P.LICENCE[k][u].can.some((t) => /^Sell the copy/.test(t)), "every copy can be sold on");
  assert.deepEqual(P.mainLicenceOf(100).cant, []);
  assert.match(P.mainLicenceOf(100).can[0], /like your own/);
  assert.match(P.mainLicenceOf(10).can[0], /^Earn 10% of the project's sales/);
});

test("what each kind unlocks: Physical the locked PCB, firmware and wiring and more; Virtual the model; Main all", async () => {
  const { LOCKED } = await import("../../.tmp-test/lib/innovations/locked-pieces.js");
  const ids = (k) => P.FILES_OF[k].map((f) => f.id);
  assert.deepEqual(ids("physical"), ["pcb", "code", "wiring", "enclosure", "assembly"]);
  assert.deepEqual(ids("virtual"), ["model", "renders"]);
  assert.deepEqual(ids("main"), ["project", ...ids("physical"), ...ids("virtual")]);
  // The same words as the Innovations product page's locked pieces.
  for (const id of ["pcb", "code", "wiring"]) assert.deepEqual(P.FILES_OF.physical.find((f) => f.id === id).includes, LOCKED[id].includes);
});

test("a purchase knows its chain, collection and wallet, what is still on sale, and a project sold in full", () => {
  const tracks = [
    { id: "t_physical_commercial", projectId: "proj_a", kind: "physical", supply: { total: 2 }, listing: { regular: "0.04" } },
    { id: "t_virtual_private", projectId: "proj_a", kind: "virtual", supply: { total: 10 }, listing: null },
  ];
  const own = [sale("s1", copy("physical", "commercial", 1), T)];
  const [p] = P.ownPurchasesOf(own, "buyer-mira", [{ id: "proj_a", name: "Lamp", cover: null }], tracks, "Maya");
  assert.deepEqual(p.buyable, ["physical"], "one of two left; the Virtual track isn't listed");
  assert.equal(p.soldInFullTo, null);
  assert.deepEqual([p.lines[0].copies[0].network, p.lines[0].copies[0].collection, p.lines[0].copies[0].buyerAddress], ["baseSepolia", "C", "0x1"]);
  const soldOut = [...own, sale("s2", copy("physical", "commercial", 2), T + 1, "0.04", "buyer-sam")];
  assert.deepEqual(P.ownPurchasesOf(soldOut, "buyer-mira", [{ id: "proj_a", name: "Lamp", cover: null }], tracks, "Maya")[0].buyable, []);
  const inFull = [...own, sale("s3", { nft: "main", sharePct: 100 }, T + 2, "0.2", "buyer-leo")];
  const [q] = P.ownPurchasesOf(inFull, "buyer-mira", [{ id: "proj_a", name: "Lamp", cover: null }], tracks, "Maya");
  assert.equal(q.soldInFullTo, "Leo");
  assert.deepEqual(q.buyable, [], "nothing is on sale once the project is sold in full");
});

test("the files' page for the Innovations locked pieces: only for a Physical NFT or the whole project", () => {
  const m = market.SAMPLE_MARKETS.find((x) => x.feedId === "p7");
  const [personal] = market.copyUsesOf(m, "physical");
  const virt = market.copyUsesOf(m, "virtual")[0];
  const phys = sales.makeSampleSale({ id: "a", projectId: "p7", offer: personal, buyerId: "buyer-mira", buyerAddress: "0x1", serial: 1, txHash: "0xa", at: T });
  const v = sales.makeSampleSale({ id: "b", projectId: "p7", offer: virt, buyerId: "buyer-mira", buyerAddress: "0x1", serial: 1, txHash: "0xb", at: T });
  assert.equal(P.heldFilesHrefOf(P.samplePurchasesOf([phys], "buyer-mira"), "p7"), "/projects/purchased/p7");
  assert.equal(P.heldFilesHrefOf(P.samplePurchasesOf([v], "buyer-mira"), "p7"), null, "a Virtual NFT doesn't unlock the PCB");
});

test("My projects has a Purchased tab beside the outcomes, and the purchased page shows own, rights, files, receipts", () => {
  const list = read("components/projects/my-projects.tsx");
  assert.match(list, /const onPurchased = params\.get\("tab"\) === PURCHASED;/);
  assert.match(list, /\{ id: PURCHASED, label: "Purchased", n: purchased\.count, active: purchased\.active \}/);
  assert.doesNotMatch(read("lib/manual/project-list.ts"), /purchased/i, "the list's own tabs (shared with the phone) are untouched");
  const page = read("components/projects/purchased/purchased-page.tsx");
  for (const h of ["Your NFTs", "Receipts", "You own", "Send to manufacturing", "Open the project"]) assert.match(page, new RegExp(`>\\s*${h}\\s*<`));
  assert.match(page, /\{c\.listing \? "Manage the listing" : "Sell this copy"\}/, "each copy sells on from Earn, or its listing is managed there");
  assert.match(page, /href=\{purchasedEarnHref\(p\.id\)\}/, "Earn beside the header, as a project's own page has it");
  assert.match(page, /<OfferTabs tabs=\{held\} active=\{tab\} onSelect=\{setTab\} label="Your NFTs">/, "a tab per kind held, with everything about that kind in it");
  assert.match(page, /<ProductPiecePanel job=\{build\.job\} product=\{build\.bp\} kind=\{tab\} chatHref=\{null\} \/>/, "each product's pieces in the project's own panels");
  assert.match(page, /<DeliverablesAccess\.Provider value>/, "a holder takes the files the pieces offer, as the maker does");
  // No placeholder downloads: a Main NFT opens the project; a copy's Download files zips the pieces' own files (owner, 2026-11-25).
  assert.doesNotMatch(page, /no files to download/, "no placeholder downloads");
  assert.match(page, /const download = useCopyDownload\(kind, products, zipName\);/, "the one Download is the real files, on each copy");
  assert.match(page, /<PostMediaStage post=\{post\} mine=\{mine\} \/>/, "media first, as the marketplace and Innovations pages");
  assert.match(read("components/innovations/post-product-bits.tsx"), /Open your files/, "the locked pieces lead a holder to them");
  // With the purchase: the foot of every marketplace page's Marketplace block (owner, 2026-11-24: one rail everywhere).
  assert.match(read("components/marketplace/buyer-rail.tsx"), /<SeeWhatYouOwn projectId=\{project\.id\} \/>/);
  assert.match(read("components/projects/editions/edition-block.tsx"), /<SeeWhatYouOwn projectId=\{project\.id\} projectName=\{project\.name\} \/>/);
  assert.doesNotMatch(read("components/marketplace/market-rail.tsx"), /SeeWhatYouOwn/, "never in the Creator block");
  assert.match(read("components/marketplace/sample-offer-box.tsx"), /<SeeWhatYouOwn projectId=\{feedId\} \/>/);

});

test("Download files sits on each bought copy and a Physical download uses 1 unit (owner, 2026-11-25)", () => {
  const dl = read("components/projects/purchased/nft-download.ts");
  assert.match(dl, /physical: \["3d", "pcb", "code", "wiring", "parts"\]/);
  assert.match(dl, /virtual: \["3d", "parts"\]/);
  assert.match(dl, /const render = kind === "virtual" \? p\.image \|\| job\.conceptImageUrl \|\| null : null;/, "a Virtual copy licenses the renders");
  assert.match(dl, /folder: several \? `\$\{slug\(p\.name\)\}\/` : ""/, "a whole-project copy: each product in its own folder");
  assert.match(dl, /saveBlob\([^;]+\);\s*onSaved\?\.\(\);/, "the unit is taken once the zip is saved, never before");
  const web = read("components/projects/purchased/purchased-page.tsx");
  assert.doesNotMatch(web, /DownloadFiles/, "not on the product's Overview");
  assert.match(web, /<PieceDownloads\.Provider value=\{false\}>/, "no piece tab downloads on the Purchased page");
  assert.match(web, /appendUnits\(\{ id: `dl_[^`]+`, copyKey: c\.key, holder: buyerId, units: 1, at: Date\.now\(\) \}\)/);
  assert.match(web, /const blocked = units \? \(c\.listing \? ON_SALE : units\.left === 0 \? NO_UNITS_LEFT : null\) : null;/);
  assert.match(web, /title="Download the files for 1 unit\?"/);
  assert.match(web, /<InfoTip label=\{`What \$\{title\} means`\} text=\{copyNumberHelpOf\(c\.serial, c\.of, kind, helpUse\)\} wrap \/>/);
  assert.doesNotMatch(web, /font-mono text-lg tabular-nums/, "the number is a title, not code");
  const deliverables = read("components/projects/product/product-deliverables.tsx");
  assert.match(deliverables, /export const PieceDownloads = React\.createContext\(true\);/);
  assert.match(deliverables, /if \(!shown \|\| \(allowed && !file && !glb\)\) return null;/);
  const phoneCopy = read("components/mobile/purchased/copy-screen.tsx");
  assert.match(phoneCopy, /title="Download the files for 1 unit\?"/);
  assert.match(phoneCopy, /<InfoButton title=\{number\} label=\{`What \$\{number\} means`\}>/);
  const phoneProduct = read("components/mobile/purchased/product-screen.tsx");
  assert.doesNotMatch(phoneProduct, /PieceFile|useBuildModelDownload|useCopyDownload|<BottomBar/, "no download on the product or piece screens");
});

test("a copy's title and help say what its number is (owner, 2026-11-25)", async () => {
  const P = await import("../../.tmp-test/lib/market/purchases.js");
  assert.equal(P.copyTitleOf(7, 50), "Copy #7 of 50");
  assert.equal(P.copyTitleOf(3, null), "Copy #3");
  assert.equal(P.copyTitleOf(null, null), "Copy");
  assert.equal(
    P.copyNumberHelpOf(7, 50, "physical", "Business use"),
    "Copy 7 of the 50 Business use Physical NFTs the creator listed. Its number stays with it, even when you sell it on.",
  );
  assert.equal(P.copyNumberHelpOf(1, null, "virtual", "Personal use"), "Copy 1 of the Personal use Virtual NFTs, in the order they were bought. Its number stays with it, even when you sell it on.");
});
